import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HF_TOKEN = Deno.env.get("HF_TOKEN");
const HF_REPO_ID = Deno.env.get("HF_REPO_ID");
const SAFE_PATH = /^[a-zA-Z0-9._\-\/]+$/;

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
    }

    const url = new URL(req.url);
    const path = url.searchParams.get("path") ?? "";
    // Accept token from query param (direct navigation) OR header (fetch calls).
    const jwt = url.searchParams.get("token") ?? (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");

    if (!path || !SAFE_PATH.test(path)) {
        return json({ error: "Invalid file path." }, 400);
    }
    if (!jwt) {
        return json({ error: "Authentication required." }, 401);
    }
    if (!HF_TOKEN) {
        console.error("view-pdf: HF_TOKEN is not configured on the server.");
        return json({ error: "Storage is not configured. Please contact support." }, 500);
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

    if (!["admin", "mentor", "owner"].includes(profile?.role ?? "")) {
        return json({ error: "Staff access required." }, 403);
    }

    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const fileUrl = `https://huggingface.co/datasets/${HF_REPO_ID}/resolve/main/${encodedPath}`;
    const upstream = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${HF_TOKEN}` },
    });

    if (!upstream.ok) {
        const errorBody = await upstream.text();

        console.error("HF URL:", fileUrl);
        console.error("HF status:", upstream.status);
        console.error("HF statusText:", upstream.statusText);
        console.error("HF response:", errorBody);

        return json(
            {
                error: "The file could not be retrieved.",
                upstream_status: upstream.status,
                upstream_status_text: upstream.statusText,
                upstream_response: errorBody,
            },
            502
        );
    }

    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
        status: 200,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="submission.pdf"',
        },
    });
});

function json(payload: Record<string, unknown>, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
