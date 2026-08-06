import { createFileRoute } from "@tanstack/react-router";
import { extractIntentAndEntities } from "@/lib/the-hangar/intentExtraction";
import { decomposeMission } from "@/lib/the-hangar/missionDecomposition";
import { identifyConstraintsAndKpis } from "@/lib/the-hangar/constraintIdentification";
import { prioritizeTradeoffs } from "@/lib/the-hangar/tradeoffPrioritization";
import { runOutputGeneration } from "@/lib/the-hangar/stage3Orchestrator";

// Manual end-to-end test for Stage 2.1 -> 2.2 -> 2.3 (task: "Write a manual
// test script that runs the full Stage 2.1 -> 2.2 -> 2.3 chain end to
// end"). Not a bare Node script, deliberately: every LLM-touching function
// in this chain is a createServerFn, which requires the real TanStack
// Start server runtime (AsyncLocalStorage request context) to execute —
// confirmed directly earlier in this project (a bare `node
// intentExtraction.ts` import throws "No Start context found"). This route
// is the way to actually exercise the real, committed code path, not a
// workaround.
//
// Not linked from any nav/menu — visit directly. Judgment call: this is a
// route file, not a script, purely because of the constraint above; if
// that's unwanted, it can be deleted (nothing else depends on it) and
// re-run manually via the same "temporary route + dev server" steps used
// earlier in this project's own testing.
//
// How to run: `npm run dev`, then open http://localhost:8080/hangar-stage3-manualtest
export const Route = createFileRoute("/hangar-stage3-manualtest")({
  loader: async () => {
    // Same brief used throughout this project's manual testing.
    const rawTextCombined =
      "Need a drone for crop monitoring over 200 hectares, budget under ₹5 lakh, must operate in Tamil Nadu.";

    // Stage 2.1 — intent + entity extraction.
    const extraction = await extractIntentAndEntities({
      data: { rawTextCombined, structuredFields: {} },
    });

    // Stage 2.2 — decomposition, then constraints + KPIs, then trade-offs.
    const decomposition = await decomposeMission({
      data: { detectedIntent: extraction.intent, extractedEntities: extraction },
    });
    const constraintsAndKpis = await identifyConstraintsAndKpis({
      data: {
        decomposedElements: decomposition.decomposedElements,
        extractedEntities: extraction,
        structuredFields: {},
        attachedRegulations: [],
      },
    });
    const prioritizedTradeoffs = prioritizeTradeoffs({
      identifiedConstraints: constraintsAndKpis.identifiedConstraints,
      derivedKpis: constraintsAndKpis.derivedKpis,
      prioritySignals: extraction.constraintHints,
    });

    // Stage 2.3 — assembly, summary, confidence score.
    const stage3 = await runOutputGeneration({
      data: {
        missionId: "manual-test-mission",
        detectedIntent: extraction.intent,
        sourceTypesUsedCount: 1, // natural_language only, per the doc's source-completeness definition
        validationFlagCount: 0, // Stage 2.1's rules engine (rulesEngine.ts) isn't wired into this test's intake path
        operatingEnvironment: null,
        decomposedElements: decomposition.decomposedElements,
        identifiedConstraints: constraintsAndKpis.identifiedConstraints,
        derivedKpis: constraintsAndKpis.derivedKpis,
        prioritizedTradeoffs,
      },
    });

    return { extraction, decomposition, constraintsAndKpis, prioritizedTradeoffs, stage3 };
  },
  component: Stage3ManualTestResult,
});

function Stage3ManualTestResult() {
  const data = Route.useLoaderData();
  return <pre id="result">{JSON.stringify(data, null, 2)}</pre>;
}
