import type { NavSection } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Layers, User, ShieldCheck } from "lucide-react";

export const studentNav: NavSection[] = [
  {
    label: "Student",
    items: [
      { label: "Domains", to: "/app/domains", icon: "layers", end: true },
      { label: "My Profile", to: "/app/profile", icon: "user" },
    ],
  },
];

export const adminNav: NavSection[] = [
  {
    label: "Admin",
    items: [
      { label: "Overview", to: "/admin", icon: "dashboard", end: true },
      { label: "Domains", to: "/admin/domains", icon: "layers" },
    ],
  },
];

export const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  layers: Layers,
  user: User,
  shield: ShieldCheck,
};

export function labelForPath(pathname: string): string {
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin" || pathname === "/admin/") return "Overview";
    if (pathname.startsWith("/admin/domains")) return "Domains";
    return "Admin";
  }
  if (pathname.startsWith("/app")) {
    if (pathname.startsWith("/app/domains")) return "Domains";
    if (pathname.startsWith("/app/profile")) return "My Profile";
    return "Student";
  }
  return "ACE VSIT";
}
