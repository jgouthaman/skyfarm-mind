type Props = {
  id?: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  muted?: boolean;
};

export function SectionWrapper({ id, eyebrow, title, children, muted = false }: Props) {
  return (
    <section id={id} className={`py-20 sm:py-28 ${muted ? "bg-muted/30" : ""}`}>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {eyebrow && (
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground bg-primary px-3 py-1 rounded-md shadow-glow">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-3 text-3xl sm:text-4xl font-semibold max-w-3xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}
