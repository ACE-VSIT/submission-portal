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
                    const active =
                        item.end !== false ? location.pathname === item.to : location.pathname.startsWith(item.to);
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
                                    ? "bg-vite/10 text-foreground font-medium"
                                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                            )}
                        >
                            {active && (
                                <span
                                    className="bg-electric absolute left-0 h-5 w-0.5 rounded-full"
                                    aria-hidden="true"
                                />
                            )}
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
            <div className="border-border flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
                <div className="bg-electric flex size-7 shrink-0 items-center justify-center rounded-sm">
                    <GraduationCap className="size-4 text-white" aria-hidden="true" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="font-heading text-foreground truncate text-sm leading-tight font-medium">
                            ACE VSIT
                        </p>
                        <p className="text-muted-foreground truncate font-mono text-[0.625rem] tracking-[0.08em] uppercase">
                            Submission portal
                        </p>
                    </div>
                )}
                <button
                    className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-electric ml-auto rounded-sm p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none md:hidden"
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

            <div className="border-border shrink-0 border-t p-3">
                {role === "admin" && (
                    <Link
                        to="/app/domains"
                        onClick={onMobileClose}
                        className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground mb-1 flex h-8 items-center gap-2 rounded-sm px-3 text-sm transition-colors"
                    >
                        {!collapsed ? (
                            <span className="font-mono text-[0.6875rem] font-medium tracking-[0.05em] uppercase">
                                Student portal →
                            </span>
                        ) : (
                            <GraduationCap className="size-4" aria-hidden="true" />
                        )}
                    </Link>
                )}
                <div className="flex items-center gap-2 rounded-sm px-3 py-2">
                    <div className="bg-secondary text-secondary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-medium">
                        {profile?.full_name?.slice(0, 2).toUpperCase() ?? "AC"}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-sm font-medium">
                                {profile?.full_name ?? "Account"}
                            </p>
                            <p className="text-muted-foreground truncate font-mono text-[0.625rem] tracking-[0.06em] uppercase">
                                {role ?? "student"}
                            </p>
                        </div>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="text-muted-foreground hover:bg-error/10 hover:text-error focus-visible:ring-error rounded-sm p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                    <div className="bg-midnight/60 absolute inset-0" onClick={onMobileClose} aria-hidden="true" />
                    <aside className="border-border bg-card shadow-modal absolute inset-y-0 left-0 w-64 border-r">
                        {body}
                    </aside>
                </div>
            )}
            <aside
                className={cn(
                    "border-border bg-secondary hidden shrink-0 border-r md:block",
                    collapsed ? "w-16" : "w-60"
                )}
                aria-label="Primary navigation"
            >
                <div className="sticky top-0 h-screen">{body}</div>
            </aside>
        </>
    );
}
