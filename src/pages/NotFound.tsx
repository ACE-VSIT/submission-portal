import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Design.md §17 404 — chrome-free, centered message, single back action. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center text-center animate-fade-in">
        <SearchX className="mb-4 size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        <p className="eyebrow mb-3">Error 404</p>
        <h1 className="text-balance font-heading text-2xl font-medium tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you are looking for doesn’t exist or has moved.
        </p>
        <Link to="/app/domains" className="mt-6">
          <Button variant="default">Back to domains</Button>
        </Link>
      </div>
    </div>
  );
}
