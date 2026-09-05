import { Lock } from "lucide-react";
import { usePortalDeadline } from "@/hooks/usePortalDeadline";
import { DeadlineBar } from "@/components/layout/DeadlineBar";
import { EmptyState } from "@/components/states/EmptyState";

function formatClosedAt(date: Date): string {
    return date.toLocaleString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/** Shown in place of the domains/tasks routes once VITE_SUBMISSION_DEADLINE has passed. */
export function PortalClosedState() {
    const { deadline } = usePortalDeadline();

    return (
        <>
            <DeadlineBar />
            <div className="page py-8">
                <div className="panel">
                    <EmptyState
                        icon={Lock}
                        eyebrow="Submissions closed"
                        title="The submission portal has closed"
                        description={
                            deadline
                                ? `Submissions closed on ${formatClosedAt(deadline)}. Thanks for taking part in ACE! Check the announcements for what’s next.`
                                : "Submissions are currently closed. Check the announcements for updates."
                        }
                    />
                </div>
            </div>
        </>
    );
}
