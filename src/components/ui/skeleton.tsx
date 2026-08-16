import * as React from "react";
import { cn } from "@/lib/utils";

/** Structural placeholder matching real content geometry (design.md §8 Loading states). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-sm", className)}
      aria-hidden="true"
      role="presentation"
      {...props}
    />
  );
}

export { Skeleton };
