import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
            "peer border-muted-foreground/50 bg-card size-4 shrink-0 rounded-xs border-[1.5px] transition-colors duration-150",
            "focus-visible:ring-electric focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[state=checked]:border-electric data-[state=checked]:bg-electric data-[state=indeterminate]:border-electric data-[state=indeterminate]:bg-electric",
            className
        )}
        {...props}
    >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
            {props.checked === "indeterminate" ? (
                <Minus className="size-3" aria-hidden="true" />
            ) : (
                <Check className="size-3" aria-hidden="true" />
            )}
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
