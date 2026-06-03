import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studioActions } from "@/lib/design-studio/store";
import type { Purpose, UserType, Vertical } from "@/lib/design-studio/types";
import { toast } from "sonner";

export const Route = createFileRoute("/control-center/aerospawn-design-studio/new")({
  component: NewProject,
});

const verticals: Vertical[] = ["AgriSky", "GuardSky", "DeliverySky", "TrainSky", "Custom Drone Lab"];
const purposes: Purpose[] = ["Agriculture spraying", "Farm aerial survey", "Crop monitoring", "Surveillance", "Fire detection", "Fire extinguisher ball dropping", "Payload delivery", "Training drone", "Custom research drone"];
const userTypes: UserType[] = ["Farmer", "Drone engineer", "Student", "Trainer", "Enterprise client", "Investor demo", "Internal R&D"];

function NewProject() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<Vertical>("AgriSky");
  const [purpose, setPurpose] = useState<Purpose>("Agriculture spraying");
  const [userType, setUserType] = useState<UserType>("Farmer");

  function submit() {
    if (name.trim().length < 3) return toast.error("Project name is required");
    studioActions.create({ projectName: name.trim(), vertical, purpose, userType });
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
          <Select value={vertical} onValueChange={(v) => setVertical(v as Vertical)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{verticals.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Drone purpose</Label>
          <Select value={purpose} onValueChange={(v) => setPurpose(v as Purpose)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{purposes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>User type</Label>
          <Select value={userType} onValueChange={(v) => setUserType(v as UserType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{userTypes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="pt-2 flex justify-end">
          <Button onClick={submit} className="bg-sky-500 hover:bg-sky-600 text-white">Continue to Requirements</Button>
        </div>
      </div>
    </div>
  );
}
