import { createFileRoute } from "@tanstack/react-router";
import {
  BernoulliRuleError,
  RULE_CATEGORIES,
  WIRED_BERNOULLI_BAYS,
  assertMissionHubAdmin,
  listBernoulliRules,
  type BernoulliRuleBay,
  type BernoulliRuleCategory,
  type BernoulliRuleDef,
} from "@/lib/the-hangar/bernoulliRules";
import { InvalidBernoulliInputError, testBernoulliRule } from "@/lib/the-hangar/bernoulliAgentPipeline";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Mission Hub "Run test": runs one rule once against one of the admin's own
// missions (or, for concept rules, concepts) and returns the result with
// provider, tokens and cost. Nothing is saved.
//   POST { bay, ruleId? , draft?: { name, description, instruction, category, maxSeverity, hardGate },
//          missionId?, conceptId? }
// ruleId tests a saved rule; draft tests the form's unsaved contents.
export const Route = createFileRoute("/api/hangar/bernoulli-rules-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          await assertMissionHubAdmin(userId);
          const body = await request.json();
          const bay = String(body.bay ?? "");
          if (!WIRED_BERNOULLI_BAYS.includes(bay as BernoulliRuleBay)) {
            return jsonResponse({ error: "Bernoulli isn't wired into this agent." }, 400);
          }

          let rule: BernoulliRuleDef | undefined;
          if (body.ruleId) {
            const { rules } = await listBernoulliRules(bay);
            rule = rules.find((r) => r.ruleId === body.ruleId);
            if (!rule) return jsonResponse({ error: "No rule with this id." }, 404);
          } else if (body.draft) {
            const d = body.draft;
            const instruction = String(d.instruction ?? "").trim();
            if (!instruction) return jsonResponse({ error: "Write what TorqWings AI should check before testing." }, 400);
            const maxSeverity = d.maxSeverity === "WARN" ? "WARN" : "FAIL";
            rule = {
              ruleId: "DRAFT",
              bay,
              name: String(d.name ?? "").trim() || "Untitled rule",
              description: String(d.description ?? ""),
              kind: "llm",
              category: RULE_CATEGORIES.includes(d.category) ? (d.category as BernoulliRuleCategory) : "physics",
              hardGate: maxSeverity === "FAIL" && d.hardGate === true,
              maxSeverity,
              enabled: true,
              builtin: false,
              instruction,
              sortOrder: 999,
              version: 0,
              updatedAt: null,
              updatedBy: null,
            };
          } else {
            return jsonResponse({ error: "Send a ruleId or a draft rule." }, 400);
          }
          if (rule.builtin && rule.kind === "rule") {
            return jsonResponse({ error: "Rule-based checks are plain code -- there's nothing to test." }, 400);
          }

          const out = await testBernoulliRule(userId, rule, {
            missionId: body.missionId ? String(body.missionId) : undefined,
            conceptId: body.conceptId ? String(body.conceptId) : undefined,
          });
          return jsonResponse(out);
        } catch (err) {
          if (err instanceof BernoulliRuleError) return jsonResponse({ error: err.message }, 403);
          if (err instanceof InvalidBernoulliInputError) return jsonResponse({ error: err.message }, 400);
          return errorResponse(err);
        }
      },
    },
  },
});
