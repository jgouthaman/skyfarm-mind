// Bay 03 on the TorqWings GCP VM (torqwings-serv1), always server to server
// from Vercel -- the browser never calls the VM. Two things live there:
//   - the Hangar runner (scripts/hangar-gcp/hangar_runner.py, behind Apache
//     at /torqwings/api/), which runs VehicleDesign.py for a concept;
//   - the design files it produces, served by Apache:
//       <files base>/<concept code>/final_aircraft_design.{json,md}
//
// Env (Vercel Production/Preview, and .env locally):
//   HANGAR_BAY3_KEY         shared key, sent as X-Hangar-Key (required to run)
//   HANGAR_BAY3_FILES_URL   default http://34.100.231.177/torqwings/bay3
//   HANGAR_BAY3_RUNNER_URL  default http://34.100.231.177/torqwings/api

const DEFAULT_FILES_URL = "http://34.100.231.177/torqwings/bay3";
const DEFAULT_RUNNER_URL = "http://34.100.231.177/torqwings/api";
const RUN_TIMEOUT_MS = 120_000;

export function bay3FilesBaseUrl(): string {
  return (process.env.HANGAR_BAY3_FILES_URL?.trim() || DEFAULT_FILES_URL).replace(/\/+$/, "");
}

function bay3RunnerBaseUrl(): string {
  return (process.env.HANGAR_BAY3_RUNNER_URL?.trim() || DEFAULT_RUNNER_URL).replace(/\/+$/, "");
}

function keyHeader(): Record<string, string> {
  const key = process.env.HANGAR_BAY3_KEY?.trim();
  return key ? { "X-Hangar-Key": key } : {};
}

export interface DesignFile {
  text: string;
  updated: string | null;
}

// One file's contents, or null when the server says it isn't there.
export async function readDesignFile(folder: string, file: string): Promise<DesignFile | null> {
  const url = `${bay3FilesBaseUrl()}/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: keyHeader(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    throw new Error(`Couldn't reach the design file server (${bay3FilesBaseUrl()}): ${err instanceof Error ? err.message : String(err)}`);
  }
  if (res.status === 404) return null;
  if (res.status === 401 || res.status === 403) {
    throw new Error(`The design file server refused the request (HTTP ${res.status}) -- check HANGAR_BAY3_KEY.`);
  }
  if (!res.ok) throw new Error(`Reading ${url} failed: HTTP ${res.status}`);
  const lastModified = res.headers.get("last-modified");
  return { text: await res.text(), updated: lastModified ? new Date(lastModified).toISOString() : null };
}

export interface FoundDesignFiles {
  design: Record<string, unknown>;
  markdown: string | null;
  folder: string;
  files: [string, string];
  updated: string | null;
}

// A concept's design files, wherever the backend put them: folder named by
// the concept code (or C-<code>, or the concept's UUID), files named
// final_aircraft_design.* or <code>_aircraft_design.*. null when none exist.
export async function findDesignFiles(conceptCode: string, conceptId: string): Promise<FoundDesignFiles | null> {
  const stems = ["final_aircraft_design", `${conceptCode}_aircraft_design`];
  for (const folder of [conceptCode, `C-${conceptCode}`, conceptId]) {
    for (const stem of stems) {
      const json = await readDesignFile(folder, `${stem}.json`);
      if (!json) continue;
      let design: unknown;
      try {
        design = JSON.parse(json.text);
      } catch {
        throw new Error(`${bay3FilesBaseUrl()}/${folder}/${stem}.json is not valid JSON`);
      }
      if (!design || typeof design !== "object" || Array.isArray(design)) {
        throw new Error(`${bay3FilesBaseUrl()}/${folder}/${stem}.json is not a JSON object`);
      }
      const md = await readDesignFile(folder, `${stem}.md`);
      return {
        design: design as Record<string, unknown>,
        markdown: md?.text ?? null,
        folder,
        files: [`${stem}.json`, `${stem}.md`],
        updated: json.updated,
      };
    }
  }
  return null;
}

export interface VehicleDesignRunResult {
  ok: true;
  conceptCode: string;
  folder: string;
  created: boolean;
  files: string[];
}

// Runs VehicleDesign.py on the VM for one concept (creates Bay3/<code>/).
export async function runVehicleDesign(conceptCode: string, conceptId: string): Promise<VehicleDesignRunResult> {
  if (!process.env.HANGAR_BAY3_KEY?.trim()) {
    throw new Error("HANGAR_BAY3_KEY isn't set, so the GCP server won't run VehicleDesign.py. Add it to .env / Vercel.");
  }
  const url = `${bay3RunnerBaseUrl()}/run/vehicle-design`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...keyHeader() },
      body: JSON.stringify({ conceptCode, conceptId }),
      signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(`Couldn't reach the GCP runner (${bay3RunnerBaseUrl()}): ${err instanceof Error ? err.message : String(err)}`);
  }
  const json = (await res.json().catch(() => null)) as (VehicleDesignRunResult & { error?: string }) | null;
  if (res.status === 401) throw new Error("The GCP runner rejected the key -- HANGAR_BAY3_KEY must match HANGAR_KEY in runner.env.");
  if (!res.ok || !json?.ok) {
    throw new Error(`VehicleDesign.py failed on the GCP server: ${json?.error ?? `HTTP ${res.status}`}`);
  }
  return json;
}
