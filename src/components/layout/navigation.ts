import type { NavSection } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
    LayoutDashboard,
    Layers,
    User,
    ShieldCheck,
    ClipboardCheck,
    UsersRound,
    Eye,
    GraduationCap,
    Send,
} from "lucide-react";

export const studentNav: NavSection[] = [
    {
        label: "Student",
        items: [
            { label: "Domains", to: "/app/domains", icon: "layers", end: true },
            { label: "Submissions", to: "/app/submissions", icon: "send" },
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
            { label: "Reviews", to: "/admin/reviews", icon: "clipboard" },
            { label: "Interviews", to: "/admin/interviews", icon: "users" },
        ],
    },
    {
        label: "Student Portal",
        items: [{ label: "Student Portal", to: "/app/domains", icon: "graduation" }],
    },
    {
        label: "Account",
        items: [{ label: "My Profile", to: "/admin/profile", icon: "user" }],
    },
];

export const mentorNav: NavSection[] = [
    {
        label: "Mentor",
        items: [
            { label: "Overview", to: "/admin", icon: "dashboard", end: true },
            { label: "Reviews", to: "/admin/reviews", icon: "clipboard" },
            { label: "Interviews", to: "/admin/interviews", icon: "users" },
        ],
    },
    {
        label: "Student Portal",
        items: [{ label: "Student Portal", to: "/app/domains", icon: "graduation" }],
    },
    {
        label: "Account",
        items: [{ label: "My Profile", to: "/admin/profile", icon: "user" }],
    },
];

export const iconMap: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard,
    layers: Layers,
    user: User,
    shield: ShieldCheck,
    clipboard: ClipboardCheck,
    users: UsersRound,
    eye: Eye,
    graduation: GraduationCap,
    send: Send,
};

export function labelForPath(pathname: string): string {
    if (pathname.startsWith("/admin")) {
        if (pathname === "/admin" || pathname === "/admin/") return "Overview";
        if (pathname.startsWith("/admin/reviews")) return "Reviews";
        if (pathname.startsWith("/admin/interviews")) return "Interviews";
        if (pathname.startsWith("/admin/domains")) return "Domains";
        if (pathname.startsWith("/admin/profile")) return "My Profile";
        return "Admin";
    }
    if (pathname.startsWith("/app")) {
        if (pathname.startsWith("/app/domains")) return "Domains";
        if (pathname.startsWith("/app/submissions")) return "My Submissions";
        if (pathname.startsWith("/app/profile")) return "My Profile";
        return "Student";
    }
    return "ACE";
}
