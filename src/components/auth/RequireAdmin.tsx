import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

/**
 * Admin gate - backed by Supabase RLS, not merely this route check. A student
 * reaching an admin URL is redirected; even if the UI were bypassed, the
 * database rejects admin writes (see RLS policies in supabase/migrations).
 */
export function RequireAdmin() {
    const { session, profile, loading } = useAuth();

    if (loading) return <FullPageLoader />;
    if (!session) return <Navigate to="/login" replace />;

    // Profile still resolving or role unknown - show structure, not a flash of content.
    if (profile === null) return <FullPageLoader />;
    if (profile.role !== "admin" && profile.role !== "owner") return <Navigate to="/admin" replace />;

    return <Outlet />;
}
