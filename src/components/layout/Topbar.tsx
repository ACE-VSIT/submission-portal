import { Menu, Search, Sun, Moon, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { labelForPath } from "./navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  onOpenMobileNav: () => void;
  onOpenPalette: () => void;
  onToggleCollapse: () => void;
}

export function Topbar({ onOpenMobileNav, onOpenPalette, onToggleCollapse }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { profile, role, signOut } = useAuth();

  const title = labelForPath(location.pathname);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
      <button
        className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <button
        className="hidden rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric md:block"
        onClick={onToggleCollapse}
        aria-label="Toggle sidebar"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          ace / vsit
        </span>
        <span className="text-muted-foreground/40" aria-hidden="true">/</span>
        <span className="truncate font-heading text-sm font-medium text-foreground">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onOpenPalette}
          className="hidden h-8 w-56 items-center gap-2 rounded-sm border border-border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric sm:flex"
          aria-label="Open command palette"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span className="flex-1 text-left text-xs text-muted-foreground/80">Jump to…</span>
          <kbd className="font-mono text-[0.625rem] text-muted-foreground">⌘K</kbd>
        </button>
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={onOpenPalette} aria-label="Search">
          <Search className="size-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-8 items-center gap-1.5 rounded-sm px-1.5 transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric"
              aria-label="Account menu"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-[0.625rem] font-medium">
                {profile?.full_name?.slice(0, 2).toUpperCase() ?? "AC"}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="normal-case font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">Signed in as</span>
              <span className="truncate normal-case font-sans text-sm font-medium text-foreground">
                {profile?.full_name ?? profile?.email ?? "—"}
              </span>
              <span className="truncate normal-case font-mono text-[0.625rem] text-muted-foreground">{profile?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <Badge variant={role === "admin" ? "primary" : "neutral"}>{role === "admin" ? "Admin" : "Student"}</Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} destructive>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
