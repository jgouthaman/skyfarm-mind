import { createFileRoute } from "@tanstack/react-router";
import {
  BernoulliRuleError,
  assertMissionHubAdmin,
  createCustomBernoulliRule,
  deleteCustomBernoulliRule,
  listBernoulliRules,
  updateBernoulliRule,
} from "@/lib/the-hangar/bernoulliRules";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Bernoulli check registry. GET (any signed-in user): the rules for one bay,
// used by the Bernoulli page legend and the Mission Hub admin page. POST /
// PATCH / DELETE: Mission Hub admins only (assertMissionHubAdmin).
//   GET    ?bay=mission|concept|...         -> { rules, fromRegistry }
//   POST   { bay, name, description, instruction, hardGate }  -> new custom rule
//   PATCH  { ruleId, enabled?, hardGate?, name?, description?, instruction? }
//   DELETE ?ruleId=                          -> custom rules only

function ruleErrorResponse(err: unknown): Response {
  if (err instanceof BernoulliRuleError) {
    const forbidden = err.message.startsWith("Only Mission Hub admins");
    return jsonResponse({ error: err.message }, forbidden ? 403 : 400);
  }
  return errorResponse(err);
}

export const Route = createFileRoute("/api/hangar/bernoulli-rules")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          const bay = new URL(request.url).searchParams.get("bay");
          if (!bay) return jsonResponse({ error: "bay query param is required" }, 400);
          return jsonResponse(await listBernoulliRules(bay));
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
              hardGate: body.hardGate === true,
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
          const pick = <T,>(v: unknown, t: string) => (typeof v === t ? (v as T) : undefined);
          const rule = await updateBernoulliRule(String(body.ruleId), {
            enabled: pick<boolean>(body.enabled, "boolean"),
            hardGate: pick<boolean>(body.hardGate, "boolean"),
            name: pick<string>(body.name, "string"),
            description: pick<string>(body.description, "string"),
            instruction: pick<string>(body.instruction, "string"),
          });
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
