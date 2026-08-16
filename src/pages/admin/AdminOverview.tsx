import { Link } from "react-router-dom";
import { BarChart3, Layers, FileText, PanelTop, FolderKanban, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Domain } from "@/lib/types";
import { useFetch } from "@/hooks/useFetch";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCell } from "@/components/shared/StatCell";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatSkeleton, PanelSkeleton } from "@/components/states/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

interface OverviewData {
  domainCount: number;
  taskCount: number;
  studentCount: number;
  submissionCount: number;
  domains: Domain[];
}

async function fetchOverview(): Promise<OverviewData> {
  const [{ count: d }, { count: t }, { count: s }, { count: sub }, domainsRes] = await Promise.all([
    supabase.from("domains").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("submissions").select("id", { count: "exact", head: true }),
    supabase.from("domains").select("id, name, description, is_visible, display_order, updated_at").order("display_order").limit(5),
  ]);
  if (domainsRes.error) throw domainsRes.error;
  return {
    domainCount: d ?? 0,
    taskCount: t ?? 0,
    studentCount: s ?? 0,
    submissionCount: sub ?? 0,
    domains: (domainsRes.data as Domain[]) ?? [],
  };
}

export function AdminOverview() {
  const { data, loading, error, refetch } = useFetch(fetchOverview, []);

  return (
    <div className="page py-8">
      <PageHeader
        crumbs={[{ label: "Admin" }, { label: "Overview" }]}
        title="Overview"
        description="Domains and tasks are the only things you manage here — submission review lives in the separate portal."
        actions={
          <Link to="/admin/domains">
            <Button>
              <FolderKanban className="size-4" aria-hidden="true" />
              Manage domains
            </Button>
          </Link>
        }
      />

      {error && !loading && <ErrorState message={error} onRetry={refetch} />}

      {loading && !error && (
        <>
          <StatSkeleton />
          <PanelSkeleton className="mt-6 h-72" />
        </>
      )}

      {!loading && !error && data && (
        <>
          <div className="panel grid grid-cols-1 divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
            <StatCell label="Domains" value={data.domainCount} hint="Published + hidden" />
            <StatCell label="Tasks" value={data.taskCount} hint="Across all domains" />
            <StatCell label="Students" value={data.studentCount} hint="Registered profiles" />
            <StatCell label="Submissions" value={data.submissionCount} hint="Total received" />
          </div>

          <section className="panel mt-6 panel-ticks relative">
            <div className="flex items-center justify-between border-b border-border p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                <h2 className="font-heading text-lg font-medium leading-snug text-foreground">Recent domains</h2>
              </div>
              <Link to="/admin/domains" className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-electric hover:underline">
                View all
              </Link>
            </div>

            {data.domains.length === 0 ? (
              <EmptyState
                icon={Layers}
                eyebrow="Get started"
                title="No domains yet"
                description="Create your first domain, then add tasks inside it."
                action={
                  <Link to="/admin/domains">
                    <Button>Create domain</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.domains.map((domain, i) => (
                  <li key={domain.id}>
                    <Link
                      to={`/admin/domains/${domain.id}`}
                      className="group flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-beige dark:hover:bg-accent sm:px-6"
                    >
                      <PanelTop className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {i + 1}. {domain.name}
                        </p>
                        {domain.description && (
                          <p className="truncate text-xs text-muted-foreground">{domain.description}</p>
                        )}
                      </div>
                      <span className="hidden font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground sm:block">
                        {formatRelativeTime(domain.updated_at)}
                      </span>
                      <Badge variant={domain.is_visible ? "success" : "neutral"}>
                        {domain.is_visible ? "Visible" : "Hidden"}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link to="/app/domains" className="panel group flex items-center gap-4 p-5 transition-all duration-150 hover:border-nickel/40">
              <FileText className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground group-hover:text-electric">Student portal</p>
                <p className="text-xs text-muted-foreground">Preview the student experience as an admin.</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
            <div className="panel flex items-center gap-4 p-5">
              <Layers className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Submission review</p>
                <p className="text-xs text-muted-foreground">Handled by the existing ACE review portal — out of scope here.</p>
              </div>
              <Badge variant="warning">Later</Badge>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
