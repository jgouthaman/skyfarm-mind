import { createFileRoute } from "@tanstack/react-router";
import {
  BernoulliRuleError,
  RULE_LIMITS,
  assertMissionHubAdmin,
  createCustomBernoulliRule,
  deleteCustomBernoulliRule,
  getEditorNames,
  getRuleStats,
  listBernoulliRules,
  updateBernoulliRule,
  type BernoulliMaxSeverity,
  type BernoulliRuleCategory,
} from "@/lib/the-hangar/bernoulliRules";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bernoulli check registry. GET (any signed-in user): the rules for one bay,
// used by the Bernoulli page legend and the Mission Hub admin page; with
// ?stats=1 also the last-30-review counts and per-call averages (Mission Hub
// only -- a heavier query). POST / PATCH / DELETE: Mission Hub admins only.
//   GET    ?bay=mission|concept[&stats=1]  -> { rules, fromRegistry, limits, stats?, ... }
//   POST   { bay, name, description, instruction, category, maxSeverity, hardGate, enabled }
//   PATCH  { ruleId, enabled?, hardGate?, name?, description?, instruction?, category?, maxSeverity? }
//   DELETE ?ruleId=                          -> custom rules only

function ruleErrorResponse(err: unknown): Response {
  if (err instanceof BernoulliRuleError) {
    const forbidden = err.message.startsWith("Only Mission Hub admins");
    return jsonResponse({ error: err.message }, forbidden ? 403 : 400);
  }
  return errorResponse(err);
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);

export const Route = createFileRoute("/api/hangar/bernoulli-rules")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          const params = new URL(request.url).searchParams;
          const bay = params.get("bay");
          if (!bay) return jsonResponse({ error: "bay query param is required" }, 400);
          const { rules, fromRegistry } = await listBernoulliRules(bay);
          if (params.get("stats") !== "1") return jsonResponse({ rules, fromRegistry, limits: RULE_LIMITS });
          const [stats, editors] = await Promise.all([
            getRuleStats(bay),
            getEditorNames(rules.map((r) => r.updatedBy ?? "")),
          ]);
          return jsonResponse({ rules, fromRegistry, limits: RULE_LIMITS, editors, ...stats });
        } catch (err) {
          return ruleErrorResponse(err);
        }
      },
      POST: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          await assertMissionHubAdmin(userId);
          const body = await request.json();
          const rule = await createCustomBernoulliRule(
            {
              bay: String(body.bay ?? ""),
              name: String(body.name ?? ""),
              description: String(body.description ?? ""),
              instruction: String(body.instruction ?? ""),
              category: String(body.category ?? "") as BernoulliRuleCategory,
              maxSeverity: body.maxSeverity === "WARN" ? "WARN" : "FAIL",
              hardGate: body.hardGate === true,
              enabled: body.enabled === true,
            },
            userId,
          );
          return jsonResponse(rule, 201);
        } catch (err) {
          return ruleErrorResponse(err);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          await assertMissionHubAdmin(userId);
          const body = await request.json();
          if (!body.ruleId) return jsonResponse({ error: "ruleId is required" }, 400);
          const rule = await updateBernoulliRule(
            String(body.ruleId),
            {
              enabled: bool(body.enabled),
              hardGate: bool(body.hardGate),
              name: str(body.name),
              description: str(body.description),
              instruction: str(body.instruction),
              category: str(body.category) as BernoulliRuleCategory | undefined,
              maxSeverity: str(body.maxSeverity) as BernoulliMaxSeverity | undefined,
            },
            userId,
          );
          return jsonResponse(rule);
        } catch (err) {
          return ruleErrorResponse(err);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          await assertMissionHubAdmin(userId);
          const ruleId = new URL(request.url).searchParams.get("ruleId");
          if (!ruleId) return jsonResponse({ error: "ruleId query param is required" }, 400);
          await deleteCustomBernoulliRule(ruleId);
          return jsonResponse({ ok: true });
        } catch (err) {
          return ruleErrorResponse(err);
        }
      },
    },
  },
});
