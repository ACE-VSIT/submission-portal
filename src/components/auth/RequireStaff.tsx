import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

/**
 * Staff gate - allows both admin and mentor roles to access the dashboard.
 * Backed by Supabase RLS: mentors cannot write to domains/tasks even if
 * they reach those routes through the UI.
 */
export function RequireStaff() {
    const { session, profile, loading } = useAuth();

    if (loading) return <FullPageLoader />;
    if (!session) return <Navigate to="/login" replace />;

    // Profile still resolving or role unknown - show structure, not a flash of content.
    if (profile === null) return <FullPageLoader />;
    if (profile.role !== "admin" && profile.role !== "mentor") return <Navigate to="/app/domains" replace />;

    return <Outlet />;
}
