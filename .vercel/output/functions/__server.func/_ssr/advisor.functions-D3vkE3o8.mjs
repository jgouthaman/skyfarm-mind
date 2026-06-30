import { c as createServerRpc } from "./createServerRpc-BrM-oKoP.mjs";
import { a as createServerFn } from "./server-Q5BLu_GA.mjs";
import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
const SYSTEM = `You are an aerospace drone design advisor for TorqWings Design Studio. Help users understand drone configuration, component selection, simulation results, and design trade-offs. Do not claim that the design is certified, production-ready, or flight-ready. Always recommend qualified engineering validation, safety testing, and applicable compliance review before real-world flying. Structure your reply with these short sections: Summary, Engineering Explanation, Risk Analysis, Recommendation, Next Best Action.`;
const askAdvisor_createServerFn_handler = createServerRpc({
  id: "0feebc4179378179b102bef8c9012b24832fd65750fc9eda3d16eb0299f36406",
  name: "askAdvisor",
  filename: "src/lib/design-studio/advisor.functions.ts"
}, (opts) => askAdvisor.__executeServer(opts));
const askAdvisor = createServerFn({
  method: "POST"
}).validator((d) => d).handler(askAdvisor_createServerFn_handler, async ({
  data
}) => {
  const key = process.env.LOVABLE_API_KEY;
  const userContent = `Project: ${data.projectName}
Vertical: ${data.vertical}
Requirements: ${JSON.stringify(data.requirements ?? {}, null, 2)}
Recommended Design: ${JSON.stringify(data.recommendedDesign ?? {}, null, 2)}
Simulation Results: ${JSON.stringify(data.simulationResults ?? {}, null, 2)}
Component count: ${Array.isArray(data.componentList) ? data.componentList.length : 0}

Question: ${data.question}`;
  if (!key) {
    return {
      content: mockReply(data.question),
      mock: true
    };
  }
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{
          role: "system",
          content: SYSTEM
        }, {
          role: "user",
          content: userContent
        }]
      })
    });
    if (!res.ok) {
      if (res.status === 429) return {
        content: "Rate limit hit on AI Advisor. Please retry in a moment.",
        mock: false
      };
      if (res.status === 402) return {
        content: "AI Advisor credits exhausted. Add credits in Workspace Usage.",
        mock: false
      };
      return {
        content: mockReply(data.question),
        mock: true
      };
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? mockReply(data.question);
    return {
      content,
      mock: false
    };
  } catch {
    return {
      content: mockReply(data.question),
      mock: true
    };
  }
});
function mockReply(q) {
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
export {
  askAdvisor_createServerFn_handler
};
