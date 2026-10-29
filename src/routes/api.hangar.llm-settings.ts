import { createFileRoute } from "@tanstack/react-router";
import {
  ALL_PROVIDERS,
  getProviderOrder,
  normalizeProviderOrder,
  setProviderOrder,
} from "@/lib/the-hangar/llmProviderSettings";
import { BernoulliRuleError, assertMissionHubAdmin } from "@/lib/the-hangar/bernoulliRules";
import { resolveUserId, jsonResponse, errorResponse } from "@/lib/the-hangar/apiAuth";

// Mission Hub -> Configurations -> AI Providers. GET: the current provider
// order plus which providers have an API key configured (never the keys
// themselves). PUT { order: ["groq","anthropic"] }: Mission Hub admins only.
export const Route = createFileRoute("/api/hangar/llm-settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await resolveUserId(request);
          const { order, fromSettings } = await getProviderOrder();
          return jsonResponse({
            order,
            fromSettings,
            providers: ALL_PROVIDERS,
            configured: {
              anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
              groq: Boolean(process.env.GROQ_API_KEY),
            },
          });
        } catch (err) {
          return errorResponse(err);
        }
      },
      PUT: async ({ request }) => {
        try {
          const userId = await resolveUserId(request);
          await assertMissionHubAdmin(userId);
          const body = await request.json();
          const order = normalizeProviderOrder(body.order);
          if (!order) return jsonResponse({ error: "Pick at least one provider." }, 400);
          return jsonResponse({ order: await setProviderOrder(order, userId) });
        } catch (err) {
          if (err instanceof BernoulliRuleError) return jsonResponse({ error: "Only Mission Hub admins can change AI providers." }, 403);
          return errorResponse(err);
        }
      },
    },
  },
});
