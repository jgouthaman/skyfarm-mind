import { createFileRoute } from "@tanstack/react-router";
import { storeDocumentFile } from "@/lib/the-hangar/documentStorage";
import { getMission } from "@/lib/the-hangar/missionPersistence";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Persists the original uploaded document to Supabase Storage (bucket
// BK_HangarMission, key `<missionId>.<ext>`) — a separate call from
// /api/hangar/extract-document, made once Stage 1 has returned a missionId to
// name the file after. See documentStorage.ts for why the two are split.
export const Route = createFileRoute("/api/hangar/store-document")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const form = await request.formData();
          const missionId = form.get("missionId");
          const file = form.get("file");
          if (typeof missionId !== "string" || !missionId) {
            return jsonResponse({ error: "Request must include `missionId`" }, 400);
          }
          if (!(file instanceof File)) {
            return jsonResponse({ error: "Request must include a `file` field" }, 400);
          }
          // Same "don't reveal which ids exist" ownership check used
          // throughout the pipeline (missionAgentPipeline.ts's
          // assertMissionOwnership) — missing and not-owned share one message.
          const mission = await getMission(missionId);
          if (!mission || mission.user_id !== userId) {
            return jsonResponse({ error: "Mission not found" }, 400);
          }

          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await storeDocumentFile(missionId, bytes);
          if (result.status !== "stored") {
            return jsonResponse({ error: result.reason ?? "Could not store the file" }, 400);
          }
          return jsonResponse({ path: result.path });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
