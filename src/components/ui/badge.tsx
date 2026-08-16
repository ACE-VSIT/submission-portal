import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status badge — mono uppercase label, optionally with a 6px status dot,
 * mapping to the semantic state colors (design.md §3/§8). Color is never the
 * sole carrier of meaning; every badge pairs the dot with a text label.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em]",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-muted-foreground",
        neutral: "border-border bg-card text-muted-foreground",
        primary: "border-electric/30 bg-electric/10 text-electric",
        success: "border-success/30 bg-success/10 text-success",
        warning: "border-warning/30 bg-warning/10 text-warning",
        error: "border-error/30 bg-error/10 text-error",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning",
            variant === "error" && "bg-error",
            variant === "primary" && "bg-electric",
            (variant === "default" || variant === "neutral" || variant === "outline") && "bg-muted-foreground",
          )}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
