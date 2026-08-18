import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

/**
 * Owner gate - only the owner role can access user management pages.
 * Backed by Supabase RLS: only owners can update profiles for role changes.
 */
export function RequireOwner() {
    const { session, profile, loading } = useAuth();

    if (loading) return <FullPageLoader />;
    if (!session) return <Navigate to="/login" replace />;

    if (profile === null) return <FullPageLoader />;
    if (profile.role !== "owner") return <Navigate to="/admin" replace />;

    return <Outlet />;
}
