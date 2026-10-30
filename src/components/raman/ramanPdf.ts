import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { EngagementBundle, ReportData } from "@/lib/raman/ramanBrowserApi";
import type {
  RamanBreakdownPct,
  RamanDesignChanges,
  RamanFixPredictionResult,
  RamanNoiseCheckResult,
  RamanVerdict,
} from "@/lib/raman/ramanTypes";

// Raman PDFs, drawn in the browser with jsPDF: the one-page Noise Check
// report (spec §0 "Spiral 1 report"), the final before/after report and the
// Acoustic Assessment Certificate (§0.5). Every number is copied from the
// engine results stored with the engagement. Wording says predicted and
// assessed -- never "certified compliant".

type RGB = [number, number, number];
const NAVY: RGB = [11, 31, 51];
const INK: RGB = [8, 19, 31];
const DIM: RGB = [79, 107, 128];
const HAIR: RGB = [220, 229, 236];
const AMBER: RGB = [232, 163, 61];
const GOLD: RGB = [184, 134, 11];
const VERDICT_RGB: Record<RamanVerdict, RGB> = {
  PASS: [12, 163, 12],
  WARN: [250, 178, 25],
  FAIL: [208, 59, 59],
  INFO: [79, 107, 128],
};
const SERIES: { key: "tonal" | "interaction" | "broadband" | "motor"; label: string; rgb: RGB }[] = [
  { key: "tonal", label: "Rotor hum (tonal)", rgb: [42, 120, 214] },
  { key: "interaction", label: "Interaction", rgb: [235, 104, 52] },
  { key: "broadband", label: "Hiss (broadband)", rgb: [27, 175, 122] },
  { key: "motor", label: "Motor", rgb: [237, 161, 0] },
];

const PAGE_W = 210;
const M = 16;
const CONTENT_W = PAGE_W - 2 * M;

const f1 = (v: number | null | undefined) => (v === null || v === undefined ? "--" : v.toFixed(1));
const today = (iso?: string) => new Date(iso ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 30, "F");
  // Logo placeholder: amber mark + wordmark.
  doc.setFillColor(...AMBER);
  doc.roundedRect(M, 8, 14, 14, 2, 2, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TW", M + 7, 16.6, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(title, M + 19, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, M + 19, 20.5);
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(text, M, y);
  return y + 5;
}

// jsPDF's built-in Helvetica only draws WinAnsi characters; AI-written text
// (Groq especially) uses typographic hyphens, quotes and spaces it can't.
function pdfSafe(text: string): string {
  return text
    .replace(/[‐-–]/g, "-")
    .replace(/[—―]/g, " - ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ");
}

function para(doc: jsPDF, text: string, y: number, opts: { size?: number; color?: RGB; width?: number; x?: number } = {}): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(opts.size ?? 9);
  doc.setTextColor(...(opts.color ?? INK));
  const lines = doc.splitTextToSize(pdfSafe(text), opts.width ?? CONTENT_W) as string[];
  doc.text(lines, opts.x ?? M, y);
  return y + lines.length * (opts.size ?? 9) * 0.42 + 1.5;
}

function table(doc: jsPDF, head: string[], rows: string[][], y: number, widths?: number[]): number {
  const w = widths ?? head.map(() => CONTENT_W / head.length);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DIM);
  let x = M;
  head.forEach((h, i) => {
    doc.text(h, x + 1, y);
    x += w[i];
  });
  y += 2;
  doc.setDrawColor(...HAIR);
  doc.line(M, y, M + CONTENT_W, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
  for (const r of rows) {
    y += 5;
    x = M;
    r.forEach((c, i) => {
      doc.text(c, x + 1, y);
      x += w[i];
    });
    doc.line(M, y + 1.8, M + CONTENT_W, y + 1.8);
  }
  return y + 7;
}

function verdictBanner(doc: jsPDF, verdict: RamanVerdict, headline: string, y: number): number {
  doc.setFillColor(...VERDICT_RGB[verdict]);
  doc.roundedRect(M, y, CONTENT_W, 16, 2, 2, "F");
  doc.setTextColor(...(verdict === "WARN" ? ([58, 38, 0] as RGB) : ([255, 255, 255] as RGB)));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(verdict, M + 4, y + 6);
  doc.setFontSize(13);
  doc.text(headline, M + 4, y + 12.5);
  return y + 22;
}

function breakdownBar(doc: jsPDF, pct: RamanBreakdownPct, y: number): number {
  let x = M;
  for (const s of SERIES) {
    const w = (CONTENT_W * (pct[s.key] ?? 0)) / 100;
    if (w <= 0) continue;
    doc.setFillColor(...s.rgb);
    doc.rect(x, y, w, 6, "F");
    x += w;
  }
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let lx = M;
  for (const s of SERIES) {
    doc.setFillColor(...s.rgb);
    doc.rect(lx, y - 2.6, 3, 3, "F");
    doc.setTextColor(...INK);
    const label = `${s.label} ${f1(pct[s.key])}%`;
    doc.text(label, lx + 4.5, y);
    lx += doc.getTextWidth(label) + 10;
  }
  return y + 6;
}

function footer(doc: jsPDF, text: string) {
  doc.setFontSize(7.5);
  doc.setTextColor(...DIM);
  doc.text(text, M, 290);
}

function names(b: EngagementBundle) {
  return {
    customer: b.customer ? `${b.customer.name}${b.customer.company ? `, ${b.customer.company}` : ""}` : "--",
    vehicle: b.vehicle?.name ?? "--",
    cycle: `v${b.engagement.cycle}`,
  };
}

export function changeLines(changes: RamanDesignChanges, before?: RamanNoiseCheckResult): string[] {
  const out: string[] = [];
  const r = before?.inputs_resolved;
  if (changes.prop_diameter_in !== undefined)
    out.push(`Propeller diameter${r ? ` ${(r.prop_diameter_m / 0.0254).toFixed(1)} in to` : ""} ${changes.prop_diameter_in} in`);
  if (changes.blade_count !== undefined) out.push(`Blade count${r ? ` ${r.blade_count} to` : ""} ${changes.blade_count}`);
  if (changes.hover_rpm !== undefined) out.push(`Hover RPM${before ? ` ${before.performance.hover_rpm} to` : ""} ${changes.hover_rpm}`);
  if (changes.tip_speed_ms !== undefined) out.push(`Tip speed ${changes.tip_speed_ms} m/s`);
  if (changes.rotor_spacing_m !== undefined) out.push(`Rotor spacing${r?.rotor_spacing_m ? ` ${r.rotor_spacing_m} m to` : ""} ${changes.rotor_spacing_m} m`);
  if (changes.arm_clearance_ratio !== undefined) out.push(`Rotor-to-arm clearance${r ? ` ${r.arm_clearance_ratio} to` : ""} ${changes.arm_clearance_ratio} x diameter`);
  return out;
}

// ── Noise Check report (one page) ────────────────────────────────────────

export function checkReportPdf(b: EngagementBundle): jsPDF {
  const check = b.baseline!;
  const r = check.result as RamanNoiseCheckResult;
  const n = names(b);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "TorqWings · Raman Noise Check", "Early-Stage Noise Estimate (not a certified measurement)");

  let y = 38;
  y = para(doc, `Customer: ${n.customer}    Vehicle: ${n.vehicle}    Cycle: ${n.cycle}    Date: ${today(check.issued_at)}`, y, { color: DIM });
  y = verdictBanner(doc, r.verdict, r.headline, y + 2);

  y = sectionTitle(doc, "Noise by distance (dBA)", y);
  y = table(
    doc,
    ["Distance", "Hover", "Cruise"],
    r.levels_by_distance.map((row) => [`${row.distance_m} m`, f1(row.hover_dba), f1(row.cruise_dba)]),
    y,
  );

  y = sectionTitle(doc, "Where the noise comes from (hover, % of sound energy)", y);
  y = breakdownBar(doc, r.hover.breakdown_pct, y + 1);

  y = sectionTitle(doc, "What's driving it", y + 2);
  for (const d of r.drivers) y = para(doc, `- ${d.message}`, y);
  if (check.summary_text) {
    y = para(doc, check.summary_text, y + 1);
    const via = check.summary_provider === "groq" ? "Groq" : check.summary_provider === "anthropic" ? "Claude" : null;
    y = para(
      doc,
      check.summary_source_was_mock || !via ? "(Engine text -- no AI provider answered)" : `(Summary written via ${via} from the computed numbers)`,
      y,
      { size: 7.5, color: DIM },
    );
  }

  y = sectionTitle(doc, "Assumptions and accuracy", y + 2);
  for (const a of r.assumptions) y = para(doc, `- ${a}`, y, { size: 8 });
  y = para(doc, `Excluded sources: ${r.excluded_sources.join("; ")}.`, y + 1, { size: 8, color: DIM });
  y = para(doc, `Confidence score ${r.confidence_score.toFixed(2)}. Early-stage estimate, about ±5 dB. Not a measured or certified value.`, y, { size: 8 });

  y = sectionTitle(doc, "Next step", y + 2);
  para(doc, "Book a Raman Noise Fix to find out how to reduce it.", y);
  footer(doc, `Raman engine ${r.engine_version} · TorqWings · Predicted by software analysis`);
  return doc;
}

// ── Final before/after report ────────────────────────────────────────────

function afterOf(d: ReportData) {
  return d.fix_prediction!.result as RamanFixPredictionResult;
}

export function finalReportPdf(d: ReportData): jsPDF {
  const before = d.baseline!.result as RamanNoiseCheckResult;
  const after = afterOf(d);
  const n = names(d);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, "TorqWings · Raman Final Report", "Before and after -- predicted, not measured");

  let y = 38;
  y = para(doc, `Customer: ${n.customer}    Vehicle: ${n.vehicle}    Cycle: ${n.cycle}    Date: ${today(d.report.issued_at)}`, y, { color: DIM });
  const headline = `${f1(after.baseline_dba)} to ${f1(after.predicted_dba)} dBA at ${after.target_distance_m} m in hover, ${f1(Math.abs(after.delta_db))} dB ${after.delta_db <= 0 ? "quieter" : "louder"}, ${after.verdict}`;
  y = verdictBanner(doc, after.verdict, headline, y + 2);

  y = sectionTitle(doc, "Changes locked", y);
  for (const line of changeLines(d.locked_run?.locked_design ?? {}, before)) y = para(doc, `- ${line}`, y);
  const t = after.tradeoffs;
  y = para(
    doc,
    `Trade-offs: added mass ${f1(t.added_mass_g)} g, flight time ${f1(t.flight_time_change_pct)}%, efficiency ${f1(t.efficiency_change_pct)}%, thrust-to-weight ${t.thrust_to_weight}.`,
    y + 1,
  );

  y = sectionTitle(doc, "Levels before and after (dBA)", y + 3);
  const afterLevels = new Map(after.noise_check.levels_by_distance.map((r) => [r.distance_m, r]));
  y = table(
    doc,
    ["Distance", "Hover before", "Hover after", "Cruise before", "Cruise after"],
    before.levels_by_distance.map((r) => [
      `${r.distance_m} m`,
      f1(r.hover_dba),
      f1(afterLevels.get(r.distance_m)?.hover_dba),
      f1(r.cruise_dba),
      f1(afterLevels.get(r.distance_m)?.cruise_dba),
    ]),
    y,
  );

  const run = d.locked_run;
  if (run) {
    y = sectionTitle(doc, "How the fix was found", y);
    y = para(
      doc,
      `${run.source_was_mock ? "Rule-based fallback planner (not agentic)" : `Raman Noise Fix agent (via ${run.model?.startsWith("claude") ? "Claude" : "Groq"})`}; ${run.ranked_options?.length ?? 0} ranked options. ${(run.stop_reason ?? "").replace(/^[a-z_]+: /, "")}`,
      y,
      { size: 8.5 },
    );
  }
  y = para(doc, "A 10 dB reduction sounds about half as loud.", y + 3, { size: 8.5 });
  para(doc, "Predicted by software analysis, accuracy about ±5 dB. Not a measured or regulatory certification.", y, { size: 8.5, color: DIM });
  footer(doc, `Raman engine ${after.engine_version} · TorqWings`);
  return doc;
}

// ── Certificate ──────────────────────────────────────────────────────────

export async function certificatePdf(d: ReportData, origin: string): Promise<jsPDF> {
  const before = d.baseline!.result as RamanNoiseCheckResult;
  const after = afterOf(d);
  const n = names(d);
  const code = d.report.certificate_code ?? "";
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 38, "F");
  doc.setFillColor(...AMBER);
  doc.roundedRect(M, 9, 18, 18, 2, 2, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TW", M + 9, 20, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text("TorqWings Raman Acoustic Assessment Certificate", M + 23, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Raman · UAV Noise Intelligence", M + 23, 24.5);

  let y = 48;
  doc.setTextColor(...INK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Certificate ID: ${code}`, M, y);
  doc.setFont("helvetica", "normal");
  doc.text(`Issued: ${today(d.report.issued_at)}    Cycle: ${n.cycle}`, PAGE_W - M, y, { align: "right" });
  y += 7;
  y = para(doc, `Customer: ${n.customer}`, y, { size: 10 });
  y = para(doc, `Vehicle: ${n.vehicle}    Take-off mass: ${before.inputs_resolved.take_off_mass_kg} kg`, y, { size: 10 });

  // Before / after boxes with the reduction between them.
  y += 3;
  const boxW = 70;
  const boxH = 34;
  doc.setFillColor(...VERDICT_RGB[before.verdict]);
  doc.roundedRect(M, y, boxW, boxH, 3, 3, "F");
  doc.setTextColor(...(before.verdict === "WARN" ? ([58, 38, 0] as RGB) : ([255, 255, 255] as RGB)));
  doc.setFontSize(9);
  doc.text(`BEFORE · assessed (${before.verdict})`, M + 4, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`${f1(after.baseline_dba)} dBA`, M + 4, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`at ${after.target_distance_m} m in hover`, M + 4, y + 28);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`${f1(Math.abs(after.delta_db))} dB`, PAGE_W / 2, y + 17, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(after.delta_db <= 0 ? "quieter" : "louder", PAGE_W / 2, y + 23, { align: "center" });

  doc.setFillColor(...NAVY);
  doc.roundedRect(PAGE_W - M - boxW, y, boxW, boxH, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("PREDICTED AFTER", PAGE_W - M - boxW + 4, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(`${f1(after.predicted_dba)} dBA`, PAGE_W - M - boxW + 4, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`at ${after.target_distance_m} m in hover`, PAGE_W - M - boxW + 4, y + 28);
  y += boxH + 9;

  y = sectionTitle(doc, "Levels before and after (dBA)", y);
  const afterLevels = new Map(after.noise_check.levels_by_distance.map((r) => [r.distance_m, r]));
  y = table(
    doc,
    ["Distance", "Hover before", "Hover after", "Cruise before", "Cruise after"],
    before.levels_by_distance
      .filter((r) => [10, 30, 100].includes(r.distance_m))
      .map((r) => [
        `${r.distance_m} m`,
        f1(r.hover_dba),
        f1(afterLevels.get(r.distance_m)?.hover_dba),
        f1(r.cruise_dba),
        f1(afterLevels.get(r.distance_m)?.cruise_dba),
      ]),
    y,
  );

  y = sectionTitle(doc, "TorqWings assessed the design and recommended these changes", y);
  for (const line of changeLines(d.locked_run?.locked_design ?? {}, before)) y = para(doc, `- ${line}`, y, { size: 9.5 });
  const t = after.tradeoffs;
  y = para(doc, `Trade-offs: added mass ${f1(t.added_mass_g)} g, flight time ${f1(t.flight_time_change_pct)}%, efficiency ${f1(t.efficiency_change_pct)}%.`, y + 1);

  y += 3;
  y = para(
    doc,
    "TorqWings has assessed this vehicle design using the Raman acoustic engine and recommended the changes above. Noise levels are predictions from engineering analysis, accurate to about ±5 dB. They are not measured values and do not certify regulatory compliance.",
    y,
    { size: 9, color: DIM },
  );

  // Gold seal, bottom-left.
  const sx = M + 22;
  const sy = 252;
  doc.setDrawColor(...GOLD);
  doc.setFillColor(250, 240, 210);
  doc.setLineWidth(1.2);
  doc.circle(sx, sy, 20, "FD");
  doc.setLineWidth(0.4);
  doc.circle(sx, sy, 16.5, "S");
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TorqWings", sx, sy - 7, { align: "center" });
  doc.setFontSize(10);
  doc.text("RAMAN", sx, sy - 1, { align: "center" });
  doc.setFontSize(7);
  doc.text("Assessed", sx, sy + 5, { align: "center" });
  doc.text("Acoustic", sx, sy + 10, { align: "center" });

  // Signature line.
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 - 25, 262, PAGE_W / 2 + 35, 262);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("For TorqWings", PAGE_W / 2 + 5, 267, { align: "center" });

  // QR code to the verify page.
  const qr = await QRCode.toDataURL(`${origin}/mission-hub/raman/verify/${code}`, { margin: 1, width: 240 });
  doc.addImage(qr, "PNG", PAGE_W - M - 30, 236, 30, 30);
  doc.setFontSize(7);
  doc.setTextColor(...DIM);
  doc.text(code, PAGE_W - M - 15, 270, { align: "center" });

  footer(doc, `Raman engine ${after.engine_version} · Predicted and assessed, not measured · Verify at ${origin}/mission-hub/raman/verify/${code}`);
  return doc;
}

// Draft email for "Email to customer" (stub: copied to the clipboard).
export function emailDraft(b: EngagementBundle, kind: "check" | "final"): string {
  const r = b.baseline?.result as RamanNoiseCheckResult | undefined;
  const after = b.fix_prediction?.result as RamanFixPredictionResult | undefined;
  const who = b.customer?.name ?? "there";
  const lines = [
    `Hi ${who},`,
    "",
    kind === "check"
      ? `Thank you for your call. Here is the Raman Noise Check for ${b.vehicle?.name ?? "your vehicle"}: ${r?.headline ?? ""} (${r?.verdict ?? ""}).`
      : `Here is the Raman final report for ${b.vehicle?.name ?? "your vehicle"}: ${f1(after?.baseline_dba)} to ${f1(after?.predicted_dba)} dBA at ${after?.target_distance_m ?? 10} m in hover (predicted).`,
    "",
    "The PDF is attached. These are early-stage predictions from engineering analysis, accurate to about ±5 dB, not measured values.",
    kind === "check" ? "If you'd like to know how to reduce it, we can book a Raman Noise Fix." : "",
    "",
    "Best regards,",
    "TorqWings",
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
