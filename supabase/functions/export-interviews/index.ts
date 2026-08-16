// ────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: export the interview panel to CSV (server-side).
//
// Mirrors the old "Export to Excel" action of admintable-old, but runs on the
// server: the caller's Supabase JWT is verified, the role is checked against
// profiles, and the CSV is generated from the database (never from whatever an
// unauthenticated client could fake).
//
// Columns: Sr No., Full Name, Email, Phone No., Selected Domain,
//          Interview Done, Selected for ACE, Interview Notes
//
// Deploy:  supabase functions deploy export-interviews
// ────────────────────────────────────────────────────────────────────────────

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1. Verify the caller (same pattern as upload-pdf) and require an admin role.
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

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return json({ error: "Admin access required." }, 403);

  // 2. Students + domains (no FK path from submissions → profiles, so fetch both).
  const [profilesRes, domainsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone"),
    supabase.from("domains").select("id, name"),
  ]);
  if (profilesRes.error) return json({ error: profilesRes.error.message }, 500);
  if (domainsRes.error) return json({ error: domainsRes.error.message }, 500);

  const profiles = new Map((profilesRes.data ?? []).map((p: { id: string; full_name: string; email: string; phone: string }) => [p.id, p]));
  const domains = new Map((domainsRes.data ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));

  // 3. Selected-for-interview submissions, grouped per student × domain.
  const { data: submissions, error: subsError } = await supabase
    .from("submissions")
    .select("student_id, domain_id")
    .eq("selected_for_interview", true);
  if (subsError) return json({ error: subsError.message }, 500);

  type Row = {
    key: string;
    studentId: string;
    domainId: string;
    fullName: string;
    email: string;
    phone: string;
    domain: string;
    interviewDone: boolean;
    selectedForAce: boolean;
    notes: string;
  };
  const rows = new Map<string, Row>();

  for (const s of submissions ?? []) {
    const key = `${s.student_id}|${s.domain_id}`;
    if (rows.has(key)) continue;
    const p = profiles.get(s.student_id) ?? { full_name: "", email: "", phone: "" };
    rows.set(key, {
      key,
      studentId: s.student_id,
      domainId: s.domain_id,
      fullName: p.full_name ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      domain: domains.get(s.domain_id) ?? "",
      interviewDone: false,
      selectedForAce: false,
      notes: "",
    });
  }

  // 4. Merge in interview record state.
  const { data: records, error: recError } = await supabase.from("interview_records").select("*");
  if (recError) return json({ error: recError.message }, 500);
  for (const rec of records ?? []) {
    const row = rows.get(`${rec.student_id}|${rec.domain_id}`);
    if (!row) continue;
    row.interviewDone = Boolean(rec.interview_done);
    row.selectedForAce = Boolean(rec.selected_for_ace);
    row.notes = rec.notes ?? "";
  }

  const sorted = [...rows.values()]
    .sort((a, b) => a.domain.localeCompare(b.domain) || a.fullName.localeCompare(b.fullName));

  // 5. CSV (UTF-8 BOM so Excel renders names/phone numbers correctly).
  const header = ["Sr No.", "Full Name", "Email", "Phone No.", "Selected Domain", "Interview Done", "Selected for ACE", "Interview Notes"];
  const lines = sorted.map((r, i) => [
    String(i + 1),
    r.fullName,
    r.email,
    r.phone,
    r.domain,
    r.interviewDone ? "Yes" : "No",
    r.selectedForAce ? "Yes" : "No",
    r.notes,
  ]);
  const csv = [header, ...lines]
    .map((line) => line.map(escapeCsv).join(","))
    .join("\r\n");

  return new Response("\uFEFF" + csv, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="interview-panel.csv"',
    },
  });
});

function escapeCsv(value: string): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function json(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
