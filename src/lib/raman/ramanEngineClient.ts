import { randomUUID } from "node:crypto";
import { bay3RunnerBaseUrl, keyHeader } from "@/lib/the-hangar/designFileServer";
import type {
  RamanEngineErrorBody,
  RamanEngineFunction,
  RamanFieldError,
  RamanResultByFunction,
} from "./ramanTypes";

// The only code that calls the Raman engine. Server to server: Vercel ->
// hangar_runner.py on the GCP VM (behind Apache at /torqwings/api/), the
// same runner and env vars as the Vehicle Agent (designFileServer.ts):
//   HANGAR_BAY3_RUNNER_URL  base URL, default http://34.100.231.177/torqwings/api
//   HANGAR_BAY3_KEY         shared key, sent as X-Hangar-Key
// POST <base>/run/raman  {function, payload, request_id}
//   200 -> engine JSON + ok:true
//   400 -> input errors with `fields`   401 -> bad key   500 -> engine failure

const TIMEOUT_MS = 20_000;

// Input the engine rejected -- `fields` passes the engine's per-field
// messages straight through so the UI can show them inline.
export class RamanInputError extends Error {
  constructor(
    message: string,
    readonly fields: RamanFieldError[] = [],
  ) {
    super(message);
  }
}

// Anything else that kept the engine from answering (unreachable, bad key,
// engine crash, unexpected response).
export class RamanEngineError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
  }
}

export async function callRamanEngine<F extends RamanEngineFunction>(
  fn: F,
  payload: unknown,
): Promise<RamanResultByFunction[F]> {
  if (!process.env.HANGAR_BAY3_KEY?.trim()) {
    throw new RamanEngineError("HANGAR_BAY3_KEY isn't set, so the GCP runner won't run the Raman engine. Add it to .env / Vercel.");
  }
  const url = `${bay3RunnerBaseUrl()}/run/raman`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...keyHeader() },
      body: JSON.stringify({ function: fn, payload: payload ?? {}, request_id: randomUUID() }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new RamanEngineError(
      `Couldn't reach the Raman engine (${bay3RunnerBaseUrl()}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const json = (await res.json().catch(() => null)) as
    | (RamanResultByFunction[F] & { ok?: boolean })
    | (RamanEngineErrorBody & { ok?: boolean })
    | null;

  if (res.status === 401) {
    throw new RamanEngineError("The GCP runner rejected the key -- HANGAR_BAY3_KEY must match HANGAR_KEY in runner.env.", 401);
  }
  if (!json) throw new RamanEngineError(`The Raman engine returned no JSON (HTTP ${res.status}).`, res.status);

  if (json.status === "error" || json.ok === false || !res.ok) {
    const body = json as RamanEngineErrorBody;
    if (res.status === 400 || body.error === "invalid_input") {
      throw new RamanInputError(body.message || "The engine rejected these inputs.", body.fields ?? []);
    }
    throw new RamanEngineError(`Raman engine ${fn} failed: ${body.message || body.error || `HTTP ${res.status}`}`, res.status);
  }
  return json as RamanResultByFunction[F];
}
