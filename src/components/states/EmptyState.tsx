import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Design.md §8 Empty states: single small line-icon (text-grey, no illustration
 * library), optional mono-uppercase eyebrow, balanced short heading, one line
 * of grey body copy, one primary action.
 */
export function EmptyState({ icon: Icon, eyebrow, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <Icon className="mb-4 size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h3 className="font-heading text-lg font-medium leading-snug text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
