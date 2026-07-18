import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUNDLE_VALUE = "__bundle__";

export type WaitlistCourseOption = { id: string; title: string };

export type WaitlistSource = "waitlist" | "enroll";

export function AcademyWaitlistModal({
  open, onOpenChange, courseId, courses, source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string | null;
  courses: WaitlistCourseOption[];
  source: WaitlistSource;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId ?? BUNDLE_VALUE);

  useEffect(() => {
    if (open) setSelectedCourseId(courseId ?? BUNDLE_VALUE);
  }, [open, courseId]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSuccess(false);
      setError(null);
      setNameError(null);
      setEmailError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const name = String(fd.get("name") ?? "").trim();

    let hasError = false;
    if (!name) {
      setNameError("Enter your name");
      hasError = true;
    } else {
      setNameError(null);
    }
    if (!email || !EMAIL_RE.test(email)) {
      setEmailError("Enter a valid email address");
      hasError = true;
    } else {
      setEmailError(null);
    }
    if (hasError) return;

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from("academy_waitlist" as any)
        .insert({
          course_id: selectedCourseId === BUNDLE_VALUE ? null : selectedCourseId,
          email,
          name,
          source,
        } as any);
      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        {success ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              You're on the list — we'll email you at launch
            </h3>
            <Button className="mt-6 w-full" variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Join the waitlist</DialogTitle>
              <DialogDescription>
                Be the first to know when this course launches.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div>
                <Label htmlFor="waitlist-course" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Course
                </Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger id="waitlist-course" className="mt-1.5">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BUNDLE_VALUE}>Full bundle — all 5 courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="waitlist-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Name *
                </Label>
                <Input id="waitlist-name" name="name" required className="mt-1.5" placeholder="Your full name" />
                {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
              </div>
              <div>
                <Label htmlFor="waitlist-email" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Email *
                </Label>
                <Input
                  id="waitlist-email" name="email" type="email" required
                  className="mt-1.5" placeholder="you@email.com"
                />
                {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
              </div>
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Joining…" : "Join waitlist"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
