// ────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: admin-only proxy to view a submitted PDF.
//
// Submissions are stored privately on Hugging Face (see upload-pdf); there is
// no public URL. This function verifies the caller's Supabase JWT, checks the
// admin role, then streams the PDF bytes back with HF_TOKEN held server-side —
// so admins get a working "View PDF" link without any credential reaching the
// browser or a public storage bucket.
//
// Deploy:  supabase functions deploy view-pdf
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HF_TOKEN = Deno.env.get("HF_TOKEN");
const HF_REPO_ID = Deno.env.get("HF_REPO_ID") ?? "ace-vsit/private-submissions";

// Stored paths look like: <userId>/<taskId>/<fileStem>-<uuid>.pdf
const SAFE_PATH = /^[a-zA-Z0-9._\-\/]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path || !SAFE_PATH.test(path)) {
    return json({ error: "Invalid file path." }, 400);
  }
  if (!HF_TOKEN) {
    console.error("view-pdf: HF_TOKEN is not configured on the server.");
    return json({ error: "Storage is not configured. Please contact support." }, 500);
  }

  // 1. Verify the caller (same pattern as upload-pdf).
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Authentication required." }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);
  }

  // 2. Admin only — the review tools are admin surfaces.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return json({ error: "Admin access required." }, 403);

  // 3. Stream the private PDF from Hugging Face with the server-side token.
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const fileUrl = `https://huggingface.co/datasets/${HF_REPO_ID}/resolve/main/${encodedPath}`;

  const upstream = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
  });
  if (!upstream.ok) {
    console.error("view-pdf: upstream fetch failed:", upstream.status, upstream.statusText);
    return json({ error: "The file could not be retrieved." }, 502);
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
