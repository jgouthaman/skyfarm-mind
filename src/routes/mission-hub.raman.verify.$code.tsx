import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { RamanBrand, RamanFrame } from "@/components/raman/RamanFrame";
import { Card, ErrorNote, fmt } from "@/components/raman/ui";
import { ramanApi } from "@/lib/raman/ramanBrowserApi";

// Target of the certificate's QR code: looks the certificate ID up in the
// database. Admin-only for the beta (Mission Hub login).
export const Route = createFileRoute("/mission-hub/raman/verify/$code")({
  component: VerifyCertificatePage,
});

function VerifyCertificatePage() {
  const { code } = Route.useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof ramanApi.verify>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ramanApi.verify(code).then(setData).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [code]);

  return (
    <RamanFrame title="Ask Raman · Verify certificate">
      <RamanBrand />
      <h2 className="mt-5 text-2xl font-semibold">Certificate {code}</h2>
      <div className="mt-4 max-w-xl">
        {error && <ErrorNote>{error}</ErrorNote>}
        {!error && !data && <p style={{ color: "var(--rmn-on-navy-dim)" }}>Checking…</p>}
        {data && (
          <Card>
            <div className="flex items-center gap-2 font-semibold" style={{ color: "var(--rmn-pass-ink)" }}>
              <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Found in the TorqWings database
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="rmn-label">Issued</dt>
              <dd>{new Date(data.report.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
              <dt className="rmn-label">Customer</dt>
              <dd>{data.customer ? `${data.customer.name}${data.customer.company ? `, ${data.customer.company}` : ""}` : "--"}</dd>
              <dt className="rmn-label">Vehicle</dt>
              <dd>{data.vehicle?.name ?? "--"} (cycle v{data.cycle})</dd>
              <dt className="rmn-label">Before (assessed)</dt>
              <dd>{fmt(data.before_dba)} dBA at {data.target_distance_m ?? 10} m, hover</dd>
              <dt className="rmn-label">After (predicted)</dt>
              <dd>{fmt(data.after_dba)} dBA at {data.target_distance_m ?? 10} m, hover</dd>
              <dt className="rmn-label">Engagement</dt>
              <dd>{data.status}</dd>
            </dl>
            <p className="rmn-label mt-3">Predicted by software analysis, accuracy about ±5 dB. Not a measured or regulatory certification.</p>
            <Link to="/mission-hub/raman/$engagementId" params={{ engagementId: data.report.engagement_id }} className="mt-3 inline-block text-sm underline">
              Open the engagement
            </Link>
          </Card>
        )}
      </div>
    </RamanFrame>
  );
}
