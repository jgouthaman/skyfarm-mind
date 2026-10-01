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
  { value: "Requested", label: "Requested", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
  { value: "Contacted", label: "Contacted", color: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
  { value: "Approved", label: "Approved", color: "#1D9E75", bg: "rgba(29,158,117,0.15)" },
  { value: "Declined", label: "Declined", color: "var(--mh-dim)", bg: "var(--mh-panel)" },
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
    <MissionHubShell title="Early Access Request">
      <RecordsTable
        table="Hangar_early_access"
        title=""
        searchFields={["name", "email"]}
        csvFilename="hangar-early-access.csv"
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "mobile_number", label: "Mobile Number" },
          { key: "profession", label: "Profession" },
          { key: "company", label: "Company" },
          { key: "country", label: "Country" },
        ]}
        statusOptions={STATUS}
        detailFields={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "mobile_number", label: "Mobile Number" },
          { key: "profession", label: "Profession" },
          { key: "company", label: "Company" },
          { key: "country", label: "Country" },
        ]}
      />
    </MissionHubShell>
  );
}
