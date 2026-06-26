type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl p-6 bg-gradient-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-soft transition-all ${className}`}
    >
      {children}
    </div>
  );
}
