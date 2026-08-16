import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isProfileComplete } from "@/components/auth/RequireProfile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Design.md §17 Authentication: centered narrow column, bordered form, plain button. */
function LoginSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4" aria-label="Loading">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Skeleton className="size-10 rounded-sm" />
        </div>
        <Skeleton className="mx-auto h-7 w-64" />
        <div className="panel space-y-3 p-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.1 3.56-5.18 3.56-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.1-6.72-4.94H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.3a7.2 7.2 0 0 1 0-4.6v-3.1H1.28a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 1.28 6.6l4 3.1C6.23 6.87 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}

export function LoginPage() {
  const { session, profile, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Redirect signed-in users to the right landing surface.
  React.useEffect(() => {
    if (!session || !profile) return;
    if (profile.role === "admin") navigate("/admin", { replace: true });
    else if (isProfileComplete(profile)) navigate("/app/domains", { replace: true });
    else navigate("/app/profile", { replace: true });
  }, [session, profile, navigate]);

  if (loading) return <LoginSkeleton />;
  if (session) return <Navigate to="/app/domains" replace />;

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Could not reach Google sign-in. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-sm bg-electric">
            <GraduationCap className="size-6 text-white" aria-hidden="true" />
          </div>
          <p className="eyebrow">ACE VSIT — Submission portal</p>
          <h1 className="text-balance font-heading text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl">
            Sign in to your portal
          </h1>
          <p className="max-w-sm text-sm text-pretty text-muted-foreground">
            Use your college Google account to register, pick a domain, and submit your work.
          </p>
        </div>

        <div className="panel p-6">
          {error && (
            <div role="alert" className="mb-4 rounded-sm border border-error/30 bg-error/5 px-3 py-2.5 text-sm text-error">
              {error}
            </div>
          )}
          <Button
            className="w-full"
            size="lg"
            loading={busy}
            onClick={handleSignIn}
            aria-label="Sign in with Google"
          >
            <GoogleG className="size-4" />
            Continue with Google
          </Button>
          <p className="mt-4 text-center font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">
            Students &amp; admins sign in here
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in you agree to the ACE VSIT submission guidelines.
        </p>
      </div>
    </div>
  );
}
