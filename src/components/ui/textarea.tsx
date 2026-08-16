import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[5rem] w-full resize-y rounded-sm border border-input bg-card px-3 py-2 text-sm text-foreground shadow-none transition-colors duration-150",
          "placeholder:text-muted-foreground/70",
          "hover:border-muted-foreground/40",
          "focus-visible:border-electric focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric/70",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
