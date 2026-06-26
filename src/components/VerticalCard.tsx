import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { IconBubble } from "./IconBubble";

type Props = {
  tag: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  desc: string;
  accent?: "agri";
  to?: string;
};

export function VerticalCard({ tag, icon, title, subtitle, desc, accent, to }: Props) {
  const isAgri = accent === "agri";
  return (
    <div
      className={`rounded-2xl p-6 border shadow-card transition-all hover:-translate-y-0.5 ${
        isAgri
          ? "bg-gradient-card border-accent/40 hover:shadow-soft"
          : "bg-gradient-card border-border/60 hover:border-primary/40 hover:shadow-soft"
      }`}
    >
      <div className="flex items-center justify-between">
        <IconBubble tone={isAgri ? "agri" : "primary"}>{icon}</IconBubble>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{tag}</span>
      </div>
      <h3 className="mt-5 text-xl font-display font-semibold">{title}</h3>
      <p className={`mt-1 text-sm font-medium ${isAgri ? "text-accent" : "text-primary"}`}>{subtitle}</p>
      <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
      {to && (
        <Link
          to={to}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:gap-2.5 transition-all"
        >
          Explore {title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
