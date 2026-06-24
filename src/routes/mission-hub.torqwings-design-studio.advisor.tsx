import { createFileRoute } from "@tanstack/react-router";
import { StudioStepNav } from "@/components/design-studio/step-nav";
import { StudioTabNav } from "@/components/design-studio/StudioTabNav";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentProject, studioActions } from "@/lib/design-studio/store";
import { askAdvisor } from "@/lib/design-studio/advisor.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer } from "@/components/design-studio/sidebar";
import { Sparkles, Send } from "lucide-react";

export const Route = createFileRoute("/mission-hub/torqwings-design-studio/advisor")({
  component: Advisor,
});

const SUGGESTED = [
  "Why was this drone type selected?",
  "How can I improve flight time?",
  "Is this payload safe?",
  "Which component is the bottleneck?",
  "How can I reduce cost?",
  "What happens if wind speed increases?",
  "Should I use hexacopter or octocopter?",
  "Which battery is better?",
  "What safety components are mandatory?",
  "Can this drone cover my farm area?",
];

function Advisor() {
  const project = useCurrentProject();
  const [input, setInput] = useState("");
  const fn = useServerFn(askAdvisor);
  const msgs = project?.advisorMessages ?? [];

  const m = useMutation({
    mutationFn: async (question: string) => {
      if (!project) throw new Error("No active project");
      const res = await fn({
        data: {
          projectName: project.projectName,
          vertical: project.vertical,
          requirements: project.requirements,
          recommendedDesign: project.recommendedDesign,
          componentList: project.componentList,
          simulationResults: project.simulationResults,
          question,
        },
      });
      const next = [
        ...(project.advisorMessages ?? []),
        { role: "user" as const, content: question, at: new Date().toISOString() },
        { role: "assistant" as const, content: res.content, at: new Date().toISOString() },
      ];
      studioActions.update(project.id, { advisorMessages: next, status: "Reviewed" });
    },
  });

  function send(q?: string) {
    const text = (q ?? input).trim();
    if (!text) return;
    setInput("");
    m.mutate(text);
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <StudioTabNav />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-700" /> AI Design Advisor</h1>
          <p className="text-sm text-muted-foreground mt-1">{project ? `${project.projectName} · ${project.vertical}` : "No active project"}</p>
        </div>
      </header>

      <Disclaimer />

      <div className="rounded-xl border border-border/60 bg-card/60 p-4 min-h-[400px] flex flex-col">
        {msgs.length === 0 && !m.isPending && (
          <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
            Ask any question about your drone design.
          </div>
        )}
        <div className="flex-1 space-y-3">
          {msgs.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "ml-auto max-w-[80%] bg-primary/15 border border-primary/30 rounded-lg px-4 py-2.5 text-sm" : "max-w-[85%] bg-muted/40 border border-border/60 rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap"}>
              {msg.content}
            </div>
          ))}
          {m.isPending && <div className="max-w-[85%] bg-muted/40 border border-border/60 rounded-lg px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div>}
        </div>
        <div className="mt-4 flex gap-2 border-t border-border/60 pt-4">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the advisor…" onKeyDown={(e) => e.key === "Enter" && send()} />
          <Button onClick={() => send()} disabled={m.isPending} className="bg-sky-500 hover:bg-sky-600 text-white"><Send className="h-4 w-4" /></Button>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Suggested questions</div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((q) => (
            <button key={q} onClick={() => send(q)} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted/50">{q}</button>
          ))}
        </div>
      </div>
      <StudioStepNav />
    </div>
  );
}
