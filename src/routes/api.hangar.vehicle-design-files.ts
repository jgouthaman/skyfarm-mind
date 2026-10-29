import { createFileRoute } from "@tanstack/react-router";
import { assertConceptOwnership } from "@/lib/the-hangar/conceptAgentPipeline";
import { bay3FilesBaseUrl, readDesignFile } from "@/lib/the-hangar/designFileServer";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bay 03: the Python Vehicle Design backend's output for one concept, read
// from the TorqWings GCP server (designFileServer.ts):
//   <HANGAR_BAY3_FILES_URL>/<concept code>/final_aircraft_design.{json,md}
// (the folder may also be C-<code> or the concept's UUID, and the files may be
// named <code>_aircraft_design.{json,md}). Always 200 for "found"
// and "not there yet" so the page can tell them apart:
//   GET ?conceptId= -> { found, design?, markdown?, location }
const FILES = { json: "final_aircraft_design.json", md: "final_aircraft_design.md" };

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

          const code = concept.concept_code;
          // Either name works inside the folder: the backend's default, or one
          // prefixed with the concept code.
          const stems = ["final_aircraft_design", `${code}_aircraft_design`];
          for (const folder of [code, `C-${code}`, concept.id]) {
            let json = null;
            let stem = stems[0];
            for (stem of stems) {
              json = await readDesignFile(folder, `${stem}.json`);
              if (json) break;
            }
            if (!json) continue;
            const md = await readDesignFile(folder, `${stem}.md`);
            let design: unknown;
            try {
              design = JSON.parse(json.text);
            } catch {
              return jsonResponse({ error: `${base}/${folder}/${stem}.json is not valid JSON` }, 422);
            }
            return jsonResponse({
              found: true,
              design,
              markdown: md?.text ?? null,
              location: { server: base, folder, files: [`${stem}.json`, `${stem}.md`], updated: json.updated },
            });
          }
          return jsonResponse({
            found: false,
            location: { server: base, folder: concept.concept_code, files: Object.values(FILES) },
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
    },
  },
});
