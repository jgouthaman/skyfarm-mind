import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { FlaskConical, Loader2 } from "lucide-react";
import { useThSession } from "@/lib/test-harness/session";
import { TEST_HARNESS_AGENTS } from "@/lib/test-harness/agents";

export const Route = createFileRoute("/t-h/")({
  head: () => ({
    meta: [
      { title: "Test Harness" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TestHarnessMain,
});

function TestHarnessMain() {
  const ready = useThSession();
  const [agentSlug, setAgentSlug] = useState(TEST_HARNESS_AGENTS[0].slug);
  const [functionId, setFunctionId] = useState(TEST_HARNESS_AGENTS[0].functions[0].id);
  const [payload, setPayload] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);

  if (!ready) return null;

  const agent = TEST_HARNESS_AGENTS.find((a) => a.slug === agentSlug)!;

  function selectAgent(slug: string) {
    setAgentSlug(slug);
    const next = TEST_HARNESS_AGENTS.find((a) => a.slug === slug)!;
    setFunctionId(next.functions[0].id);
    setResponse(null);
  }

  async function proceed() {
    setSubmitting(true);
    setResponse(null);
    try {
      // Same-origin call -- this app's own /api/t-h/$agent route proxies
      // server-to-server to th-vercel-functions, so the browser never
      // makes a cross-origin request and CORS doesn't enter into it.
      const res = await fetch(`/api/t-h/${agent.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ function_name: functionId, payload }),
      });
      const text = await res.text();
      setResponse({ status: res.status, body: text });
      if (!res.ok) toast.error(`Request failed (${res.status})`);
      else toast.success("Request succeeded");
    } catch (err) {
      setResponse({ status: 0, body: String(err) });
      toast.error("Request failed — see response panel");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero grid-bg p-5">
      <Toaster richColors position="top-center" theme="dark" />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-primary shadow-glow">
            <FlaskConical className="h-5 w-5 text-primary-foreground" />
          </span>
          <div>
            <div className="font-display font-semibold leading-none">TorqWings Test Harness</div>
            <div className="text-xs text-muted-foreground mt-1">Browser → Vercel Python function → Google Cloud endpoint</div>
          </div>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          {/* Side panel: agent dropdown + that agent's functions */}
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card h-fit">
            <label className="text-xs text-muted-foreground block mb-1.5">Agent</label>
            <select
              value={agentSlug}
              onChange={(e) => selectAgent(e.target.value)}
              className="w-full h-11 rounded-lg bg-input/40 border border-border/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {TEST_HARNESS_AGENTS.map((a) => (
                <option key={a.slug} value={a.slug}>
                  Bay {a.bay} — {a.name}
                </option>
              ))}
            </select>

            <div className="text-xs text-muted-foreground mt-5 mb-2 uppercase tracking-wide">Functions</div>
            <div className="space-y-1.5">
              {agent.functions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFunctionId(f.id)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                    functionId === f.id
                      ? "border-ring bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main panel: payload input + Proceed + response */}
          <div className="rounded-2xl border border-border/60 bg-gradient-card p-5 shadow-card">
            <div className="text-sm text-muted-foreground">
              Bay {agent.bay} · <span className="text-foreground font-medium">{agent.name}</span> · function:{" "}
              <code className="text-xs bg-input/40 px-1.5 py-0.5 rounded">{functionId}</code>
            </div>

            <label className="text-xs text-muted-foreground mt-5 block">Payload</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="Free-text or JSON — sent as-is in the request body's payload field"
              rows={6}
              className="mt-1 w-full rounded-lg bg-input/40 border border-border/60 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring resize-y"
            />

            <Button
              onClick={proceed}
              disabled={submitting}
              className="mt-4 h-11 px-6 bg-gradient-primary text-primary-foreground"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Proceed
            </Button>

            {response && (
              <div className="mt-5">
                <div className="text-xs text-muted-foreground mb-1.5">
                  Response {response.status ? `(HTTP ${response.status})` : "(network error)"}
                </div>
                <pre className="text-xs bg-input/40 border border-border/60 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                  {response.body}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
