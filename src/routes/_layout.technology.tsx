import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SectionWrapper } from "@/components/SectionWrapper";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";
import { TECH_PIPELINE, PRODUCT_CAPABILITIES } from "@/constants/solutions.constants";

export const Route = createFileRoute("/_layout/technology")({
  component: TechnologyPage,
});

function TechnologyPage() {
  return (
    <>
      <SectionWrapper id="technology" eyebrow="Technology" title="A modular aerial intelligence stack" muted>
        <p className="text-muted-foreground max-w-3xl">
          TorqWings's technology is built as a reusable platform that powers multiple industries — from a single
          mission to enterprise-grade aerial operations.
        </p>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {TECH_PIPELINE.map((s, idx) => (
            <div key={s.num} className="relative">
              <Card className="h-full">
                <div className="flex items-center justify-between">
                  <IconBubble>{s.icon}</IconBubble>
                  <span className="text-xs font-mono text-muted-foreground">{s.num}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.text}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </Card>
              {idx < TECH_PIPELINE.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 h-4 w-4 text-primary/60"
                />
              )}
            </div>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper id="products" eyebrow="Products & capabilities" title="What TorqWings builds">
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PRODUCT_CAPABILITIES.map((c) => (
            <Card key={c.text} className="text-center items-center flex flex-col">
              <IconBubble>{c.icon}</IconBubble>
              <p className="mt-3 text-sm font-medium">{c.text}</p>
            </Card>
          ))}
        </div>
      </SectionWrapper>
    </>
  );
}
