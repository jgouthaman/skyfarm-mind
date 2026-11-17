// Short line beside a Hangar bay's "AI" badge, from /api/hangar/llm-status:
// which provider is answering and whether the backup is ready, or which one
// is down. Amber when something in the AI Providers order is unavailable;
// the full reason is in `message` (also the badge tooltip).
export interface LlmStatusInfo {
  message: string;
  note: string;
}

export function AiStatusNote({ info }: { info: LlmStatusInfo | null }) {
  if (!info?.note) return null;
  const warn = /unavailable|no ai provider/i.test(info.note);
  return (
    <span
      title={info.message}
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11.5,
        letterSpacing: ".03em",
        color: warn ? "#E8A33D" : "inherit",
        opacity: warn ? 1 : 0.75,
      }}
    >
      {info.note}
    </span>
  );
}
