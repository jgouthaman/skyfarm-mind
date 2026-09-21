// Mission spec export — PDF, Word (.docx) and Excel (.xlsx) — MissionAgent.md
// Section 4.4.2. Generated in the browser on demand from the spec the
// dashboard is already showing, not by the pipeline: that keeps the export's
// content identical to what's on screen (the spec's "don't let the two
// drift" rule), needs no server-side file generation on Vercel, and reuses
// the ownership checks the spec fetch already went through.
//
// One shared model (buildMissionExportModel) feeds all three formats, so the
// section content can't diverge between them. The heavy libraries (jsPDF,
// docx, write-excel-file) are imported inside each exporter, so they only
// load when someone actually clicks Export — never with the page.
//
// Known PDF limitation: jsPDF's built-in Helvetica has no glyph for "₹" (or
// for characters like "≥" / "→"), so the PDF prints ₹ as "INR " and maps a
// few symbols to ASCII (pdfSafe). Word and Excel are Unicode and keep ₹.
// Embedding a TTF font would lift that, at the cost of a large font payload.

export interface MissionExportInput {
  missionCode: string;
  /** ISO timestamp the spec was generated; null when unknown. */
  generatedAt: string | null;
  confidenceScore: number;
  /** Persisted spec version, when known — appears in the footer and file name. */
  version: number | null;
  missionSpecs: {
    domain: string;
    vertical: string | null;
    vehicleClass: string | null;
    missionType: string;
    phase: string;
    operatingEnvironment: string | null;
  };
  summary: string;
  constraints: { name: string; value: string; sources: string[] }[];
  kpis: { name: string; target: string; unit: string; priority: "critical" | number }[];
  validationFlags: string[];
}

// ── Shared KPI display rules (also used by the dashboard) ────────────────

// TorqWings' missions are all India-based (Tamil Nadu, DGCA, etc.) — any
// cost/budget-named KPI should read in ₹/INR regardless of what unit the
// LLM happened to pick, so this overrides the display rather than trusting
// the model's own unit choice.
export function isCostKpi(name: string, unit: string): boolean {
  return /cost|budget|price/i.test(name) && !/₹|inr/i.test(unit);
}

export function formatKpiDisplay(name: string, target: string, unit: string): string {
  if (isCostKpi(name, unit)) {
    return `₹${target}`;
  }
  return `${target} ${unit}`;
}

// Critical (gate-tier) KPIs first, then the ranked ones by ascending
// priority number — the dashboard's KpisSection order.
export function orderKpis<T extends { priority: "critical" | number }>(kpis: T[]): T[] {
  const critical = kpis.filter((k) => k.priority === "critical");
  const ranked = kpis
    .filter((k) => k.priority !== "critical")
    .sort((a, b) => (a.priority as number) - (b.priority as number));
  return [...critical, ...ranked];
}

// ── Shared model ─────────────────────────────────────────────────────────

export interface MissionExportModel {
  brand: string;
  missionCode: string;
  missionType: string;
  generatedLabel: string | null;
  confidenceScore: number;
  confidenceLabel: string;
  version: number | null;
  summary: string;
  specRows: { label: string; value: string }[];
  constraints: { name: string; value: string; sources: string }[];
  kpis: {
    tier: string;
    critical: boolean;
    name: string;
    /** Unit-aware display, e.g. "12 kg" or "₹500000". */
    display: string;
    target: string;
    unit: string;
    priority: "critical" | number;
  }[];
  validationNotes: string[];
  footer: string;
  fileBase: string;
}

const NONE = "—";

export function buildMissionExportModel(input: MissionExportInput): MissionExportModel {
  const s = input.missionSpecs;
  const version = input.version;
  return {
    brand: "TorqWings — The Hangar",
    missionCode: input.missionCode,
    missionType: s.missionType,
    generatedLabel: input.generatedAt
      ? new Date(input.generatedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null,
    confidenceScore: input.confidenceScore,
    confidenceLabel: `${Math.round(input.confidenceScore * 100)}%`,
    version,
    summary: input.summary,
    specRows: [
      { label: "Domain", value: s.domain || NONE },
      { label: "Vertical", value: s.vertical ?? NONE },
      { label: "Vehicle Class", value: s.vehicleClass ?? NONE },
      { label: "Mission Type", value: s.missionType || NONE },
      { label: "Phase", value: s.phase || NONE },
      { label: "Operating Environment", value: s.operatingEnvironment ?? NONE },
    ],
    constraints: input.constraints.map((c) => ({
      name: c.name,
      value: c.value,
      sources: c.sources.join(", "),
    })),
    kpis: orderKpis(input.kpis).map((k) => ({
      tier: k.priority === "critical" ? "GATE" : `P${k.priority}`,
      critical: k.priority === "critical",
      name: k.name,
      display: formatKpiDisplay(k.name, k.target, k.unit),
      target: k.target,
      unit: isCostKpi(k.name, k.unit) ? "₹" : k.unit,
      priority: k.priority,
    })),
    validationNotes: input.validationFlags,
    footer: `Generated by Mission Agent — Bay 01, The Hangar.${version !== null ? ` Version ${version}.` : ""}`,
    fileBase: `${input.missionCode.replace(/[^A-Za-z0-9_-]+/g, "_")}-mission-spec${
      version !== null ? `-v${version}` : ""
    }`,
  };
}

export type MissionExportFormat = "pdf" | "docx" | "xlsx";

export const EXPORT_FORMAT_META: Record<
  MissionExportFormat,
  { label: string; ext: string; mime: string }
> = {
  pdf: { label: "PDF", ext: "pdf", mime: "application/pdf" },
  docx: {
    label: "Word",
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xlsx: {
    label: "Excel",
    ext: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
};

// ── PDF ──────────────────────────────────────────────────────────────────

// jsPDF's standard fonts cover Latin-1 plus a few Windows-1252 extras; map
// what mission text realistically contains outside that to ASCII, and turn
// anything else non-Latin-1 into "?" rather than emit a garbled glyph.
const PDF_REPLACEMENTS: [RegExp, string][] = [
  [/₹/g, "INR "],
  [/[—–]/g, "-"],
  [/[‘’]/g, "'"],
  [/[“”]/g, '"'],
  [/≥/g, ">="],
  [/≤/g, "<="],
  [/→/g, "->"],
  [/≈/g, "~"],
  [/…/g, "..."],
];

export function pdfSafe(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PDF_REPLACEMENTS) out = out.replace(pattern, replacement);
  return out.replace(/[^\x00-\xFF]/g, "?");
}

export async function exportMissionPdf(model: MissionExportModel): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  const footerReserve = 30;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - footerReserve) {
      doc.addPage();
      y = margin;
    }
  };
  const heading = (text: string) => {
    ensureSpace(34);
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(20, 40, 70);
    doc.text(pdfSafe(text), margin, y);
    y += 8;
    doc.setDrawColor(200, 205, 215).line(margin, y, pageW - margin, y);
    y += 14;
  };
  const tableEnd = () =>
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 22;

  // Cover / header
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(120, 130, 150);
  doc.text(pdfSafe(model.brand.toUpperCase()), margin, y);
  y += 22;
  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(20, 40, 70);
  const titleLines = doc.splitTextToSize(pdfSafe(model.missionType), contentW) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(90, 100, 120);
  const meta = [
    model.missionCode,
    model.generatedLabel ? `Generated ${model.generatedLabel}` : null,
    `Confidence ${model.confidenceLabel}`,
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(pdfSafe(meta), margin, y);
  y += 30;

  // Mission Summary
  heading("Mission Summary");
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(40, 45, 55);
  for (const line of doc.splitTextToSize(pdfSafe(model.summary), contentW) as string[]) {
    ensureSpace(14);
    doc.text(line, margin, y);
    y += 14;
  }
  y += 14;

  const baseTable = {
    margin: { left: margin, right: margin },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 5, textColor: [40, 45, 55] as [number, number, number] },
    headStyles: { fillColor: [20, 40, 70] as [number, number, number], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 248, 251] as [number, number, number] },
  };

  // Mission Specification
  heading("Mission Specification");
  autoTable(doc, {
    ...baseTable,
    startY: y,
    head: [["Field", "Value"]],
    body: model.specRows.map((r) => [pdfSafe(r.label), pdfSafe(r.value)]),
    columnStyles: { 0: { cellWidth: 150, fontStyle: "bold" } },
  });
  y = tableEnd();

  // Constraints
  ensureSpace(60);
  heading(`Constraints (${model.constraints.length})`);
  if (model.constraints.length === 0) {
    doc.setFont("helvetica", "italic").setFontSize(10).setTextColor(110, 115, 125);
    doc.text("No constraints identified.", margin, y);
    y += 24;
  } else {
    autoTable(doc, {
      ...baseTable,
      startY: y,
      head: [["Constraint", "Value", "Source tags"]],
      body: model.constraints.map((c) => [pdfSafe(c.name), pdfSafe(c.value), pdfSafe(c.sources)]),
      columnStyles: { 0: { cellWidth: 150, fontStyle: "bold" }, 2: { cellWidth: 130 } },
    });
    y = tableEnd();
  }

  // KPIs — critical (gate-tier) rows visually distinguished
  ensureSpace(60);
  heading(`KPIs & Targets (${model.kpis.length})`);
  if (model.kpis.length === 0) {
    doc.setFont("helvetica", "italic").setFontSize(10).setTextColor(110, 115, 125);
    doc.text("No KPIs derived.", margin, y);
    y += 24;
  } else {
    autoTable(doc, {
      ...baseTable,
      startY: y,
      head: [["Priority", "KPI", "Target"]],
      body: model.kpis.map((k) => [k.tier, pdfSafe(k.name), pdfSafe(k.display)]),
      columnStyles: { 0: { cellWidth: 60 } },
      didParseCell: (data) => {
        if (data.section === "body" && model.kpis[data.row.index]?.critical) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [255, 240, 205];
        }
      },
    });
    y = tableEnd();
  }

  // Validation Notes (only when present)
  if (model.validationNotes.length > 0) {
    ensureSpace(60);
    heading(`Validation Notes (${model.validationNotes.length})`);
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(40, 45, 55);
    for (const note of model.validationNotes) {
      for (const [i, line] of (doc.splitTextToSize(pdfSafe(note), contentW - 14) as string[]).entries()) {
        ensureSpace(14);
        if (i === 0) doc.text("-", margin, y);
        doc.text(line, margin + 14, y);
        y += 14;
      }
    }
  }

  // Footer + page numbers on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(130, 138, 152);
    doc.text(pdfSafe(model.footer), margin, pageH - margin + 14);
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - margin + 14, { align: "right" });
  }

  return new Blob([doc.output("arraybuffer")], { type: EXPORT_FORMAT_META.pdf.mime });
}

// ── Word ─────────────────────────────────────────────────────────────────

export async function exportMissionDocx(model: MissionExportModel): Promise<Blob> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    ShadingType,
    Footer,
    PageNumber,
    AlignmentType,
  } = await import("docx");

  const cell = (text: string, widthPct: number, opts: { bold?: boolean; fill?: string } = {}) =>
    new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: "auto" } : undefined,
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: opts.bold, color: opts.fill === "142846" ? "FFFFFF" : undefined })],
        }),
      ],
    });
  const HEAD_FILL = "142846";
  const table = (
    widths: number[],
    head: string[],
    rows: { cells: string[]; boldFirst?: boolean; fill?: string; boldAll?: boolean }[],
  ) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: head.map((h, i) => cell(h, widths[i], { bold: true, fill: HEAD_FILL })),
        }),
        ...rows.map(
          (r) =>
            new TableRow({
              children: r.cells.map((c, i) =>
                cell(c, widths[i], {
                  bold: r.boldAll || (r.boldFirst && i === 0),
                  fill: r.fill,
                }),
              ),
            }),
        ),
      ],
    });
  const h2 = (text: string) =>
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, text });
  const note = (text: string) =>
    new Paragraph({ children: [new TextRun({ text, italics: true, color: "6B7280" })] });

  const metaLine = [
    model.missionCode,
    model.generatedLabel ? `Generated ${model.generatedLabel}` : null,
    `Confidence ${model.confidenceLabel}`,
  ]
    .filter(Boolean)
    .join("   ·   ");

  const doc = new Document({
    creator: "TorqWings — The Hangar",
    title: `${model.missionType} — ${model.missionCode}`,
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${model.footer}   Page `, size: 16, color: "6B7280" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "6B7280" }),
                  new TextRun({ text: " of ", size: 16, color: "6B7280" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "6B7280" }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: model.brand.toUpperCase(), bold: true, size: 18, color: "78829A" })],
          }),
          new Paragraph({ heading: HeadingLevel.TITLE, text: model.missionType }),
          new Paragraph({ children: [new TextRun({ text: metaLine, color: "5A6478" })] }),

          h2("Mission Summary"),
          new Paragraph({ text: model.summary }),

          h2("Mission Specification"),
          table(
            [30, 70],
            ["Field", "Value"],
            model.specRows.map((r) => ({ cells: [r.label, r.value], boldFirst: true })),
          ),

          h2(`Constraints (${model.constraints.length})`),
          model.constraints.length === 0
            ? note("No constraints identified.")
            : table(
                [30, 45, 25],
                ["Constraint", "Value", "Source tags"],
                model.constraints.map((c) => ({ cells: [c.name, c.value, c.sources], boldFirst: true })),
              ),

          h2(`KPIs & Targets (${model.kpis.length})`),
          model.kpis.length === 0
            ? note("No KPIs derived.")
            : table(
                [14, 50, 36],
                ["Priority", "KPI", "Target"],
                model.kpis.map((k) => ({
                  cells: [k.tier, k.name, k.display],
                  boldAll: k.critical,
                  fill: k.critical ? "FFF0CD" : undefined,
                })),
              ),

          ...(model.validationNotes.length > 0
            ? [
                h2(`Validation Notes (${model.validationNotes.length})`),
                ...model.validationNotes.map(
                  (n) => new Paragraph({ text: n, bullet: { level: 0 } }),
                ),
              ]
            : []),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

// ── Excel ────────────────────────────────────────────────────────────────

// Tabular only, no prose formatting (§4.4.2): Overview / Constraints / KPIs.
export async function exportMissionXlsx(model: MissionExportModel): Promise<Blob> {
  const { default: writeExcelFile } = await import("write-excel-file/universal");
  const head = (...labels: string[]) =>
    labels.map((value) => ({ value, fontWeight: "bold" as const }));

  const overview: unknown[][] = [
    head("Field", "Value"),
    ["Mission code", model.missionCode],
    ["Generated", model.generatedLabel ?? NONE],
    ["Version", model.version ?? NONE],
    ["Confidence score", { value: model.confidenceScore, format: "0%" }],
    ["Summary", { value: model.summary, wrap: true }],
    ...model.specRows.map((r) => [r.label, r.value]),
  ];
  if (model.validationNotes.length > 0) {
    overview.push(["Validation notes", { value: model.validationNotes.join("\n"), wrap: true }]);
  }

  return writeExcelFile(
    [
      {
        sheet: "Overview",
        columns: [{ width: 24 }, { width: 90 }],
        data: overview as never,
      },
      {
        sheet: "Constraints",
        columns: [{ width: 34 }, { width: 50 }, { width: 40 }],
        data: [
          head("Name", "Value", "Sources"),
          ...model.constraints.map((c) => [c.name, c.value, c.sources]),
        ] as never,
      },
      {
        sheet: "KPIs",
        columns: [{ width: 34 }, { width: 16 }, { width: 12 }, { width: 12 }],
        data: [
          head("Name", "Target", "Unit", "Priority"),
          ...model.kpis.map((k) => [k.name, k.target, k.unit, k.critical ? "critical" : k.priority]),
        ] as never,
      },
    ],
  ).toBlob();
}

export async function exportMission(
  format: MissionExportFormat,
  model: MissionExportModel,
): Promise<{ blob: Blob; fileName: string }> {
  const blob =
    format === "pdf"
      ? await exportMissionPdf(model)
      : format === "docx"
        ? await exportMissionDocx(model)
        : await exportMissionXlsx(model);
  return { blob, fileName: `${model.fileBase}.${EXPORT_FORMAT_META[format].ext}` };
}

// Browser-only: hands the blob to the user as a normal file download.
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has already started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
