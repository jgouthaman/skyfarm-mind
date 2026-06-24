import { createServerFn } from "@tanstack/react-start";

const SYSTEM = `You are an aerospace drone design advisor for TorqWings Design Studio. Help users understand drone configuration, component selection, simulation results, and design trade-offs. Do not claim that the design is certified, production-ready, or flight-ready. Always recommend qualified engineering validation, safety testing, and applicable compliance review before real-world flying. Structure your reply with these short sections: Summary, Engineering Explanation, Risk Analysis, Recommendation, Next Best Action.`;

export interface AdvisorContext {
  projectName: string;
  vertical: string;
  requirements?: unknown;
  recommendedDesign?: unknown;
  componentList?: unknown;
  simulationResults?: unknown;
  question: string;
}

export const askAdvisor = createServerFn({ method: "POST" })
  .validator((d: AdvisorContext) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    const userContent = `Project: ${data.projectName}
Vertical: ${data.vertical}
Requirements: ${JSON.stringify(data.requirements ?? {}, null, 2)}
Recommended Design: ${JSON.stringify(data.recommendedDesign ?? {}, null, 2)}
Simulation Results: ${JSON.stringify(data.simulationResults ?? {}, null, 2)}
Component count: ${Array.isArray(data.componentList) ? data.componentList.length : 0}

Question: ${data.question}`;

    if (!key) {
      return { content: mockReply(data.question), mock: true };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userContent },
          ],
        }),
      });
      if (!res.ok) {
        if (res.status === 429) return { content: "Rate limit hit on AI Advisor. Please retry in a moment.", mock: false };
        if (res.status === 402) return { content: "AI Advisor credits exhausted. Add credits in Workspace Usage.", mock: false };
        return { content: mockReply(data.question), mock: true };
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content ?? mockReply(data.question);
      return { content, mock: false };
    } catch {
      return { content: mockReply(data.question), mock: true };
    }
  });

function mockReply(q: string) {
  return `**Summary**
Mock advisor response for: "${q}".

**Engineering Explanation**
Drone selection balances payload, thrust-to-weight, endurance, and environmental conditions. With increased payload, motor class and battery capacity must scale together to preserve a safe T/W ratio (target ≥ 2.0).

**Risk Analysis**
Without live AI, this mock cannot fully evaluate the design — treat all suggestions as illustrative only.

**Recommendation**
Validate with a qualified drone engineer and run bench tests for motor load, hover stability, and battery thermal behaviour.

**Next Best Action**
Open the Simulation Lab and sweep payload weight and battery capacity to find the largest safety envelope.`;
}
