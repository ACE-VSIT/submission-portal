import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design.md §8 Forms: bordered input, radius-sm, explicit labels handled by
 * the consuming form - placeholder is never a substitute for a label.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "border-input bg-card text-foreground flex h-9 w-full rounded-sm border px-3 py-2 text-sm shadow-none transition-colors duration-150",
                    "placeholder:text-muted-foreground/70",
                    "hover:border-muted-foreground/40",
                    "focus-visible:border-electric focus-visible:ring-electric/70 focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none",
                    "disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
                    "aria-[invalid=true]:border-error focus-visible:aria-[invalid=true]:ring-error/50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
