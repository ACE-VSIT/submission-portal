import { Link } from "react-router-dom";
import { FileText, ChevronRight, ClipboardCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { InterviewRecord, Submission } from "@/lib/types";
import { useFetch } from "@/hooks/useFetch";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCell } from "@/components/shared/StatCell";
import { StatSkeleton } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

type DifficultyKey = "easy" | "medium" | "hard" | "extreme";

interface TrendDay {
    label: string;
    count: number;
}

interface OverviewData {
    domainCount: number;
    publishedCount: number;
    taskCount: number;
    studentCount: number;
    submissionCount: number;
    activeStudentCount: number;
    submissionCountToday: number;
    submissionCountWeek: number;
    resubmissionRate: number;
    avgPerStudent: number;
    calledForInterview: number;
    interviewsDone: number;
    interviewsRemaining: number;
    selectedForAce: number;
    selectionRate: number;
    topDomains: [string, number][];
    topTasks: [string, number][];
    difficultyCounts: Record<DifficultyKey, number>;
    announcementsCount: number;
    faqsCount: number;
    last7Days: TrendDay[];
}

async function fetchOverview(): Promise<OverviewData> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const [profilesRes, domainsRes, tasksRes, subsRes, recordsRes, annRes, faqRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("domains").select("id, name, is_visible").order("display_order"),
        supabase.from("tasks").select("id, name, difficulty").order("display_order"),
        supabase.from("submissions").select("id, student_id, task_id, domain_id, submitted_at, selected_for_interview"),
        supabase.from("interview_records").select("student_id, domain_id, interview_done, selected_for_ace"),
        supabase.from("announcements").select("id", { count: "exact", head: true }),
        supabase.from("faqs").select("id", { count: "exact", head: true }),
    ]);

    for (const r of [profilesRes, domainsRes, tasksRes, subsRes, recordsRes, annRes, faqRes]) {
        if (r.error) throw r.error;
    }

    const domains = (domainsRes.data as { id: string; name: string; is_visible: boolean }[]) ?? [];
    const tasks = (tasksRes.data as { id: string; name: string; difficulty: DifficultyKey }[]) ?? [];
    const subs = (subsRes.data as Submission[]) ?? [];
    const records = (recordsRes.data as InterviewRecord[]) ?? [];

    const domainMap = new Map(domains.map((d) => [d.id, d.name]));
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const domainCount = domains.length;
    const publishedCount = domains.filter((d) => d.is_visible).length;
    const studentCount = profilesRes.count ?? 0;
    const submissionCount = subs.length;
    const activeStudentCount = new Set(subs.map((s) => s.student_id)).size;

    const submissionCountToday = subs.filter((s) => new Date(s.submitted_at) >= startOfToday).length;
    const submissionCountWeek = subs.filter((s) => new Date(s.submitted_at) >= startOfWeek).length;

    const resubmissionCount = Array.from(
        subs
            .reduce((map, s) => {
                const key = `${s.student_id}|${s.task_id}`;
                map.set(key, (map.get(key) ?? 0) + 1);
                return map;
            }, new Map<string, number>())
            .values()
    ).reduce((acc, n) => acc + (n > 1 ? n - 1 : 0), 0);

    const calledForInterview = new Set(
        subs.filter((s) => s.selected_for_interview).map((s) => `${s.student_id}|${s.domain_id}`)
    ).size;

    const interviewsDone = records.filter((r) => r.interview_done).length;
    const selectedForAce = records.filter((r) => r.selected_for_ace).length;
    const selectionRate = calledForInterview > 0 ? Math.round((selectedForAce / calledForInterview) * 100) : 0;

    const domainCounts = new Map<string, number>();
    const taskCounts = new Map<string, number>();
    const difficultyCounts: Record<DifficultyKey, number> = { easy: 0, medium: 0, hard: 0, extreme: 0 };
    for (const s of subs) {
        const dName = domainMap.get(s.domain_id) ?? "Deleted domain";
        const tName = taskMap.get(s.task_id)?.name ?? "Deleted task";
        const difficulty = taskMap.get(s.task_id)?.difficulty ?? "medium";
        domainCounts.set(dName, (domainCounts.get(dName) ?? 0) + 1);
        taskCounts.set(tName, (taskCounts.get(tName) ?? 0) + 1);
        difficultyCounts[difficulty] = (difficultyCounts[difficulty] ?? 0) + 1;
    }

    const countByDay = new Map<string, number>();
    for (const s of subs) {
        const key = new Date(s.submitted_at).toDateString();
        countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    }
    const last7Days: TrendDay[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return {
            label: d.toLocaleDateString(undefined, { weekday: "short" }),
            count: countByDay.get(d.toDateString()) ?? 0,
        };
    });

    return {
        domainCount,
        publishedCount,
        taskCount: tasks.length,
        studentCount,
        submissionCount,
        activeStudentCount,
        submissionCountToday,
        submissionCountWeek,
        resubmissionRate: submissionCount > 0 ? Math.round((resubmissionCount / submissionCount) * 100) : 0,
        avgPerStudent: activeStudentCount > 0 ? Math.round((submissionCount / activeStudentCount) * 10) / 10 : 0,
        calledForInterview,
        interviewsDone,
        interviewsRemaining: Math.max(0, calledForInterview - interviewsDone),
        selectedForAce,
        selectionRate,
        topDomains: [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
        topTasks: [...taskCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
        difficultyCounts,
        announcementsCount: annRes.count ?? 0,
        faqsCount: faqRes.count ?? 0,
        last7Days,
    };
}

function TopCountsList({ title, items }: { title: string; items: [string, number][] }) {
    return (
        <section className="panel p-5 sm:p-6">
            <p className="eyebrow mb-4">{title}</p>
            {items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No submissions found.</p>
            ) : (
                <ul className="space-y-2">
                    {items.map(([name, count]) => (
                        <li key={name} className="flex items-center justify-between gap-3">
                            <span className="text-foreground truncate text-sm uppercase">{name}</span>
                            <span className="text-electric shrink-0 font-mono text-xs">{count}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

const DIFFICULTY_ORDER: { key: DifficultyKey; label: string }[] = [
    { key: "easy", label: "Easy" },
    { key: "medium", label: "Medium" },
    { key: "hard", label: "Hard" },
    { key: "extreme", label: "Extreme" },
];

function DifficultyPanel({ counts }: { counts: Record<DifficultyKey, number> }) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return (
        <section className="panel p-5 sm:p-6">
            <p className="eyebrow mb-4">Submissions by difficulty</p>
            <ul className="space-y-3">
                {DIFFICULTY_ORDER.map(({ key, label }) => {
                    const count = counts[key] ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                        <li key={key}>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-foreground text-sm uppercase">{label}</span>
                                <span className="text-muted-foreground font-mono text-xs">
                                    {count} · {pct}%
                                </span>
                            </div>
                            <div className="bg-secondary mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
                                <div className="bg-electric h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function TrendChart({ days }: { days: TrendDay[] }) {
    const max = Math.max(1, ...days.map((d) => d.count));
    return (
        <div className="flex h-44 items-end gap-3">
            {days.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-muted-foreground font-mono text-[0.6875rem]">{d.count}</span>
                    <div
                        className="bg-electric/60 hover:bg-electric/80 w-full rounded-t-sm transition-colors"
                        style={{ height: `${Math.max(3, Math.round((d.count / max) * 96))}px` }}
                        aria-hidden="true"
                    />
                    <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.05em] uppercase">
                        {d.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function AdminOverview() {
    const { data, loading, error, refetch } = useFetch(fetchOverview, []);

    return (
        <div className="page py-8">
            <PageHeader
                title="Overview"
                description="Manage domains and tasks, review student submissions, and run the interview pipeline."
            />

            {error && !loading && <ErrorState message={error} onRetry={refetch} />}

            {loading && !error && <StatSkeleton />}

            {!loading && !error && data && (
                <>
                    <div className="panel">
                        <div className="divide-border grid grid-cols-1 divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
                            <StatCell
                                label="Domains"
                                value={data.domainCount}
                                hint={`${data.publishedCount} published · ${data.domainCount - data.publishedCount} hidden`}
                            />
                            <StatCell label="Tasks" value={data.taskCount} hint="Across all domains" />
                            <StatCell
                                label="Students"
                                value={data.studentCount}
                                hint={`${data.activeStudentCount} submitted · ${Math.max(
                                    0,
                                    data.studentCount - data.activeStudentCount
                                )} not yet`}
                            />
                            <StatCell label="Submissions" value={data.submissionCount} hint="Total received" />
                        </div>
                        <div className="divide-border border-border grid grid-cols-1 divide-y border-t md:grid-cols-4 md:divide-x md:divide-y-0">
                            <StatCell
                                label="Called for interview"
                                value={data.calledForInterview}
                                hint="Student × domain shortlists"
                            />
                            <StatCell label="Interviews done" value={data.interviewsDone} hint="Marked complete" />
                            <StatCell
                                label="Interviews remaining"
                                value={data.interviewsRemaining}
                                hint="Pending interview"
                            />
                            <StatCell
                                label="Selected for ACE"
                                value={data.selectedForAce}
                                hint={`${data.selectionRate}% of called`}
                            />
                        </div>
                        <div className="divide-border border-border grid grid-cols-1 divide-y border-t md:grid-cols-4 md:divide-x md:divide-y-0">
                            <StatCell
                                label="Submissions today"
                                value={data.submissionCountToday}
                                hint="Since midnight"
                            />
                            <StatCell
                                label="Submissions this week"
                                value={data.submissionCountWeek}
                                hint="Last 7 days"
                            />
                            <StatCell
                                label="Avg per student"
                                value={data.avgPerStudent}
                                hint="Submissions ÷ students"
                            />
                            <StatCell
                                label="Resubmission rate"
                                value={`${data.resubmissionRate}%`}
                                hint="Second+ attempt on a task"
                            />
                        </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <section className="panel p-5 sm:p-6">
                            <p className="eyebrow mb-4">Submissions last 7 days</p>
                            <TrendChart days={data.last7Days} />
                        </section>
                        <DifficultyPanel counts={data.difficultyCounts} />
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <TopCountsList title="Top domains" items={data.topDomains} />
                        <TopCountsList title="Top tasks" items={data.topTasks} />
                        <section className="panel p-5 sm:p-6">
                            <p className="eyebrow mb-4">Content</p>
                            <ul className="space-y-2">
                                <li className="flex items-center justify-between gap-3">
                                    <span className="text-foreground text-sm uppercase">Announcements</span>
                                    <span className="text-electric shrink-0 font-mono text-xs">
                                        {data.announcementsCount}
                                    </span>
                                </li>
                                <li className="flex items-center justify-between gap-3">
                                    <span className="text-foreground text-sm uppercase">FAQs</span>
                                    <span className="text-electric shrink-0 font-mono text-xs">{data.faqsCount}</span>
                                </li>
                                <li className="flex items-center justify-between gap-3">
                                    <span className="text-foreground text-sm uppercase">Hidden domains</span>
                                    <span className="text-electric shrink-0 font-mono text-xs">
                                        {data.domainCount - data.publishedCount}
                                    </span>
                                </li>
                            </ul>
                        </section>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                            to="/admin/submissions"
                            className="panel group hover:border-muted-foreground/40 flex items-center gap-4 p-5 transition-all duration-150"
                        >
                            <ClipboardCheck
                                className="text-muted-foreground size-5 shrink-0"
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <div className="flex-1">
                                <p className="text-foreground group-hover:text-electric text-sm font-medium">
                                    Submissions &amp; interviews
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
