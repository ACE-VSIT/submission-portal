import { useNavigate } from "react-router-dom";
import { UserRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { isProfileComplete } from "@/components/auth/RequireProfile";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { PanelSkeleton } from "@/components/states/LoadingState";
import { formatDateTime } from "@/lib/utils";

export function ProfilePage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const complete = profile ? isProfileComplete(profile) : false;

  if (loading || profile === null) return <PanelSkeleton className="mx-auto mt-8 max-w-3xl" />;

  return (
    <div className="page py-8">
      <PageHeader
        crumbs={[{ label: "Student", to: "/app/domains" }, { label: "My profile" }]}
        title={complete ? "My Profile" : "Complete your profile"}
        description={
          complete
            ? "The details ACE uses to record your submissions."
            : "A few details are required before you can access domains and tasks."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="panel p-5 sm:p-6">
          {!complete && (
            <div className="mb-6 flex items-center gap-3 rounded-sm border border-warning/30 bg-warning/5 px-4 py-3">
              <span className="text-warning" aria-hidden="true">●</span>
              <p className="text-sm text-foreground">
                <span className="font-medium">Profile required.</span> Finish the fields below to unlock your
                domains. <span className="font-mono text-xs text-muted-foreground">STEP 1 / 2</span>
              </p>
            </div>
          )}
          <ProfileForm
            initial={profile}
            onSaved={() => {
              if (!complete) navigate("/app/domains");
            }}
            submitLabel={complete ? "Save changes" : "Save & continue"}
          />
        </div>

        <aside className="space-y-6">
          <div className="panel p-5 sm:p-6">
            <p className="eyebrow mb-4">Account</p>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-beige text-sm font-medium text-nickel dark:bg-slate">
                {(profile.full_name || "AC").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{profile.full_name || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge variant={profile.role === "admin" ? "primary" : "neutral"}>
                {profile.role === "admin" ? "Admin" : "Student"}
              </Badge>
              {profile.role === "admin" && (
                <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">
                  <ShieldCheck className="size-3.5" aria-hidden="true" /> Elevated access
                </span>
              )}
            </div>
            <dl className="mt-5 space-y-3 border-t border-border pt-4">
              <div>
                <dt className="font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">Phone</dt>
                <dd className="mt-0.5 text-sm text-foreground">{profile.phone || "—"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">Course</dt>
                <dd className="mt-0.5 text-sm text-foreground">{profile.course || "—"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">College</dt>
                <dd className="mt-0.5 text-sm text-foreground">{profile.college || "—"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">Graduation year</dt>
                <dd className="mt-0.5 text-sm text-foreground">{profile.graduation_year || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="panel p-5 sm:p-6">
            <p className="eyebrow mb-2">Member since</p>
            <p className="text-sm text-foreground">{formatDateTime(profile.created_at)}</p>
            <div className="mt-4 flex items-center gap-2 text-muted-foreground">
              <UserRound className="size-4" aria-hidden="true" />
              <span className="text-xs">Details are used only for ACE records.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
