import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MissionHubShell } from "@/components/mission-hub/Shell";
import { RecordsTable } from "@/components/mission-hub/RecordsTable";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/waitlist")({
  component: WaitlistPage,
});

const STATUS = [
  { value: "new", label: "New", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
  { value: "contacted", label: "Contacted", color: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
  { value: "converted", label: "Converted", color: "#1D9E75", bg: "rgba(29,158,117,0.15)" },
  { value: "not_interested", label: "Not interested", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)" },
];

function WaitlistPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [loading, profile, navigate]);

  return (
    <MissionHubShell title="Waitlist">
      <RecordsTable
        table="design_studio_leads"
        searchFields={["full_name", "email"]}
        csvFilename="waitlist.csv"
        columns={[
          { key: "full_name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "organisation", label: "Organisation" },
          { key: "role", label: "Role" },
          { key: "plan", label: "Plan" },
          { key: "location", label: "Location" },
        ]}
        filters={[
          {
            key: "plan", label: "Plans",
            options: [
              { value: "Explorer", label: "Explorer" },
              { value: "Engineer", label: "Engineer" },
              { value: "Squadron", label: "Squadron" },
              { value: "Campus", label: "Campus" },
              { value: "Waitlist", label: "Waitlist" },
            ],
          },
        ]}
        statusOptions={STATUS}
        detailFields={[
          { key: "full_name", label: "Full name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "organisation", label: "Organisation" },
          { key: "role", label: "Role" },
          { key: "location", label: "Location" },
          { key: "plan", label: "Plan" },
          { key: "message", label: "Message" },
        ]}
      />
    </MissionHubShell>
  );
}
