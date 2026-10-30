import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MissionHubShell, requireAdminGuard } from "@/components/mission-hub/Shell";
import { RecordsTable, type RecordsQuery, type RecordsSource } from "@/components/mission-hub/RecordsTable";
import { useMissionHubAuth } from "@/lib/mission-hub/context";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_OPTIONS } from "@/constants/services.constants";

// Mission Hub -> Business -> Service Requests: enquiries from the public
// /services form (Site_Service_Enquiries). That table has RLS with no
// policies, so rows come through /api/mission-hub/service-enquiries, which
// checks the caller is a Mission Hub admin and reads with supabaseAdmin.
export const Route = createFileRoute("/mission-hub/service-requests")({
  component: ServiceRequestsPage,
});

const STATUS = [
  { value: "new", label: "New", color: "#378ADD", bg: "rgba(55,138,221,0.15)" },
  { value: "replied", label: "Replied", color: "#EF9F27", bg: "rgba(239,159,39,0.15)" },
  { value: "quoted", label: "Quoted", color: "#7B5CC4", bg: "rgba(123,92,196,0.12)" },
  { value: "in_progress", label: "In progress", color: "#EF9F27", bg: "rgba(239,159,39,0.1)" },
  { value: "closed", label: "Closed", color: "var(--mh-dim)", bg: "var(--mh-panel)" },
];

async function authedFetch(url: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired -- sign in again.");
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? `Request failed (HTTP ${res.status}).`);
  return json;
}

const source: RecordsSource = {
  list: async (q: RecordsQuery) => {
    const p = new URLSearchParams({ page: String(q.page), pageSize: String(q.pageSize) });
    if (q.search) p.set("search", q.search);
    if (q.status) p.set("status", q.status);
    if (q.filters.service) p.set("service", q.filters.service);
    if (q.dateFrom) p.set("dateFrom", q.dateFrom);
    if (q.dateTo) p.set("dateTo", q.dateTo);
    if (q.all) p.set("all", "1");
    return authedFetch(`/api/mission-hub/service-enquiries?${p}`);
  },
  updateStatus: async (id, status) => {
    await authedFetch("/api/mission-hub/service-enquiries", { method: "PATCH", body: JSON.stringify({ id, status }) });
  },
};

function ServiceRequestsPage() {
  const { profile, loading } = useMissionHubAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) requireAdminGuard(profile.role, navigate);
  }, [loading, profile, navigate]);

  return (
    <MissionHubShell title="Service Requests">
      <RecordsTable
        table="Site_Service_Enquiries"
        source={source}
        title="Service Requests"
        searchFields={["name", "organisation", "email"]}
        csvFilename="service-requests.csv"
        columns={[
          { key: "name", label: "Name" },
          { key: "organisation", label: "Organisation" },
          { key: "email", label: "Email" },
          { key: "service", label: "Service" },
        ]}
        filters={[
          { key: "service", label: "Services", options: SERVICE_OPTIONS.map((o) => ({ value: o, label: o })) },
        ]}
        statusOptions={STATUS}
        detailFields={[
          { key: "name", label: "Name" },
          { key: "organisation", label: "Organisation" },
          { key: "email", label: "Email" },
          { key: "service", label: "Service" },
          { key: "message", label: "Vehicle and what they need to know" },
        ]}
      />
    </MissionHubShell>
  );
}
