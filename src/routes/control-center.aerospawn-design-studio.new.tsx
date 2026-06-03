import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studioActions } from "@/lib/design-studio/store";
import type { Purpose, UserType, Vertical } from "@/lib/design-studio/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/new")({
  component: NewProject,
});

function NewProject() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [verticals, setVerticals] = useState<string[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [userTypes, setUserTypes] = useState<string[]>([]);
  const [vertical, setVertical] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [userType, setUserType] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [v, p, u] = await Promise.all([
        supabase.from("studio_verticals").select("name").eq("active", true).order("sort_order"),
        supabase.from("studio_purposes").select("name").eq("active", true).order("sort_order"),
        supabase.from("studio_user_types").select("name").eq("active", true).order("sort_order"),
      ]);
      const vs = (v.data ?? []).map((r) => r.name);
      const ps = (p.data ?? []).map((r) => r.name);
      const us = (u.data ?? []).map((r) => r.name);
      setVerticals(vs);
      setPurposes(ps);
      setUserTypes(us);
      if (vs[0]) setVertical(vs[0]);
      if (ps[0]) setPurpose(ps[0]);
      if (us[0]) setUserType(us[0]);
      setLoading(false);
    })();
  }, []);

  function submit() {
    if (name.trim().length < 3) return toast.error("Project name is required");
    if (!vertical || !purpose || !userType) return toast.error("Please select all options");
    studioActions.create({
      projectName: name.trim(),
      vertical: vertical as Vertical,
      purpose: purpose as Purpose,
      userType: userType as UserType,
    });
    toast.success("Project created");
    nav({ to: "/control-center/aerospawn-design-studio/requirements" });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Create Drone Design Project</h1>
        <p className="text-sm text-muted-foreground mt-1">Define the project scope. You'll capture mission requirements next.</p>
      </header>
      <div className="rounded-xl border border-border/60 bg-card/60 p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Project name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AgriSky 10L Spraying Drone" />
        </div>
        <div className="space-y-1.5">
          <Label>Drone vertical</Label>
          <Select value={vertical} onValueChange={setVertical} disabled={loading}>
            <SelectTrigger><SelectValue placeholder={loading ? "Loading…" : "Select"} /></SelectTrigger>
            <SelectContent>{verticals.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Drone purpose</Label>
          <Select value={purpose} onValueChange={setPurpose} disabled={loading}>
            <SelectTrigger><SelectValue placeholder={loading ? "Loading…" : "Select"} /></SelectTrigger>
            <SelectContent>{purposes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>User type</Label>
          <Select value={userType} onValueChange={setUserType} disabled={loading}>
            <SelectTrigger><SelectValue placeholder={loading ? "Loading…" : "Select"} /></SelectTrigger>
            <SelectContent>{userTypes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="pt-2 flex justify-end">
          <Button onClick={submit} disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white">Continue to Requirements</Button>
        </div>
      </div>
    </div>
  );
}
