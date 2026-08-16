import { Link } from "react-router-dom";
import { BarChart3, Layers, FileText, PanelTop, FolderKanban, ChevronRight, ClipboardCheck } from "lucide-react";
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
        supabase
            .from("domains")
            .select("id, name, description, is_visible, display_order, updated_at")
            .order("display_order")
            .limit(5),
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
                description="Manage domains and tasks, review student submissions, and run the interview pipeline."
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
                    <div className="panel divide-border grid grid-cols-1 divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
                        <StatCell label="Domains" value={data.domainCount} hint="Published + hidden" />
                        <StatCell label="Tasks" value={data.taskCount} hint="Across all domains" />
                        <StatCell label="Students" value={data.studentCount} hint="Registered profiles" />
                        <StatCell label="Submissions" value={data.submissionCount} hint="Total received" />
                    </div>

                    <section className="panel panel-ticks relative mt-6">
                        <div className="border-border flex items-center justify-between border-b p-5 sm:p-6">
                            <div className="flex items-center gap-3">
                                <BarChart3
                                    className="text-muted-foreground size-5"
                                    strokeWidth={1.5}
                                    aria-hidden="true"
                                />
                                <h2 className="font-heading text-foreground text-lg leading-snug font-medium">
                                    Recent domains
                                </h2>
                            </div>
                            <Link
                                to="/admin/domains"
                                className="text-electric font-mono text-[0.6875rem] font-medium tracking-[0.05em] uppercase hover:underline"
                            >
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
                            <ul className="divide-border divide-y">
                                {data.domains.map((domain, i) => (
                                    <li key={domain.id}>
                                        <Link
                                            to={`/admin/domains/${domain.id}`}
                                            className="group hover:bg-secondary flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 sm:px-6"
                                        >
                                            <PanelTop
                                                className="text-muted-foreground size-4 shrink-0"
                                                strokeWidth={1.5}
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-foreground truncate text-sm font-medium">
                                                    {i + 1}. {domain.name}
                                                </p>
                                                {domain.description && (
                                                    <p className="text-muted-foreground truncate text-xs">
                                                        {domain.description}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-muted-foreground hidden font-mono text-[0.625rem] tracking-[0.05em] uppercase sm:block">
                                                {formatRelativeTime(domain.updated_at)}
                                            </span>
                                            <Badge variant={domain.is_visible ? "success" : "neutral"}>
                                                {domain.is_visible ? "Visible" : "Hidden"}
                                            </Badge>
                                            <ChevronRight
                                                className="text-muted-foreground size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <Link
                            to="/app/domains"
                            className="panel group hover:border-muted-foreground/40 flex items-center gap-4 p-5 transition-all duration-150"
                        >
                            <FileText
                                className="text-muted-foreground size-5 shrink-0"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <div className="flex-1">
                                <p className="text-foreground group-hover:text-electric text-sm font-medium">
                                    Student portal
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Preview the student experience as an admin.
                                </p>
                            </div>
                            <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
                        </Link>
                        <Link
                            to="/admin/reviews"
                            className="panel group hover:border-muted-foreground/40 flex items-center gap-4 p-5 transition-all duration-150"
                        >
                            <ClipboardCheck
                                className="text-muted-foreground size-5 shrink-0"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <div className="flex-1">
                                <p className="text-foreground group-hover:text-electric text-sm font-medium">
                                    Review &amp; interviews
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    Shortlist submissions, track interviews and selections, export the panel.
                                </p>
                            </div>
                            <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
