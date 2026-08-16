import { Badge } from "@/components/ui/badge";

export type SubmissionStatus = "not_submitted" | "submitted" | "uploading" | "submitting" | "failed";

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  switch (status) {
    case "submitted":
      return <Badge variant="success" dot>Submitted</Badge>;
    case "uploading":
      return <Badge variant="primary" dot className="[&>span]:animate-pulse">Uploading</Badge>;
    case "submitting":
      return <Badge variant="primary" dot className="[&>span]:animate-pulse">Submitting</Badge>;
    case "failed":
      return <Badge variant="error" dot>Failed</Badge>;
    default:
      return <Badge variant="neutral">Not submitted</Badge>;
  }
}
