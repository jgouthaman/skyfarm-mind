import { createFileRoute } from "@tanstack/react-router";
import { assertConceptOwnership } from "@/lib/the-hangar/conceptAgentPipeline";
import { bay3FilesBaseUrl, findDesignFiles } from "@/lib/the-hangar/designFileServer";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bay 03: the Python Vehicle Design backend's output for one concept, read
// from the TorqWings GCP server (designFileServer.ts findDesignFiles):
//   <HANGAR_BAY3_FILES_URL>/<concept code>/final_aircraft_design.{json,md}
// Always 200 for "found" and "not there yet" so the page can tell them apart:
//   GET ?conceptId= -> { found, design?, markdown?, location }
export const Route = createFileRoute("/api/hangar/vehicle-design-files")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          const conceptId = new URL(request.url).searchParams.get("conceptId") ?? "";
          if (!conceptId) return jsonResponse({ error: "conceptId is required" }, 400);
          const concept = await assertConceptOwnership(conceptId, userId);
          const base = bay3FilesBaseUrl();

          const found = await findDesignFiles(concept.concept_code, concept.id);
          if (!found) {
            return jsonResponse({
              found: false,
              location: { server: base, folder: concept.concept_code, files: ["final_aircraft_design.json", "final_aircraft_design.md"] },
            });
          }
          return jsonResponse({
            found: true,
            design: found.design,
            markdown: found.markdown,
            location: { server: base, folder: found.folder, files: found.files, updated: found.updated },
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
