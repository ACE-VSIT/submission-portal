import { Outlet } from "react-router-dom";
import { usePortalDeadline } from "@/hooks/usePortalDeadline";
import { PortalClosedState } from "@/components/states/PortalClosedState";

/**
 * Route guard for the student submission pages (domains + tasks). Renders the
 * pages while the portal is open and swaps to a closed state once
 * VITE_SUBMISSION_DEADLINE has passed. The underlying hook re-evaluates every
 * 30s, so an already-open page closes itself without a reload.
 */
export function RequireSubmissionOpen() {
    const { closed } = usePortalDeadline();
    if (closed) return <PortalClosedState />;
    return <Outlet />;
}
