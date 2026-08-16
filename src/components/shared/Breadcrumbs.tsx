import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Design.md §8 Breadcrumbs — mono uppercase segments separated by a plain "/",
 * current segment non-interactive in full contrast.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-hidden">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/40" aria-hidden="true">/</span>}
            {item.to && !last ? (
              <Link
                to={item.to}
                className="truncate font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "truncate font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em]",
                  last ? "text-foreground" : "text-muted-foreground",
                )}
                aria-current={last ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
