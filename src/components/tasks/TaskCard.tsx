import { Link } from "react-router-dom";
import { ArrowRight, FileText, Link2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { DifficultyBadge } from "@/components/shared/DifficultyBadge";
import { SubmissionStatusBadge, type SubmissionStatus } from "@/components/shared/SubmissionStatusBadge";
import { SUBMISSION_TYPE_META } from "@/lib/difficulty";

interface TaskCardProps {
  task: Task;
  status: SubmissionStatus;
  position: number;
  total: number;
}

/**
 * Timeline-style task row (design.md §9) — not a spreadsheet. Difficulty is
 * immediately readable via the badge + bordered panel, submission status is
 * a full chip, never a tiny icon.
 */
export function TaskCard({ task, status, position, total }: TaskCardProps) {
  const meta = SUBMISSION_TYPE_META[task.submission_type];
  return (
    <Link
      to={`/app/domains/${task.domain_id}/tasks/${task.id}`}
      className="group panel flex flex-col gap-3 p-4 transition-all duration-150 hover:border-nickel/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric sm:flex-row sm:items-center sm:gap-5 sm:p-5"
    >
      <div className="flex items-center gap-4 sm:w-16 sm:shrink-0">
        <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          {String(position).padStart(2, "0")}
          <span className="text-muted-foreground/50">/{String(total).padStart(2, "0")}</span>
        </span>
        <div className="h-8 w-px bg-border sm:hidden" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-base font-medium leading-snug text-foreground transition-colors duration-150 group-hover:text-electric">
            {task.name}
          </h3>
          <DifficultyBadge difficulty={task.difficulty} />
        </div>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm text-pretty text-muted-foreground">{task.description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
        <SubmissionStatusBadge status={status} />
        <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          {meta.short === "PDF" ? (
            <FileText className="size-3.5" aria-hidden="true" />
          ) : meta.short === "LINKS" ? (
            <Link2 className="size-3.5" aria-hidden="true" />
          ) : (
            <>
              <FileText className="size-3.5" aria-hidden="true" />
              <span className="text-muted-foreground/40">+</span>
              <Link2 className="size-3.5" aria-hidden="true" />
            </>
          )}
          {meta.short}
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
