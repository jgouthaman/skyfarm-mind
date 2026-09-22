import { spawn } from "node:child_process";
import path from "node:path";

// LOCAL DEV ONLY (this function specifically — see runSagushStep below for
// the dispatcher that also covers production). Runs a Hangar prototype
// Python script (scripts/hangar-python/) from Node as a real child process.
// Works only where a Python interpreter is actually installed and reachable
// — i.e. a developer's own machine running `vite dev`. This will NOT work on
// Vercel: a Vercel Node serverless function has no Python interpreter
// available and can't reliably spawn external processes.
//
// On Windows, plain `python`/`python3` are often just Microsoft Store alias
// stubs that print a redirect message instead of running anything real — `py`
// (the official Python Launcher, which actually resolves to a real
// interpreter) is tried first for that reason, with `python3`/`python` kept
// as fallbacks for other operating systems.

const SCRIPTS_DIR = path.join(process.cwd(), "scripts", "hangar-python");
const CANDIDATE_COMMANDS = ["py", "python3", "python"];
const TIMEOUT_MS = 10_000;

export interface PythonRunResult {
  status: "ok" | "failed";
  reason?: string;
  data: unknown;
}

interface ProcessOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
  spawnError: string | null;
}

function runOnce(command: string, scriptFile: string, args: string[]): Promise<ProcessOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: ProcessOutcome) => {
      if (!settled) {
        settled = true;
        resolve(outcome);
      }
    };

    let child;
    try {
      child = spawn(command, [scriptFile, ...args], { cwd: SCRIPTS_DIR, windowsHide: true });
    } catch (err) {
      finish({ code: null, stdout: "", stderr: "", spawnError: err instanceof Error ? err.message : String(err) });
      return;
    }

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      finish({ code: null, stdout, stderr, spawnError: "timed out" });
    }, TIMEOUT_MS);

    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      finish({ code: null, stdout, stderr, spawnError: err.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      finish({ code, stdout, stderr, spawnError: null });
    });
  });
}

// Tries each candidate interpreter in order; the first one that both starts
// AND exits 0 AND prints valid JSON wins. A candidate that merely fails to
// exist (Windows' Store-alias stubs, or a plain command-not-found) is not
// distinguished from one that exists but errors — both just move on to the
// next candidate, since a Store alias stub behaves like a real process that
// happens to fail, not like a spawn error.
export async function runHangarPythonScript(
  scriptFile: string,
  args: string[],
): Promise<PythonRunResult> {
  let lastFailure: PythonRunResult = {
    status: "failed",
    reason: `no working Python interpreter found (tried: ${CANDIDATE_COMMANDS.join(", ")})`,
    data: null,
  };

  for (const command of CANDIDATE_COMMANDS) {
    const result = await runOnce(command, scriptFile, args);
    if (result.spawnError) {
      lastFailure = { status: "failed", reason: `${command}: ${result.spawnError}`, data: null };
      continue;
    }
    if (result.code !== 0) {
      lastFailure = {
        status: "failed",
        reason: (result.stderr || `${command} exited with code ${result.code}`).trim(),
        data: null,
      };
      continue;
    }
    try {
      return { status: "ok", data: JSON.parse(result.stdout.trim()) };
    } catch {
      lastFailure = { status: "failed", reason: `${command} did not print valid JSON to stdout`, data: null };
    }
  }
  return lastFailure;
}

// ── Sagush step dispatch: local subprocess in dev, real Vercel Python ──────
// service in production/preview ─────────────────────────────────────────
//
// The main app's own build can't host Python functions directly (see
// python-service/README.md for why — its Nitro build already emits a
// self-contained Vercel deployment that bypasses Vercel's normal /api/*.py
// auto-detection). The real Python code lives in a SEPARATE Vercel project
// (python-service/), called over HTTPS once SAGUSH_SERVICE_URL and
// SAGUSH_SERVICE_KEY are set (Production/Preview on the main app's Vercel
// project). Unset locally on purpose, so local dev keeps using the real
// local subprocess path above — exactly the "local first, then move to
// Vercel" sequence this was built in.

export interface SagushInvocation {
  conceptId: string;
  conceptCode: string;
}

const SAGUSH_STEPS = {
  hello: { localScript: "hello.py", remotePath: "/api/sagush_hello" },
  design: { localScript: "aircraftdesign.py", remotePath: "/api/sagush_design" },
} as const;

export type SagushStep = keyof typeof SAGUSH_STEPS;

export async function runSagushStep(
  step: SagushStep,
  invocation: SagushInvocation,
): Promise<PythonRunResult> {
  const remoteUrl = process.env.SAGUSH_SERVICE_URL;
  const remoteKey = process.env.SAGUSH_SERVICE_KEY;
  const { localScript, remotePath } = SAGUSH_STEPS[step];
  if (remoteUrl && remoteKey) {
    return runSagushStepRemote(remoteUrl, remoteKey, remotePath, invocation);
  }
  return runHangarPythonScript(localScript, [invocation.conceptId, invocation.conceptCode]);
}

async function runSagushStepRemote(
  baseUrl: string,
  key: string,
  path: string,
  invocation: SagushInvocation,
): Promise<PythonRunResult> {
  try {
    const res = await fetch(baseUrl.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sagush-Key": key },
      body: JSON.stringify(invocation),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const reason = (json && typeof json === "object" && "error" in json && json.error) || `remote HTTP ${res.status}`;
      return { status: "failed", reason: String(reason), data: null };
    }
    return { status: "ok", data: json };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : String(err), data: null };
  }
}
