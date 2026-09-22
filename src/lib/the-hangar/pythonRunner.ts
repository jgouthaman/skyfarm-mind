import { spawn } from "node:child_process";
import path from "node:path";

// LOCAL DEV ONLY. Runs a Hangar prototype Python script (scripts/hangar-python/)
// from Node as a real child process. Works only where a Python interpreter is
// actually installed and reachable — i.e. today, only on a developer's own
// machine running `vite dev`. This will NOT work once deployed to Vercel: a
// Vercel Node serverless function has no Python interpreter available and
// can't reliably spawn external processes. Moving this to production needs
// either a real Python Vercel Function (a `.py` file under Vercel's own
// Python runtime) or an external service this code calls over HTTP instead —
// this file is deliberately neither of those; it's the local-only first step,
// by design (see the "Trigger Sagush" feature this backs).
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
