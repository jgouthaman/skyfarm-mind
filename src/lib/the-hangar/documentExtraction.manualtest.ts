// Manual verification script for documentExtraction.ts. Builds REAL PDF and
// DOCX files in Node (jsPDF / docx — the same libraries missionExport.ts
// already uses) and round-trips them through the real extraction libraries
// (pdf-parse, mammoth), so this isn't testing against a mock. Run directly:
//
//   node src/lib/the-hangar/documentExtraction.manualtest.ts
import {
  DOCUMENT_LIMITS,
  detectDocumentKind,
  extractDocumentText,
  truncateExtractedText,
} from "./documentExtraction.ts";

let passCount = 0;
let failCount = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) {
    console.log(`      expected: ${JSON.stringify(expected)}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
  }
  pass ? passCount++ : failCount++;
}

console.log("--- detectDocumentKind (magic bytes, not extension/MIME) ---");
check("a real PDF header", detectDocumentKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])), "pdf");
check("a real zip/docx header", detectDocumentKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0])), "docx");
check("plain text is detected as txt, not pdf/docx", detectDocumentKind(new TextEncoder().encode("hello world")), "txt");
check("a JPEG header is none of the three", detectDocumentKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), null);
check("an empty buffer is none of the three", detectDocumentKind(new Uint8Array([])), null);
check(
  "renaming a text file to .pdf doesn't fool it — content decides, not the name (it's read as txt)",
  detectDocumentKind(new TextEncoder().encode("just text pretending to be a pdf")),
  "txt",
);

console.log("\n--- truncateExtractedText ---");
check("short text, untouched", truncateExtractedText("hello", 100), { text: "hello", truncated: false });
check("collapses whitespace/newlines", truncateExtractedText("a\n\n  b\t\tc", 100), { text: "a b c", truncated: false });
check("cuts at the limit and flags it", truncateExtractedText("abcdefgh", 5), { text: "abcde", truncated: true });

console.log("\n--- real PDF, generated then extracted ---");
{
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.text("TorqWings mission brief: crop monitoring over 200 hectares.", 10, 10);
  doc.text("Payload 25kg, endurance 90 minutes, budget under five lakh rupees.", 10, 20);
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  check("a real PDF is detected as pdf", detectDocumentKind(bytes), "pdf");

  const result = await extractDocumentText("brief.pdf", bytes);
  check("extraction succeeds", result.status, "ok");
  check("kind is recorded", result.kind, "pdf");
  check("the actual sentence is recovered", result.text.includes("crop monitoring over 200 hectares"), true);
  check("the second line is recovered too", result.text.includes("endurance 90 minutes"), true);
  check("not truncated (well under the cap)", result.truncated, false);
}

console.log("\n--- real DOCX, generated then extracted ---");
{
  const { Document, Packer, Paragraph, TextRun } = await import("docx");
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun("TorqWings mission brief: bridge inspection.")] }),
          new Paragraph({ children: [new TextRun("Range 15km, must operate BVLOS, DGCA registered.")] }),
        ],
      },
    ],
  });
  const bytes = new Uint8Array(await Packer.toBuffer(doc));
  check("a real docx is detected as docx", detectDocumentKind(bytes), "docx");

  const result = await extractDocumentText("brief.docx", bytes);
  check("extraction succeeds", result.status, "ok");
  check("kind is recorded", result.kind, "docx");
  check("the actual sentence is recovered", result.text.includes("bridge inspection"), true);
  check("the second paragraph is recovered too", result.text.includes("DGCA registered"), true);
}

console.log("\n--- plain text ---");
{
  const text = new TextEncoder().encode("TorqWings mission brief: pasted plain text.\nRange 8km, payload 3kg.");
  check("plain text is detected as txt", detectDocumentKind(text), "txt");
  const result = await extractDocumentText("notes.txt", text);
  check("extraction succeeds", [result.status, result.kind], ["ok", "txt"]);
  check("the text comes back verbatim (whitespace-collapsed)", result.text, "TorqWings mission brief: pasted plain text. Range 8km, payload 3kg.");
}
check("plain text with a BOM/CRLF still decodes", detectDocumentKind(new TextEncoder().encode("line one\r\nline two")), "txt");
check("valid UTF-8 with accented characters is still text", detectDocumentKind(new TextEncoder().encode("café — naïve — 日本語")), "txt");
check("an empty buffer is not text (nothing to decode)", detectDocumentKind(new TextEncoder().encode("")), null);
check(
  "binary garbage (random bytes, not valid UTF-8) is rejected, not accepted as text",
  detectDocumentKind(new Uint8Array([0xff, 0xfe, 0x00, 0x01, 0x02, 0x80, 0x81, 0x90, 0xc0, 0xc1])),
  null,
);
check(
  "a PNG header is rejected, not accepted as text",
  detectDocumentKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  null,
);
check(
  "valid-UTF8-but-mostly-control-bytes is rejected (looks binary, not text)",
  detectDocumentKind(new Uint8Array(500).fill(0x01)),
  null,
);

console.log("\n--- failure paths never throw ---");
{
  const junk = new Uint8Array([0xff, 0xfe, 0x00, 0x01, 0x02, 0x80, 0x81, 0x90, 0xc0, 0xc1]);
  const r1 = await extractDocumentText("notes.bin", junk);
  check("an unsupported type fails cleanly, not with an exception", [r1.status, r1.kind], ["failed", null]);
  check(
    "the reason is stated",
    r1.reason,
    "unsupported file type — only PDF, Word (.docx) and plain text are accepted",
  );

  const r2 = await extractDocumentText("empty.pdf", new Uint8Array([]));
  check("an empty file fails cleanly", [r2.status, r2.reason], ["failed", "the file is empty"]);

  const oversized = new Uint8Array(DOCUMENT_LIMITS.maxBytes + 1);
  oversized.set([0x25, 0x50, 0x44, 0x46]); // valid PDF header, just too big
  const r3 = await extractDocumentText("huge.pdf", oversized);
  check("an oversized file is refused before any parsing is attempted", r3.status, "failed");
  check("...for the right reason", /larger than/.test(r3.reason ?? ""), true);

  // A PDF-shaped header with garbage after it — a real file, but one the
  // parser will choke on. Confirms parser exceptions are caught, not thrown.
  const corruptPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, ...Array(200).fill(0)]);
  const r4 = await extractDocumentText("corrupt.pdf", corruptPdf);
  check("a corrupt-but-PDF-shaped file fails cleanly instead of throwing", r4.status, "failed");
  check("kind is still reported (we knew it was a PDF before parsing failed)", r4.kind, "pdf");
}

console.log("\n--- the extracted text is capped, same as a fetched market-data page ---");
{
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 10;
  for (let i = 0; i < 400; i++) {
    doc.text(`Line ${i}: filler text to push this well past the character cap for the extraction test.`, 10, y);
    y += 10;
    if (y > 280) {
      doc.addPage();
      y = 10;
    }
  }
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  const result = await extractDocumentText("long.pdf", bytes);
  check("a long document is capped at the char limit", result.text.length, DOCUMENT_LIMITS.maxChars);
  check("...and flagged truncated", result.truncated, true);
}

console.log(`\n${passCount} passed, ${failCount} failed`);
if (failCount > 0) process.exit(1);
