import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HF_TOKEN = Deno.env.get("HF_TOKEN");
const HF_REPO_ID = Deno.env.get("HF_REPO_ID");

const HF_BASE = "https://huggingface.co";
const REVISION = "main";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
    }

    if (!HF_TOKEN || !HF_REPO_ID) {
        console.error("upload-pdf: HF configuration missing.");
        return json({ error: "Storage is not configured. Please contact support." }, 500);
    }

    // ── Auth ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    if (!jwt) {
        return json({ error: "Authentication required." }, 401);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);
    }

    // ── Parse form ────────────────────────────────
    let form: FormData;
    try {
        form = await req.formData();
    } catch (error) {
        console.error("upload-pdf: Failed to parse multipart form:", error);
        return json({ error: "Invalid upload request." }, 400);
    }

    const file = form.get("file");
    const taskIdRaw = form.get("task_id");

    if (!(file instanceof File)) {
        return json({ error: "Missing file. Attach a PDF to submit." }, 400);
    }
    if (typeof taskIdRaw !== "string" || !taskIdRaw) {
        return json({ error: "Missing task reference." }, 400);
    }

    // ── Validate file ─────────────────────────────
    if (file.size === 0) {
        return json({ error: "The selected file is empty." }, 400);
    }
    if (file.size > MAX_BYTES) {
        return json({ error: "PDF is larger than 10 MB." }, 413);
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        return json({ error: "Only PDF files are accepted." }, 400);
    }

    const signatureBytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (new TextDecoder().decode(signatureBytes) !== "%PDF-") {
        return json({ error: "The uploaded file is not a valid PDF." }, 400);
    }

    // ── Build repo path ───────────────────────────
    const safeTaskId = taskIdRaw.replace(/[^a-zA-Z0-9_-]/g, "");
    if (!safeTaskId) {
        return json({ error: "Invalid task reference." }, 400);
    }

    const fileStem = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .slice(0, 60);

    const path = [user.id, safeTaskId, `${fileStem}-${crypto.randomUUID()}.pdf`].join("/");

    const bytes = new Uint8Array(await file.arrayBuffer());

    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const oid = bytesToHex(new Uint8Array(digest));

    console.log("upload-pdf: preparing upload", { repo: HF_REPO_ID, path, size: bytes.byteLength, oid });

    // ── 1. Preupload ──────────────────────────────
    // Matches HAR: POST /api/datasets/{repo}/preupload/main
    // Body: { files: [{ path, size, sample }] }
    const preuploadUrl = `${HF_BASE}/api/datasets/${encodeRepoId(HF_REPO_ID)}/preupload/${REVISION}`;
    const sample = bytesToBase64(bytes.slice(0, Math.min(bytes.byteLength, 512)));

    const preuploadResponse = await fetch(preuploadUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            files: [{ path, size: bytes.byteLength, sample }],
        }),
    });

    const preuploadText = await preuploadResponse.text();

    if (!preuploadResponse.ok) {
        console.error("upload-pdf: HF preupload failed", preuploadResponse.status, preuploadText);
        return json({ error: "Hugging Face pre-upload failed." }, 502);
    }

    let preuploadData: any;
    try {
        preuploadData = JSON.parse(preuploadText);
    } catch {
        console.error("upload-pdf: Invalid HF preupload response:", preuploadText);
        return json({ error: "Invalid response from Hugging Face." }, 502);
    }

    const fileInfo = preuploadData?.files?.[0];
    if (!fileInfo) {
        console.error("upload-pdf: Missing file information:", preuploadData);
        return json({ error: "Hugging Face returned an invalid upload response." }, 502);
    }

    // HAR includes shouldIgnore on every preupload file entry.
    // If HF says to ignore this path (e.g. matches a repo .gitignore pattern),
    // the real client skips upload for that file rather than committing it.
    if (fileInfo.shouldIgnore) {
        console.error("upload-pdf: HF flagged path as ignored:", path);
        return json({ error: "This file path is not permitted by the repository configuration." }, 502);
    }

    const uploadMode = fileInfo.uploadMode;
    console.log("upload-pdf: HF upload mode:", uploadMode);

    // ── 2a. Regular (non-LFS) commit ──────────────
    if (uploadMode === "regular") {
        const committed = await commitToHf({
            summary: `Upload submission ${path}`,
            fileEntry: {
                key: "file",
                value: { path, encoding: "base64", content: bytesToBase64(bytes) },
            },
        });

        if (!committed.ok) {
            return json({ error: committed.error }, 502);
        }

        console.log("upload-pdf: upload completed (regular)", { path });
        return json({ success: true, path, repo_id: HF_REPO_ID, revision: REVISION, commit: committed.data });
    }

    if (uploadMode !== "lfs") {
        console.error("upload-pdf: Unknown HF upload mode:", uploadMode);
        return json({ error: "Unsupported Hugging Face upload mode." }, 502);
    }

    // ── 2b. LFS batch ──────────────────────────────
    // Matches HAR exactly: transfers only advertises "basic" (we don't
    // implement multipart), and hash_algo is "sha_256" — HF's Git LFS
    // batch endpoint expects that exact token, not "sha256".
    const lfsBatchUrl = `${HF_BASE}/datasets/${HF_REPO_ID}.git/info/lfs/objects/batch`;

    const lfsBatchResponse = await fetch(lfsBatchUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            Accept: "application/vnd.git-lfs+json",
            "Content-Type": "application/vnd.git-lfs+json",
        },
        body: JSON.stringify({
            operation: "upload",
            transfers: ["basic"],
            hash_algo: "sha_256",
            ref: { name: REVISION },
            objects: [{ oid, size: bytes.byteLength }],
        }),
    });

    const lfsBatchText = await lfsBatchResponse.text();

    if (!lfsBatchResponse.ok) {
        console.error("upload-pdf: LFS batch failed:", lfsBatchResponse.status, lfsBatchText);
        return json({ error: "Hugging Face LFS initialization failed." }, 502);
    }

    let lfsBatchData: any;
    try {
        lfsBatchData = JSON.parse(lfsBatchText);
    } catch {
        console.error("upload-pdf: Invalid LFS response:", lfsBatchText);
        return json({ error: "Invalid response from Hugging Face LFS." }, 502);
    }

    const lfsObject = lfsBatchData?.objects?.[0];
    if (!lfsObject) {
        console.error("upload-pdf: Missing LFS object:", lfsBatchData);
        return json({ error: "Hugging Face did not provide an LFS upload instruction." }, 502);
    }

    if (lfsObject.error) {
        console.error("upload-pdf: LFS object error:", lfsObject.error);
        return json({ error: "Hugging Face rejected the LFS object." }, 502);
    }

    // ── 3. Upload to S3 (if not already present upstream) ─────────
    if (lfsObject.actions?.upload) {
        const uploadAction = lfsObject.actions.upload;
        const uploadHeaders: Record<string, string> = uploadAction.header ?? {};

        if (uploadHeaders.chunk_size) {
            // We only implement single-PUT ("basic") transfer. Given the
            // 10MB cap this endpoint enforces, HF should never request
            // multipart here — but bail explicitly rather than silently
            // corrupt the upload if it ever does.
            console.error("upload-pdf: HF requested multipart LFS upload unexpectedly.");
            return json({ error: "Hugging Face requested a multipart upload, which is not supported." }, 502);
        }

        // Match the HAR: plain PUT, only the headers HF gave us, raw bytes,
        // no Authorization header (the presigned URL carries its own auth).
        const uploadResponse = await fetch(uploadAction.href, {
            method: "PUT",
            headers: uploadHeaders,
            body: bytes,
        });

        if (!uploadResponse.ok) {
            const uploadText = await uploadResponse.text();
            console.error("upload-pdf: LFS object upload failed:", uploadResponse.status, uploadText);
            return json({ error: "Hugging Face file upload failed." }, 502);
        }

        console.log("upload-pdf: LFS object uploaded to S3");
    } else {
        console.log("upload-pdf: LFS object already exists upstream, skipping S3 PUT.");
    }

    // ── 4. Verify (optional, present in HAR's LFS batch response) ──
    const verifyAction = lfsObject.actions?.verify;
    if (verifyAction) {
        const verifyResponse = await fetch(verifyAction.href, {
            method: "POST",
            headers: {
                ...(verifyAction.header ?? {}),
                Authorization: `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ oid, size: bytes.byteLength }),
        });

        const verifyText = await verifyResponse.text();

        if (!verifyResponse.ok) {
            console.error("upload-pdf: LFS verification failed:", verifyResponse.status, verifyText);
            return json({ error: "Hugging Face could not verify the uploaded file." }, 502);
        }

        console.log("upload-pdf: LFS object verified");
    }

    // ── 5. Commit referencing the LFS object ────────────────────
    const committed = await commitToHf({
        summary: `Upload submission ${path}`,
        description: `Submission uploaded by ${user.id}`,
        fileEntry: {
            key: "lfsFile",
            value: { path, algo: "sha256", oid, size: bytes.byteLength },
        },
    });

    if (!committed.ok) {
        return json({ error: committed.error }, 502);
    }

    console.log("upload-pdf: upload completed successfully (lfs)", { path, oid });

    return json({
        success: true,
        path,
        repo_id: HF_REPO_ID,
        revision: REVISION,
        oid,
        commit: committed.data,
    });
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function commitToHf(opts: {
    summary: string;
    description?: string;
    fileEntry: { key: "file" | "lfsFile"; value: Record<string, unknown> };
}): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
    const commitUrl = `${HF_BASE}/api/datasets/${encodeRepoId(HF_REPO_ID!)}/commit/${REVISION}`;

    const commitBody =
        JSON.stringify({
            key: "header",
            value: { summary: opts.summary, description: opts.description ?? "" },
        }) +
        "\n" +
        JSON.stringify({ key: opts.fileEntry.key, value: opts.fileEntry.value }) +
        "\n";

    const commitResponse = await fetch(commitUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/x-ndjson",
            Accept: "application/json",
        },
        body: commitBody,
    });

    const commitText = await commitResponse.text();
    console.log("upload-pdf: HF commit status:", commitResponse.status);

    if (!commitResponse.ok) {
        console.error("upload-pdf: HF commit failed:", commitText);
        return { ok: false, error: "Hugging Face commit failed." };
    }

    let commitData: unknown = null;
    try {
        commitData = JSON.parse(commitText);
    } catch {
        // Some successful responses may not be JSON.
    }

    return { ok: true, data: commitData };
}

// Encodes each path segment of an org/repo id separately, preserving the
// literal "/" between them. encodeURIComponent() on the whole string turns
// "/" into "%2F", which HF's API rejects with "url-encoded slash".
function encodeRepoId(repoId: string): string {
    return repoId.split("/").map(encodeURIComponent).join("/");
}

function bytesToHex(bytes: Uint8Array): string {
    let result = "";
    for (const byte of bytes) {
        result += byte.toString(16).padStart(2, "0");
    }
    return result;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const CHUNK_SIZE = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

function json(payload: Record<string, unknown>, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
