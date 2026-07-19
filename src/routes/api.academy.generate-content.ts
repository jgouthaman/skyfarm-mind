import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

export const Route = createFileRoute("/api/academy/generate-content")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let topicBrief: string | undefined;
        try {
          const body = await request.json();
          topicBrief = typeof body?.topicBrief === "string" ? body.topicBrief : undefined;
        } catch {
          // fall through to validation below
        }
        if (!topicBrief) {
          return new Response("Missing topicBrief", { status: 400 });
        }

        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) {
          return new Response("Academy content generation is not configured.", { status: 500 });
        }

        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 2000,
            stream: true,
            messages: [{ role: "user", content: topicBrief }],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          return new Response("Content generation failed.", { status: 502 });
        }

        const upstreamReader = upstream.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await upstreamReader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue;
                  const payload = line.slice(6);
                  if (payload === "[DONE]") continue;
                  try {
                    const evt = JSON.parse(payload);
                    const delta = evt?.delta?.text;
                    if (evt?.type === "content_block_delta" && typeof delta === "string") {
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch {
                    // ignore malformed SSE line
                  }
                }
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
