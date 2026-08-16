import { Link } from "react-router-dom";
import { ArrowRight, FolderKanban } from "lucide-react";
import type { Domain } from "@/lib/types";

interface DomainCardProps {
  domain: Domain;
  taskCount: number;
}

/** Bordered panel card — the domain explorer's navigation unit (design.md §8). */
export function DomainCard({ domain, taskCount }: DomainCardProps) {
  return (
    <Link
      to={`/app/domains/${domain.id}`}
      className="group panel relative flex flex-col p-5 transition-all duration-150 hover:border-nickel/40 sm:p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-1.5">
          <FolderKanban className="size-3.5" aria-hidden="true" />
          Domain
        </span>
        <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </span>
      </div>
      <h3 className="mt-4 font-heading text-lg font-medium leading-snug text-foreground transition-colors duration-150 group-hover:text-electric">
        {domain.name}
      </h3>
      {domain.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-pretty text-muted-foreground">{domain.description}</p>
      )}
      <div className="mt-5 flex items-center gap-1.5 border-t border-border pt-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-muted-foreground transition-colors duration-150 group-hover:text-electric">
        Open domain
        <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}
