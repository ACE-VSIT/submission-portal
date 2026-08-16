import { cn } from "@/lib/utils";

interface StatCellProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  trend?: { direction: "up" | "down"; value: string; positive: boolean };
  className?: string;
}

/** Design.md §4/§8 KPI stat cell — mono uppercase caption + heading numeral,
 *  baseline-aligned, divider-separated — never a shadowed floating card. */
export function StatCell({ label, value, hint, trend, className }: StatCellProps) {
  return (
    <div className={cn("p-6", className)}>
      <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-3xl font-medium leading-tight tracking-tight text-foreground">{value}</span>
        {trend && (
          <span
            className={cn(
              "font-mono text-xs",
              trend.positive ? "text-success" : "text-error",
            )}
          >
            {trend.direction === "up" ? "▲" : "▼"} {trend.value}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
