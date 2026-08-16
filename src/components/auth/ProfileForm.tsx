import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  initial: Profile | null;
  onSaved?: () => void;
  submitLabel?: string;
}

const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => 2024 + i);

export function ProfileForm({ initial, onSaved, submitLabel = "Save profile" }: ProfileFormProps) {
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = React.useState(initial?.full_name ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [course, setCourse] = React.useState(initial?.course ?? "");
  const [college, setCollege] = React.useState(initial?.college ?? "");
  const [graduationYear, setGraduationYear] = React.useState<number | "">(initial?.graduation_year ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Full name is required.";
    if (!phone.trim()) next.phone = "Phone number is required.";
    else if (!/^[+0-9 ()-]{7,}$/.test(phone.trim())) next.phone = "Enter a valid phone number.";
    if (!course.trim()) next.course = "Course is required.";
    if (!college.trim()) next.college = "College / institution is required.";
    if (!graduationYear) next.graduationYear = "Select your graduation year.";
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
          course: course.trim(),
          college: college.trim(),
          graduation_year: Number(graduationYear),
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
        {errors.fullName && <p className="text-sm text-error">{errors.fullName}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-email">Email</Label>
        <Input id="pf-email" value={initial?.email ?? ""} disabled readOnly />
        <p className="text-xs text-muted-foreground">Assigned from your Google account — cannot be changed.</p>
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
          {errors.phone && <p className="text-sm text-error">{errors.phone}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-course">Course</Label>
          <Input
            id="pf-course"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="e.g. B.Tech CSE (AIML)"
            {...field("course")}
          />
          {errors.course && <p className="text-sm text-error">{errors.course}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-college">College / institution</Label>
        <Input
          id="pf-college"
          value={college}
          onChange={(e) => setCollege(e.target.value)}
          placeholder="Your college or institution"
          {...field("college")}
        />
        {errors.college && <p className="text-sm text-error">{errors.college}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pf-year">Graduation year</Label>
        <Select
          value={graduationYear === "" ? undefined : String(graduationYear)}
          onValueChange={(v) => setGraduationYear(Number(v))}
        >
          <SelectTrigger id="pf-year" className={cn(errors.graduationYear && "aria-[invalid=true]:border-error")} aria-invalid={errors.graduationYear ? true : undefined}>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.graduationYear && <p className="text-sm text-error">{errors.graduationYear}</p>}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={saving} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
