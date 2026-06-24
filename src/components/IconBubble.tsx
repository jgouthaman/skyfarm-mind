type Props = {
  children: React.ReactNode;
  tone?: "primary" | "agri";
};

export function IconBubble({ children, tone = "primary" }: Props) {
  const cls =
    tone === "agri"
      ? "bg-accent text-accent-foreground border-accent"
      : "bg-primary text-primary-foreground border-primary";
  return (
    <div
      aria-hidden="true"
      className={`inline-grid place-items-center h-10 w-10 rounded-xl border shadow-glow ${cls} [&>svg]:h-5 [&>svg]:w-5`}
    >
      {children}
    </div>
  );
}
