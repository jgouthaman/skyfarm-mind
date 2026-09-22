import { createFileRoute } from "@tanstack/react-router";
import { DOCUMENT_LIMITS, extractDocumentText } from "@/lib/the-hangar/documentExtraction";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Extracts text from an uploaded PDF, Word document or plain text file, for the intake
// panel's Document source (MissionAgent.md Section 3, source 2). The file is
// never persisted — it's read, its text extracted, and the bytes discarded;
// only the extracted text (capped, see documentExtraction.ts) travels on to
// Stage 1 as a normal "document" source, exactly like typed brief text.
export const Route = createFileRoute("/api/hangar/extract-document")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await resolveUserId(request);
          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) {
            return jsonResponse({ error: "Request must include a `file` field" }, 400);
          }
          if (file.size > DOCUMENT_LIMITS.maxBytes) {
            return jsonResponse(
              {
                error: `File is larger than ${(DOCUMENT_LIMITS.maxBytes / (1024 * 1024)).toFixed(0)} MB`,
                fileName: file.name,
              },
              400,
            );
          }

          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await extractDocumentText(file.name, bytes);
          if (result.status !== "ok") {
            return jsonResponse({ error: result.reason ?? "Could not extract text", fileName: result.fileName }, 400);
          }
          return jsonResponse({
            fileName: result.fileName,
            text: result.text,
            truncated: result.truncated,
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
