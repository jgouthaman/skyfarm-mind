import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { MissionHubShell } from "@/components/mission-hub/Shell";
import { RecordsTable } from "@/components/mission-hub/RecordsTable";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { toast } from "sonner";

export const Route = createFileRoute("/mission-hub/contacts")({
  validateSearch: (s: Record<string, unknown>) => ({ vertical: (s.vertical as string) || "" }),
  component: ContactsPage,
});

const STATUS = [
  { value: "new", label: "New", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
  { value: "replied", label: "Replied", color: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
  { value: "in_progress", label: "In progress", color: "#EF9F27", bg: "rgba(239,159,39,0.1)" },
  { value: "closed", label: "Closed", color: "rgba(255,255,255,0.6)", bg: "rgba(255,255,255,0.06)" },
];

function ContactsPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/mission-hub/contacts" });

  useEffect(() => {
    if (!loading && profile && profile.role === "user") {
      toast.error("Access restricted.");
      navigate({ to: "/mission-hub/dashboard" });
    }
  }, [loading, profile, navigate]);

  return (
    <MissionHubShell title="Contacts">
      <RecordsTable
        table="contacts"
        searchFields={["name", "email"]}
        csvFilename="contacts.csv"
        initialFilters={search.vertical ? { vertical_interest: search.vertical } : {}}
        columns={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "organisation", label: "Organisation" },
          { key: "location", label: "Location" },
          { key: "vertical_interest", label: "Vertical interest" },
        ]}
        filters={[
          {
            key: "vertical_interest", label: "Vertical interest",
            options: [
              { value: "agrisky", label: "AgriSky" },
              { value: "infrasky", label: "InfraSky" },
              { value: "geosky", label: "GeoSky" },
              { value: "guardsky", label: "GuardSky" },
              { value: "labs", label: "Labs" },
              { value: "academy", label: "Academy" },
              { value: "design-studio", label: "Design Studio" },
            ],
          },
        ]}
        statusOptions={STATUS}
        detailFields={[
          { key: "name", label: "Name" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "organisation", label: "Organisation" },
          { key: "location", label: "Location" },
          { key: "vertical_interest", label: "Vertical interest" },
          { key: "message", label: "Message" },
        ]}
      />
    </MissionHubShell>
  );
}
