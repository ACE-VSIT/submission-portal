import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
    initial: Profile | null;
    onSaved?: () => void;
    submitLabel?: string;
}

const COURSE_OPTIONS = ["BCA", "MCA"] as const;

export function ProfileForm({ initial, onSaved, submitLabel = "Save profile" }: ProfileFormProps) {
    const { refreshProfile } = useAuth();
    const [fullName, setFullName] = React.useState(initial?.full_name ?? "");
    const [phone, setPhone] = React.useState(initial?.phone ?? "");
    const [course, setCourse] = React.useState<"BCA" | "MCA" | "">(initial?.course ?? "");
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [saving, setSaving] = React.useState(false);

    const validate = () => {
        const next: Record<string, string> = {};
        if (!fullName.trim()) next.fullName = "Full name is required.";
        if (!phone.trim()) next.phone = "Phone number is required.";
        else if (!/^[+0-9 ()-]{7,}$/.test(phone.trim())) next.phone = "Enter a valid phone number.";
        if (!course) next.course = "Course is required.";
        return next;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const next = validate();
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        setSaving(true);
        try {
            const { data } = await supabase.auth.getUser();
            if (!data.user) throw new Error("Your session expired. Please sign in again.");

            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: fullName.trim(),
                    phone: phone.trim(),
                    course: course,
                })
                .eq("id", data.user.id);

            if (error) throw error;
            await refreshProfile();
            toast.success("Profile saved");
            onSaved?.();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save your profile.");
        } finally {
            setSaving(false);
        }
    };

    const field = (name: string) => ({
        "aria-invalid": errors[name] ? true : undefined,
    });

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-1.5">
                <Label htmlFor="pf-full-name">Full name</Label>
                <Input
                    id="pf-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    {...field("fullName")}
                />
                {errors.fullName && <p className="text-error text-sm">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="pf-email">Email</Label>
                <Input id="pf-email" value={initial?.email ?? ""} disabled readOnly />
                <p className="text-muted-foreground text-xs">Assigned from your Google account - cannot be changed.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="pf-phone">Phone number</Label>
                    <Input
                        id="pf-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 …"
                        inputMode="tel"
                        autoComplete="tel"
                        {...field("phone")}
                    />
                    {errors.phone && <p className="text-error text-sm">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="pf-course">Course</Label>
                    <Select value={course} onValueChange={(v) => setCourse(v as "BCA" | "MCA" | "")}>
                        <SelectTrigger
                            id="pf-course"
                            className={cn(errors.course && "aria-[invalid=true]:border-error")}
                            aria-invalid={errors.course ? true : undefined}
                        >
                            <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                            {COURSE_OPTIONS.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.course && <p className="text-error text-sm">{errors.course}</p>}
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <Button type="submit" loading={saving} className="w-full sm:w-auto">
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
