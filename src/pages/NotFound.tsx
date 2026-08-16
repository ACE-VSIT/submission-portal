import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Design.md §17 404 — chrome-free, centered message, single back action. */
export function NotFoundPage() {
    return (
        <div className="bg-background flex min-h-dvh items-center justify-center px-4">
            <div className="animate-fade-in flex max-w-sm flex-col items-center text-center">
                <SearchX className="text-muted-foreground mb-4 size-8" strokeWidth={1.5} aria-hidden="true" />
                <p className="eyebrow mb-3">Error 404</p>
                <h1 className="font-heading text-foreground text-2xl font-medium tracking-tight text-balance">
                    Page not found
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                    The page you are looking for doesn’t exist or has moved.
                </p>
                <Link to="/app/domains" className="mt-6">
                    <Button variant="default">Back to domains</Button>
                </Link>
            </div>
        </div>
    );
}
