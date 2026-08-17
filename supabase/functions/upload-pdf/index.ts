// ────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: secure Hugging Face PDF upload proxy
//
// Student UI → Submission API → Storage Service → Hugging Face (design.md §24)
//
// HF_TOKEN + HF_REPO_ID live ONLY in server secrets (never VITE_-prefixed,
// never in the browser). The caller is authenticated by verifying the Supabase
// JWT server-side; the owning user id is namespaced into the stored path.
//
// Deploy with the Supabase CLI:
//   supabase functions deploy upload-pdf
//   supabase secrets set HF_TOKEN=... HF_REPO_ID=ace/private-submissions
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HF_TOKEN = Deno.env.get("HF_TOKEN");
const HF_REPO_ID = Deno.env.get("HF_REPO_ID");
const HF_BASE = `https://huggingface.co/api/datasets/${HF_REPO_ID}`;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
    }

    if (!HF_TOKEN) {
        console.error("upload-pdf: HF_TOKEN is not configured on the server.");
        return json({ error: "Storage is not configured. Please contact support." }, 500);
    }

    // 1. Verify the caller - the JWT is attached to supabase.functions.invoke()
    //    automatically by supabase-js; verify it server-side, never trust the client.
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

    // 2. Parse the multipart body (browser FormData).
    const form = await req.formData();
    const file = form.get("file");
    const taskIdRaw = form.get("task_id");

    if (!(file instanceof File)) {
        return json({ error: "Missing file. Attach a PDF to submit." }, 400);
    }
    if (!taskIdRaw || typeof taskIdRaw !== "string") {
        return json({ error: "Missing task reference." }, 400);
    }
    if (file.size === 0) return json({ error: "The selected file is empty." }, 400);
    if (file.size > MAX_BYTES) return json({ error: "PDF is larger than 10 MB." }, 413);

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf")) {
        return json({ error: "Only PDF files are accepted." }, 400);
    }

    // 3. Sanitized, namespaced path inside the private dataset repo.
    const safeTaskId = taskIdRaw.replace(/[^a-zA-Z0-9_-]/g, "");
    const fileStem = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .slice(0, 60);
    const path = `${user.id}/${safeTaskId}/${fileStem}-${crypto.randomUUID()}.pdf`;

    const bytes = await file.arrayBuffer();

    // 4. Stream to private Hugging Face dataset storage.
    const uploadUrl = `${HF_BASE}/upload?path=${encodeURIComponent(path)}`;
    const text = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "X-Repo-Type": "dataset",
            "Content-Type": "application/octet-stream",
        },
        body: bytes,
    }).then((r) => r.text());

    let ok = true;
    let hfMessage: string | null = null;
    try {
        const parsed = JSON.parse(text);
        if (parsed.error) {
            ok = false;
            hfMessage = parsed.error;
        }
    } catch {
        /* plain-text success response */
    }
    if (!ok) {
        console.error("upload-pdf: HF upload failed:", hfMessage ?? text);
        return json({ error: "Upload failed on the storage service. Please try again." }, 502);
    }

    // 5. Return only the safe reference - credentials never leave the server,
    //    and only the path is persisted in Supabase.
    return json({
        path,
        url: `hf://datasets/${HF_REPO_ID}/${path}`,
    });
});

function json(payload: Record<string, unknown>, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
