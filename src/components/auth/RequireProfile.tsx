import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { FullPageLoader } from "@/components/layout/FullPageLoader";

export function isProfileComplete(p: {
  full_name: string;
  phone: string;
  course: string;
  college: string;
  graduation_year: number | null;
}) {
  return Boolean(
    p.full_name?.trim() &&
      p.phone?.trim() &&
      p.course?.trim() &&
      p.college?.trim() &&
      p.graduation_year != null &&
      p.graduation_year > 0,
  );
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
