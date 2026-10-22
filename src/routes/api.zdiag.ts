import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/zdiag")({
  server: {
    handlers: {
      POST: async () => Response.json({ ok: true, ts: Date.now() }),
      GET: async () => Response.json({ ok: true, ts: Date.now() }),
    },
  },
});
