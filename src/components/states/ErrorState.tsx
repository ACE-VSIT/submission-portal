import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    compact?: boolean;
}

/** Design.md §8: in-flow error - inline banner style, keeps chrome visible. */
export function ErrorState({ title = "Something went wrong", message, onRetry, compact }: ErrorStateProps) {
    return (
        <div
            className={cn(
                compact
                    ? "border-error/30 bg-error/5 flex items-center gap-3 rounded-sm border px-4 py-3"
                    : "flex flex-col items-center justify-center px-6 py-16 text-center",
                // Dark mode: stronger error background for visibility
                compact ? "dark:border-error/50 dark:bg-error/15" : "dark:bg-error/10"
            )}
            role="alert"
        >
            <AlertTriangle
                className={compact ? "text-error size-4 shrink-0" : "text-error mb-4 size-8"}
                strokeWidth={1.5}
                aria-hidden="true"
            />
            {!compact && <h3 className="font-heading text-foreground text-lg font-medium">{title}</h3>}
            <p className={compact ? "text-error text-sm" : "text-muted-foreground mt-1.5 max-w-md text-sm"}>
                {message ?? "An unexpected error occurred. Please try again."}
            </p>
            {onRetry && (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={onRetry}
                    className={compact ? "ml-auto shrink-0" : "mt-6"}
                >
                    <RefreshCw aria-hidden="true" />
                    Retry
                </Button>
            )}
        </div>
    );
}
