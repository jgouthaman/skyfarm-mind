type Props = {
  icon: React.ReactNode;
  title: string;
  value: string;
  className?: string;
  tone?: "primary" | "agri";
};

export function FloatingCard({ icon, title, value, className = "", tone = "primary" }: Props) {
  return (
    <div className={`rounded-xl bg-card/90 backdrop-blur border border-border shadow-card px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className={`mt-1 text-sm font-semibold ${tone === "agri" ? "text-accent" : "text-primary"}`}>
        {value}
      </div>
    </div>
  );
}
