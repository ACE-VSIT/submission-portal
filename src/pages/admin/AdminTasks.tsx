import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowDown, ArrowUp, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Domain, Task } from "@/lib/types";
import { useFetch } from "@/hooks/useFetch";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { TableSkeleton } from "@/components/states/LoadingState";
import { TaskFormDialog } from "@/components/admin/TaskFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DifficultyBadge } from "@/components/shared/DifficultyBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SUBMISSION_TYPE_META } from "@/lib/difficulty";
import { formatRelativeTime } from "@/lib/utils";

interface AdminTasksData {
    domain: Domain;
    tasks: Task[];
}

async function fetchAdminTasks(domainId: string): Promise<AdminTasksData> {
    const [domainRes, tasksRes] = await Promise.all([
        supabase.from("domains").select("*").eq("id", domainId).maybeSingle(),
        supabase.from("tasks").select("*").eq("domain_id", domainId).order("display_order"),
    ]);
    if (domainRes.error) throw domainRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (!domainRes.data) throw new Error("This domain was deleted.");
    return { domain: domainRes.data as Domain, tasks: (tasksRes.data as Task[]) ?? [] };
}

export function AdminTasks() {
    const { domainId = "" } = useParams();
    const navigate = useNavigate();
    const { data, loading, error, refetch } = useFetch(() => fetchAdminTasks(domainId), [domainId]);
    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<Task | null>(null);
    const [deleting, setDeleting] = React.useState<Task | null>(null);
    const [deleteBusy, setDeleteBusy] = React.useState(false);
    const [reorderBusy, setReorderBusy] = React.useState(false);

    const tasks = data?.tasks ?? [];

    const toggleVisibility = async (task: Task) => {
        const { error } = await supabase.from("tasks").update({ is_visible: !task.is_visible }).eq("id", task.id);
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success(task.is_visible ? "Task hidden" : "Task is now visible");
        refetch();
    };

    const move = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= tasks.length || reorderBusy) return;
        setReorderBusy(true);
        const a = tasks[index];
        const b = tasks[target];
        try {
            await Promise.all([
                supabase.from("tasks").update({ display_order: b.display_order }).eq("id", a.id),
                supabase.from("tasks").update({ display_order: a.display_order }).eq("id", b.id),
            ]);
            refetch();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Reordering failed.");
        } finally {
            setReorderBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        try {
            const { error } = await supabase.from("tasks").delete().eq("id", deleting.id);
            if (error) throw error;
            toast.success("Task deleted");
            setDeleting(null);
            refetch();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not delete the task.");
        } finally {
            setDeleteBusy(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="page py-8">
                <TableSkeleton rows={5} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="page py-8">
                <ErrorState message={error} onRetry={refetch} />
            </div>
        );
    }

    const domain = data.domain;

    return (
        <div className="page py-8">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/domains")} className="mb-3 -ml-2">
                <ArrowLeft className="size-4" aria-hidden="true" />
                All domains
            </Button>
            <Breadcrumbs
                items={[
                    { label: "Admin", to: "/admin" },
                    { label: "Domains", to: "/admin/domains" },
                    { label: domain.name },
                ]}
            />

            <div className="mt-3 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="font-heading text-foreground text-2xl leading-snug font-medium tracking-tight text-balance sm:text-3xl">
                        {domain.name}
                    </h1>
                    <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm text-pretty">
                        {tasks.length} {tasks.length === 1 ? "task" : "tasks"} — create, edit, reorder and control
                        visibility.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditing(null);
                        setFormOpen(true);
                    }}
                >
                    <Plus className="size-4" aria-hidden="true" />
                    New task
                </Button>
            </div>

            {tasks.length === 0 ? (
                <div className="panel">
                    <EmptyState
                        icon={ClipboardList}
                        eyebrow="No tasks"
                        title="Add the first task"
                        description="A typical domain has 5–8 tasks across Easy to Extreme — but the distribution is entirely up to you."
                        action={
                            <Button
                                onClick={() => {
                                    setEditing(null);
                                    setFormOpen(true);
                                }}
                            >
                                Create task
                            </Button>
                        }
                    />
                </div>
            ) : (
                <div className="panel overflow-hidden">
                    <div className="border-border bg-secondary hidden grid-cols-[1fr_120px_120px_110px_150px_120px] gap-4 border-b px-5 py-3 md:grid">
                        <span className="eyebrow">Task</span>
                        <span className="eyebrow">Difficulty</span>
                        <span className="eyebrow">Submission</span>
                        <span className="eyebrow">Visible</span>
                        <span className="eyebrow">Updated</span>
                        <span className="eyebrow text-right">Actions</span>
                    </div>
                    <ul className="divide-border divide-y">
                        {tasks.map((task, i) => (
                            <li
                                key={task.id}
                                className="hover:bg-secondary/60 flex flex-col gap-3 px-5 py-4 transition-colors duration-150 md:flex-row md:items-center md:gap-4"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-foreground truncate text-sm font-medium">
                                        <span className="text-muted-foreground mr-2 font-mono text-[0.625rem] tracking-[0.05em] uppercase">
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        {task.name}
                                    </p>
                                    {task.description && (
                                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                                            {task.description}
                                        </p>
                                    )}
                                </div>

                                <div className="md:w-[120px]">
                                    <DifficultyBadge difficulty={task.difficulty} />
                                </div>

                                <div className="md:w-[120px]">
                                    <Badge variant="neutral">{SUBMISSION_TYPE_META[task.submission_type].short}</Badge>
                                </div>

                                <div className="flex items-center gap-2 md:w-[110px]">
                                    <Switch
                                        checked={task.is_visible}
                                        onCheckedChange={() => toggleVisibility(task)}
                                        aria-label={`Toggle visibility for ${task.name}`}
                                    />
                                    <Badge
                                        variant={task.is_visible ? "success" : "neutral"}
                                        className="hidden sm:inline-flex"
                                    >
                                        {task.is_visible ? "On" : "Off"}
                                    </Badge>
                                </div>

                                <div className="hidden md:block md:w-[150px]">
                                    <span className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.05em] uppercase">
                                        {formatRelativeTime(task.updated_at)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 md:w-[120px] md:justify-end">
                                    <button
                                        onClick={() => move(i, -1)}
                                        disabled={i === 0 || reorderBusy}
                                        className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-electric rounded-sm p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                                        aria-label={`Move ${task.name} up`}
                                    >
                                        <ArrowUp className="size-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => move(i, 1)}
                                        disabled={i === tasks.length - 1 || reorderBusy}
                                        className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-electric rounded-sm p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                                        aria-label={`Move ${task.name} down`}
                                    >
                                        <ArrowDown className="size-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditing(task);
                                            setFormOpen(true);
                                        }}
                                        className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-electric rounded-sm p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                        aria-label={`Edit ${task.name}`}
                                    >
                                        <Pencil className="size-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => setDeleting(task)}
                                        className="text-muted-foreground hover:bg-error/10 hover:text-error focus-visible:ring-error rounded-sm p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                        aria-label={`Delete ${task.name}`}
                                    >
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <TaskFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                domainId={domainId}
                task={editing}
                defaultOrder={tasks.length > 0 ? tasks[tasks.length - 1].display_order + 1 : 1}
                onSaved={refetch}
            />

            <ConfirmDialog
                open={Boolean(deleting)}
                onOpenChange={(o) => !o && setDeleting(null)}
                title="Delete task?"
                description={`“${deleting?.name}” and its submissions will be permanently removed.`}
                confirmLabel="Delete task"
                onConfirm={handleDelete}
                loading={deleteBusy}
            />
        </div>
    );
}
