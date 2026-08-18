import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

export function isProfileComplete(p: { full_name: string; phone: string; enrollment_no: string; course: string }) {
    return Boolean(p.full_name?.trim() && p.phone?.trim() && p.enrollment_no?.trim() && p.course?.trim());
}

/** Students must complete their ACE profile before touching the task experience. */
export function RequireProfile() {
    const { session, profile, loading } = useAuth();

    if (loading) return <FullPageLoader />;
    if (!session) return <Navigate to="/login" replace />;
    if (profile === null) return <FullPageLoader />;
    if (!isProfileComplete(profile)) return <Navigate to="/app/profile" replace />;

    return <Outlet />;
}
