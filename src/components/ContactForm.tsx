import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [interest, setInterest] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload: ContactInsert = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      organisation: String(fd.get("org") ?? "").trim() || null,
      location: String(fd.get("location") ?? "").trim() || null,
      vertical_interest: interest || null,
      message: String(fd.get("message") ?? "").trim() || null,
    };
    try {
      const { error } = await supabase.from("contacts").insert(payload);
      if (error) throw error;
      toast.success("Thanks! We'll reach out shortly.");
      (e.target as HTMLFormElement).reset();
      setInterest("");
    } catch (err: any) {
      toast.error(err?.message ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-label="Partner interest form"
      onSubmit={handleSubmit}
      className="grid sm:grid-cols-2 gap-4"
    >
      <Field id="cf-name" label="Name" required>
        <Input id="cf-name" name="name" required placeholder="Your full name" />
      </Field>
      <Field id="cf-phone" label="Phone" required>
        <Input id="cf-phone" name="phone" required type="tel" placeholder="+91 ..." />
      </Field>
      <Field id="cf-email" label="Email" required>
        <Input id="cf-email" name="email" required type="email" placeholder="torqwings@gmail.com" />
      </Field>
      <Field id="cf-org" label="Organization">
        <Input id="cf-org" name="org" placeholder="Company / FPO / Institution" />
      </Field>
      <Field id="cf-location" label="Location">
        <Input id="cf-location" name="location" placeholder="City, State" />
      </Field>
      <Field id="cf-interest" label="Interested in" required>
        <Select value={interest} onValueChange={setInterest} required>
          <SelectTrigger id="cf-interest" aria-label="Interested in">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="agrisky">AgriSky — agriculture solution</SelectItem>
            <SelectItem value="infrasky">InfraSky — infrastructure inspection</SelectItem>
            <SelectItem value="geosky">GeoSky — mapping &amp; survey</SelectItem>
            <SelectItem value="guardsky">GuardSky — aerial surveillance &amp; early fire response</SelectItem>
            <SelectItem value="labs">Custom UAV R&amp;D / Labs</SelectItem>
            <SelectItem value="academy">TorqWings Academy — drone training</SelectItem>
            <SelectItem value="design-studio">Design Studio</SelectItem>
            <SelectItem value="partner">Partnership / Investment</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="cf-message" label="Message">
          <Textarea id="cf-message" name="message" rows={4} placeholder="Tell us briefly about your interest…" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
        >
          {submitting ? "Submitting…" : "Submit Interest"}
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
        <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          We typically respond within 1–2 business days.
        </p>
      </div>
    </form>
  );
}

function Field({
  id, label, required, children,
}: {
  id?: string; label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}{required && " *"}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
