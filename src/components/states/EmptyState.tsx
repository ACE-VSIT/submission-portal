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
            <Icon className="text-muted-foreground mb-4 size-8" strokeWidth={1.5} aria-hidden="true" />
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            <h3 className="font-heading text-foreground text-lg leading-snug font-medium">{title}</h3>
            <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">{description}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
