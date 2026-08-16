import * as React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FolderKanban, GripVertical, ArrowUp, ArrowDown, Pencil, Trash2, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Domain } from "@/lib/types";
import { useFetch } from "@/hooks/useFetch";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { TableSkeleton } from "@/components/states/LoadingState";
import { DomainFormDialog } from "@/components/admin/DomainFormDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatRelativeTime } from "@/lib/utils";

async function fetchDomains(): Promise<{ domains: Domain[]; taskCounts: Record<string, number> }> {
  const [domainsRes, tasksRes] = await Promise.all([
    supabase.from("domains").select("*").order("display_order"),
    supabase.from("tasks").select("id, domain_id"),
  ]);
  if (domainsRes.error) throw domainsRes.error;
  if (tasksRes.error) throw tasksRes.error;
  const taskCounts: Record<string, number> = {};
  for (const t of tasksRes.data ?? []) taskCounts[t.domain_id] = (taskCounts[t.domain_id] ?? 0) + 1;
  return { domains: (domainsRes.data as Domain[]) ?? [], taskCounts };
}

export function AdminDomains() {
  const { data, loading, error, refetch } = useFetch(fetchDomains, []);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Domain | null>(null);
  const [deleting, setDeleting] = React.useState<Domain | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [reorderBusy, setReorderBusy] = React.useState(false);

  const domains = data?.domains ?? [];
  const taskCounts = data?.taskCounts ?? {};

  const toggleVisibility = async (domain: Domain) => {
    const { error } = await supabase
      .from("domains")
      .update({ is_visible: !domain.is_visible })
      .eq("id", domain.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(domain.is_visible ? "Domain hidden" : "Domain is now visible");
    refetch();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= domains.length || reorderBusy) return;
    setReorderBusy(true);
    const a = domains[index];
    const b = domains[target];
    try {
      await Promise.all([
        supabase.from("domains").update({ display_order: b.display_order }).eq("id", a.id),
        supabase.from("domains").update({ display_order: a.display_order }).eq("id", b.id),
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
      const { error } = await supabase.from("domains").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Domain deleted");
      setDeleting(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the domain.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page py-8">
      <PageHeader
        crumbs={[{ label: "Admin", to: "/admin" }, { label: "Domains" }]}
        title="Domains"
        description="Create, edit, reorder and show/hide the domains students choose from."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            New domain
          </Button>
        }
      />

      {loading && <TableSkeleton rows={4} />}
      {error && !loading && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && domains.length === 0 && (
        <div className="panel">
          <EmptyState
            icon={FolderKanban}
            eyebrow="No domains"
            title="Create your first domain"
            description="Domains group the tasks students will work through, e.g. Web Development or AI / ML."
            action={
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Create domain
              </Button>
            }
          />
        </div>
      )}

      {!loading && !error && domains.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="hidden grid-cols-[1fr_110px_110px_140px_120px] gap-4 border-b border-border bg-secondary px-5 py-3 md:grid">
            <span className="eyebrow">Domain</span>
            <span className="eyebrow">Tasks</span>
            <span className="eyebrow">Visibility</span>
            <span className="eyebrow">Updated</span>
            <span className="eyebrow text-right">Actions</span>
          </div>
          <ul className="divide-y divide-border">
            {domains.map((domain, i) => (
              <li key={domain.id} className="group flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-secondary/60 md:flex-row md:items-center md:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <GripVertical className="hidden size-4 shrink-0 text-muted-foreground/50 md:block" aria-hidden="true" />
                  <Link to={`/admin/domains/${domain.id}`} className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground hover:text-electric">
                      {domain.name}
                    </p>
                    {domain.description && (
                      <p className="truncate text-xs text-muted-foreground">{domain.description}</p>
                    )}
                  </Link>
                </div>

                <div className="flex items-center gap-4 md:w-[110px]">
                  <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.05em] text-muted-foreground md:hidden">Tasks</span>
                  <span className="font-mono text-sm text-foreground">{taskCounts[domain.id] ?? 0}</span>
                  <Link to={`/admin/domains/${domain.id}`} className="inline-flex items-center gap-1 font-mono text-[0.625rem] font-medium uppercase tracking-[0.05em] text-electric hover:underline md:hidden">
                    Manage <ChevronRight className="size-3" aria-hidden="true" />
                  </Link>
                </div>

                <div className="flex items-center gap-3 md:w-[110px]">
                  <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.05em] text-muted-foreground md:hidden">Visible</span>
                  <Switch checked={domain.is_visible} onCheckedChange={() => toggleVisibility(domain)} aria-label={`Toggle visibility for ${domain.name}`} />
                  <Badge variant={domain.is_visible ? "success" : "neutral"} className="hidden sm:inline-flex">
                    {domain.is_visible ? "Visible" : "Hidden"}
                  </Badge>
                </div>

                <div className="hidden md:block md:w-[140px]">
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">
                    {formatRelativeTime(domain.updated_at)}
                  </span>
                </div>

                <div className="flex items-center gap-1 md:w-[120px] md:justify-end">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || reorderBusy}
                    className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`Move ${domain.name} up`}
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === domains.length - 1 || reorderBusy}
                    className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric disabled:pointer-events-none disabled:opacity-40"
                    aria-label={`Move ${domain.name} down`}
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </button>
                  <Link
                    to={`/admin/domains/${domain.id}`}
                    className="hidden rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric md:block"
                    aria-label={`Manage tasks in ${domain.name}`}
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                  <button
                    onClick={() => {
                      setEditing(domain);
                      setFormOpen(true);
                    }}
                    className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
                    aria-label={`Edit ${domain.name}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setDeleting(domain)}
                    className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                    aria-label={`Delete ${domain.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DomainFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        domain={editing}
        defaultOrder={domains.length > 0 ? domains[domains.length - 1].display_order + 1 : 1}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete domain?"
        description={`“${deleting?.name}” and all of its tasks will be permanently removed. Students will no longer see it.`}
        confirmLabel="Delete domain"
        onConfirm={handleDelete}
        loading={deleteBusy}
      />
    </div>
  );
}
