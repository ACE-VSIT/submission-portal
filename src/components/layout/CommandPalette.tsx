import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Layers, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface PaletteEntry {
  label: string;
  to: string;
  group: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const navigate = useNavigate();
  const { role } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const entries: PaletteEntry[] = React.useMemo(() => {
    const base: PaletteEntry[] = [];
    if (role === "admin") {
      base.push(
        { label: "Admin overview", to: "/admin", group: "Admin", icon: LayoutDashboard },
        { label: "Manage domains", to: "/admin/domains", group: "Admin", icon: Layers },
      );
    }
    base.push(
      { label: "Browse domains", to: "/app/domains", group: "Student", icon: Layers },
      { label: "My profile", to: "/app/profile", group: "Student", icon: User },
    );
    return base;
  }, [role]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.label.toLowerCase().includes(q) || e.group.toLowerCase().includes(q));
  }, [query, entries]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  React.useEffect(() => setActive(0), [query]);

  // Global ⌘K / Ctrl+K trigger — AppShell owns the open/closed state, so we
  // only dispatch a toggle event (avoiding a stale-closure double toggle).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.dispatchEvent(new Event("ace:toggle-palette"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].to);
    }
  };

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center px-4 pt-[18vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="absolute inset-0 bg-midnight/60" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card shadow-modal animate-fade-in">
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page…"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>
        <div
          id="palette-results"
          role="listbox"
          className="max-h-80 overflow-y-auto p-1.5"
          aria-label="Results"
        >
          {results.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No results for “{query}”
            </div>
          )}
          {results.map((entry, i) => {
            const showGroup = entry.group !== lastGroup;
            lastGroup = entry.group;
            const Icon = entry.icon;
            return (
              <React.Fragment key={entry.to}>
                {showGroup && (
                  <p className="eyebrow px-2 pb-1 pt-2.5 first:pt-1">{entry.group}</p>
                )}
                <button
                  role="option"
                  aria-selected={i === active}
                  onClick={() => go(entry.to)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm transition-colors duration-100",
                    i === active ? "bg-beige text-primary dark:bg-accent" : "text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                  <span className="flex-1 truncate">{entry.label}</span>
                  {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
