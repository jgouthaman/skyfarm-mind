// Document intake (MissionAgent.md Section 3, source 2 — "Mission Brief /
// Goals" as an uploaded document). Server-only: text is extracted here, not
// in the browser, so the heavy PDF/DOCX libraries never ship to the client.
//
// Unlike market-data links (marketDataFetch.ts), the uploaded file is the
// USER'S OWN content — same trust level as the natural-language brief they'd
// otherwise type, not third-party web text — so no "untrusted reference data"
// framing is needed in the prompt; it's folded into rawTextCombined exactly
// like typed text (missionSourceParsing.ts already does this once
// raw_input.extractedText is set).
//
// What IS still enforced, because the input is an uploaded file rather than a
// text box: file size, file type (checked by magic bytes, not by the
// browser-supplied MIME type or file extension, either of which can be
// wrong), a hard extraction timeout, and a cap on how much extracted text is
// kept — the same "don't let one source blow up the prompt" rule
// marketDataFetch.ts applies to a fetched page.

export const DOCUMENT_LIMITS = {
  // Vercel's Node serverless functions hard-cap the request body around
  // 4.5 MB regardless of any limit set here — stay comfortably under that
  // (multipart adds its own overhead) rather than accept a size the platform
  // would reject before this code ever runs, with a raw 413 instead of the
  // route's own JSON error.
  maxBytes: 4 * 1024 * 1024, // 4 MB
  maxChars: 20_000,
  timeoutMs: 15_000,
} as const;

export type DocumentKind = "pdf" | "docx" | "txt";

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // docx is a zip package ("PK\x03\x04")

// Plain text has no magic number, so it's recognised by elimination: not a
// PDF or docx by their real signatures, decodes as valid UTF-8 (rejects
// arbitrary binary — an image or a corrupt file would fail this), and isn't
// mostly control characters (rejects binary that happens to decode as UTF-8
// by coincidence). Sampled, not scanned whole, since this only needs to be
// good enough to reject non-text, not a full validator.
function looksLikePlainText(bytes: Uint8Array): boolean {
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, 8192));
  } catch {
    return false;
  }
  if (decoded.length === 0) return false;
  let controlChars = 0;
  for (const ch of decoded) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && ch !== "\n" && ch !== "\r" && ch !== "\t") controlChars++;
  }
  return controlChars / decoded.length < 0.01;
}

// Sniffs the real file type from its bytes — a browser-supplied MIME type or
// a ".pdf"/".docx"/".txt" extension is just a label the client chose and
// can't be trusted to match the content.
export function detectDocumentKind(bytes: Uint8Array): DocumentKind | null {
  if (PDF_MAGIC.every((b, i) => bytes[i] === b)) return "pdf";
  if (ZIP_MAGIC.every((b, i) => bytes[i] === b)) return "docx"; // good enough: only docx is offered
  if (looksLikePlainText(bytes)) return "txt";
  return null;
}

export function truncateExtractedText(text: string, max: number): { text: string; truncated: boolean } {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length <= max
    ? { text: collapsed, truncated: false }
    : { text: collapsed.slice(0, max), truncated: true };
}

export interface DocumentExtractionResult {
  status: "ok" | "failed";
  reason?: string;
  kind: DocumentKind | null;
  fileName: string;
  text: string;
  truncated: boolean;
}

const failed = (
  fileName: string,
  reason: string,
  kind: DocumentKind | null = null,
): DocumentExtractionResult => ({ status: "failed", reason, kind, fileName, text: "", truncated: false });

// Never throws: a document that can't be read must not fail the mission — the
// caller just gets nothing to add from this source, same contract as
// fetchMarketDataText.
export async function extractDocumentText(
  fileName: string,
  bytes: Uint8Array,
): Promise<DocumentExtractionResult> {
  if (bytes.length === 0) return failed(fileName, "the file is empty");
  if (bytes.length > DOCUMENT_LIMITS.maxBytes) {
    return failed(fileName, `file is larger than ${DOCUMENT_LIMITS.maxBytes / (1024 * 1024)} MB`);
  }

  const kind = detectDocumentKind(bytes);
  if (!kind) {
    return failed(fileName, "unsupported file type — only PDF, Word (.docx) and plain text are accepted");
  }

  const withTimeout = <T>(p: Promise<T>): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), DOCUMENT_LIMITS.timeoutMs),
      ),
    ]);

  try {
    const raw =
      kind === "pdf"
        ? await withTimeout(extractPdfText(bytes))
        : kind === "docx"
          ? await withTimeout(extractDocxText(bytes))
          : new TextDecoder("utf-8").decode(bytes);
    if (!raw.trim()) return failed(fileName, "no readable text was found in the file", kind);
    const { text, truncated } = truncateExtractedText(raw, DOCUMENT_LIMITS.maxChars);
    return { status: "ok", kind, fileName, text, truncated };
  } catch (err) {
    const reason = err instanceof Error && err.message === "timeout" ? "took too long to process" : "could not be read";
    return failed(fileName, reason, kind);
  }
}

// Each extractor is imported dynamically so the (fairly large) parsing
// libraries only load when a document is actually uploaded, same lazy-load
// reasoning missionExport.ts uses for jsPDF/docx/write-excel-file — except
// this code runs server-side, so it's about function cold-start size, not
// browser bundle size.
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // pdf-parse v2's API: a PDFParse instance you load once and must destroy —
  // not the v1 default-export function some older examples show.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result.value;
}
