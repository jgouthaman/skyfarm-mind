import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DOCUMENT_LIMITS, detectDocumentKind, type DocumentKind } from "./documentExtraction.ts";

// Persists the ORIGINAL uploaded document (documentExtraction.ts only keeps
// its extracted text) to Supabase Storage, once a mission id exists to name
// it after. Deliberately simple: the key IS the mission id — one document per
// mission (the intake panel offers a single upload slot), no separate
// metadata table, no Hangar_mission_documents (the spec's Section 10 design).
// "How is it linked to the mission" is answered by the key itself:
// `<missionId>.<ext>` in this one bucket.
//
// Called after Stage 1 has already created the Hangar_missions row (the-hangar
// mission.tsx, right after runStage1/runFullPipeline get a missionId back) —
// never before, since there's nothing to name the file after yet. Best-effort:
// a failed store never fails the mission, same contract as the audit log and
// event publish — the mission already has its extracted text either way.

export const DOCUMENT_BUCKET = "BK_HangarMission";

const CONTENT_TYPE: Record<DocumentKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

export function documentStoragePath(missionId: string, kind: DocumentKind): string {
  return `${missionId}.${kind}`;
}

export interface DocumentStoreResult {
  status: "stored" | "failed";
  path?: string;
  reason?: string;
}

export async function storeDocumentFile(
  missionId: string,
  bytes: Uint8Array,
): Promise<DocumentStoreResult> {
  if (bytes.length === 0) return { status: "failed", reason: "the file is empty" };
  if (bytes.length > DOCUMENT_LIMITS.maxBytes) {
    return { status: "failed", reason: `file is larger than ${DOCUMENT_LIMITS.maxBytes / (1024 * 1024)} MB` };
  }
  // Re-detected here rather than trusted from the caller — same reasoning as
  // documentExtraction.ts: content decides the type, not a client-supplied
  // name or MIME type.
  const kind = detectDocumentKind(bytes);
  if (!kind) return { status: "failed", reason: "unsupported file type" };

  const path = documentStoragePath(missionId, kind);
  try {
    // upsert: true — a resubmitted mission (Edit and regenerate) is a new
    // mission_id, so this only matters for a genuine retry of the same
    // mission_id, which should simply replace, not error.
    const { error } = await supabaseAdmin.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, Buffer.from(bytes), { contentType: CONTENT_TYPE[kind], upsert: true });
    if (error) {
      console.error(`storeDocumentFile: failed to store document for mission ${missionId}: ${error.message}`);
      return { status: "failed", reason: error.message };
    }
    return { status: "stored", path };
  } catch (err) {
    // Network/client-construction failures throw rather than returning an
    // { error } result — never let that reach the caller as an exception.
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`storeDocumentFile: failed to store document for mission ${missionId}: ${reason}`);
    return { status: "failed", reason };
  }
}
