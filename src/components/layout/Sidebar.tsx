import { Link, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, X } from "lucide-react";
import { iconMap, studentNav, adminNav } from "./navigation";
import type { NavSection } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavSectionBlock({
  section,
  collapsed,
  onNavigate,
}: {
  section: NavSection;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  return (
    <div>
      {!collapsed && <p className="eyebrow px-3 pb-1.5">{section.label}</p>}
      <nav aria-label={section.label} className="flex flex-col gap-0.5">
        {section.items.map((item) => {
          const Icon = iconMap[item.icon] ?? GraduationCap;
          const active = item.end !== false ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex h-9 items-center gap-2 rounded-sm px-3 text-sm transition-colors duration-150",
                active
                  ? "bg-vite/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-beige hover:text-primary",
              )}
            >
              {active && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-electric" aria-hidden="true" />}
              <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const nav = role === "admin" ? adminNav : studentNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-electric">
          <GraduationCap className="size-4 text-white" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-medium leading-tight text-foreground">ACE VSIT</p>
            <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.08em] text-muted-foreground">
              Submission portal
            </p>
          </div>
        )}
        <button
          className="ml-auto rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-beige hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric md:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {nav.map((section, i) => (
          <NavSectionBlock key={i} section={section} collapsed={collapsed} onNavigate={onMobileClose} />
        ))}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        {role === "admin" && (
          <Link
            to="/app/domains"
            onClick={onMobileClose}
            className="mb-1 flex h-8 items-center gap-2 rounded-sm px-3 text-sm text-muted-foreground transition-colors hover:bg-beige hover:text-primary"
          >
            {!collapsed ? (
              <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em]">
                Student portal →
              </span>
            ) : (
              <GraduationCap className="size-4" aria-hidden="true" />
            )}
          </Link>
        )}
        <div className="flex items-center gap-2 rounded-sm px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-beige text-[0.625rem] font-medium text-nickel dark:bg-slate">
            {profile?.full_name?.slice(0, 2).toUpperCase() ?? "AC"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{profile?.full_name ?? "Account"}</p>
              <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.06em] text-muted-foreground">
                {role ?? "student"}
              </p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-midnight/60" onClick={onMobileClose} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card shadow-modal">
            {body}
          </aside>
        </div>
      )}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-beige dark:bg-slate md:block",
          collapsed ? "w-16" : "w-60",
        )}
        aria-label="Primary navigation"
      >
        <div className="sticky top-0 h-screen">{body}</div>
      </aside>
    </>
  );
}
