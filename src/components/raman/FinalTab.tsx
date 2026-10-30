import { useState } from "react";
import { Award, Download, Mail, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { ramanApi, type EngagementBundle } from "@/lib/raman/ramanBrowserApi";
import type { RamanDesignChanges, RamanFixPredictionResult, RamanNoiseCheckResult } from "@/lib/raman/ramanTypes";
import { DecibelGauge } from "./DecibelGauge";
import { certificatePdf, changeLines, emailDraft, finalReportPdf } from "./ramanPdf";
import { Btn, Card, ErrorNote, FallbackBadge, LockBadge, Stat, VerdictBanner, ViaProvider, fmt, providerOfModel, signed } from "./ui";

// Tab 5 -- Final before-and-after report (spec §0.5). Downloads create a
// raman_reports row first (certificates get their RNC-YYYY-NNNN code from
// the database), then draw the PDF from the returned data.

export function FinalTab({
  bundle,
  onChanged,
  onReplay,
}: {
  bundle: EngagementBundle;
  onChanged: () => void;
  onReplay: () => void;
}) {
  const before = bundle.baseline!.result as RamanNoiseCheckResult;
  const fix = bundle.fix_prediction!;
  const after = fix.result as RamanFixPredictionResult;
  const changes = (fix.inputs as { changes: RamanDesignChanges }).changes;
  const run = bundle.runs.filter((r) => r.locked_design).at(-1) ?? null;
  const closed = bundle.engagement.status === "closed";
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const headline = `${fmt(after.baseline_dba)} to ${fmt(after.predicted_dba)} dBA, ${fmt(Math.abs(after.delta_db))} dB ${after.delta_db <= 0 ? "quieter" : "louder"}, ${after.verdict}`;
  const vehicle = bundle.vehicle?.name ?? "vehicle";

  const download = async (type: "final" | "certificate") => {
    setBusy(type);
    setError(null);
    try {
      const data = await ramanApi.report(bundle.engagement.id, type);
      if (type === "final") {
        finalReportPdf(data).save(`Raman-Final-Report-${vehicle}-v${bundle.engagement.cycle}.pdf`);
      } else {
        const doc = await certificatePdf(data, window.location.origin);
        doc.save(`Raman-Certificate-${data.report.certificate_code}.pdf`);
        toast.success(`Certificate ${data.report.certificate_code} issued.`);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const email = async () => {
    try {
      await navigator.clipboard.writeText(emailDraft(bundle, "final"));
      toast.success("Draft email copied -- paste it into your email and attach the PDFs.");
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  const close = async () => {
    setBusy("close");
    setError(null);
    try {
      await ramanApi.closeEngagement(bundle.engagement.id);
      toast.success("Engagement closed. All five tabs are frozen.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
      setConfirmClose(false);
    }
  };

  const certificates = bundle.reports.filter((r) => r.type === "certificate");

  return (
    <div className="space-y-4">
      <VerdictBanner verdict={after.verdict} headline={headline} right={closed ? <LockBadge label="Closed · frozen" /> : undefined} />

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <DecibelGauge value={after.baseline_dba} target={after.target_dba} caption={`Before · assessed (${before.verdict})`} size={260} />
          <DecibelGauge value={after.predicted_dba} target={after.target_dba} caption="After · predicted" size={260} />
        </div>
        <p className="rmn-label mt-2 text-center">
          Hover at {after.target_distance_m} m. A 10 dB reduction sounds about half as loud. Predicted by software analysis, accuracy about ±5 dB.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Changes made</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {changeLines(changes, before).map((l) => (
              <li key={l}>• {l}</li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Added mass" value={signed(after.tradeoffs.added_mass_g, 0)} unit="g" />
            <Stat label="Flight time" value={signed(after.tradeoffs.flight_time_change_pct)} unit="%" />
            <Stat label="Efficiency" value={signed(after.tradeoffs.efficiency_change_pct)} unit="%" />
            <Stat label="Thrust-to-weight" value={after.tradeoffs.thrust_to_weight} />
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold">How the fix was found</h3>
          {run ? (
            <div className="mt-2 space-y-2 text-sm">
              <div>{run.source_was_mock ? <FallbackBadge /> : <ViaProvider provider={providerOfModel(run.model)} />}</div>
              <p>{run.ranked_options?.length ?? 0} ranked options from the agent's run. {run.stop_reason?.replace(/^[a-z_]+: /, "")}</p>
              <Btn kind="ghost" style={{ color: "var(--rmn-ink)" }} onClick={onReplay}><PlayCircle className="h-4 w-4" /> Replay the full run</Btn>
            </div>
          ) : (
            <p className="rmn-label mt-2">No run recorded.</p>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="font-semibold">Levels before and after (dBA)</h3>
        <table className="rmn-table mt-2">
          <thead>
            <tr><th>Distance</th><th>Hover before</th><th>Hover after</th><th>Cruise before</th><th>Cruise after</th></tr>
          </thead>
          <tbody>
            {before.levels_by_distance.map((r) => {
              const a = after.noise_check.levels_by_distance.find((x) => x.distance_m === r.distance_m);
              return (
                <tr key={r.distance_m}>
                  <td>{r.distance_m} m</td>
                  <td>{fmt(r.hover_dba)}</td>
                  <td>{fmt(a?.hover_dba)}</td>
                  <td>{fmt(r.cruise_dba)}</td>
                  <td>{fmt(a?.cruise_dba)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Btn kind="navy" onClick={() => download("final")} disabled={!!busy}><Download className="h-4 w-4" /> {busy === "final" ? "Preparing…" : "Download PDF"}</Btn>
          <Btn kind="accent" onClick={() => download("certificate")} disabled={!!busy}><Award className="h-4 w-4" /> {busy === "certificate" ? "Issuing…" : "Download certificate"}</Btn>
          <Btn kind="navy" onClick={email}><Mail className="h-4 w-4" /> Email to customer</Btn>
          {!closed && (
            confirmClose ? (
              <span className="flex items-center gap-2">
                <span className="text-sm">Close and freeze all five tabs?</span>
                <Btn kind="danger" onClick={close} disabled={!!busy}>Yes, close</Btn>
                <Btn kind="ghost" style={{ color: "var(--rmn-ink)" }} onClick={() => setConfirmClose(false)}>Cancel</Btn>
              </span>
            ) : (
              <Btn kind="ghost" style={{ color: "var(--rmn-ink)" }} onClick={() => setConfirmClose(true)}>Close engagement</Btn>
            )
          )}
        </div>
        {certificates.length > 0 && (
          <p className="rmn-label mt-3">Certificates issued: {certificates.map((c) => c.certificate_code).join(", ")}</p>
        )}
        {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      </Card>
    </div>
  );
}
