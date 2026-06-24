import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plane, Sprout, Map as MapIcon, Wrench, CheckCircle2, Users, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/SectionWrapper";
import { Card } from "@/components/Card";
import { IconBubble } from "@/components/IconBubble";

export const Route = createFileRoute("/_layout/academy")({
  component: AcademyPage,
});

const ACADEMY_PROGRAMS = [
  {
    icon: <Plane aria-hidden="true" />,
    text: "Drone Pilot Training",
    desc: "Learn drone basics, flight safety, controls, emergency handling, and field operations.",
  },
  {
    icon: <Sprout aria-hidden="true" />,
    text: "Agri-Drone Operations",
    desc: "Learn drone usage for farm monitoring, crop imaging, spraying workflows, and precision agriculture services.",
  },
  {
    icon: <MapIcon aria-hidden="true" />,
    text: "Mapping & Survey Training",
    desc: "Learn aerial mapping basics, mission planning, data capture, and reporting workflows.",
  },
  {
    icon: <Wrench aria-hidden="true" />,
    text: "Drone Maintenance Basics",
    desc: "Understand batteries, propellers, motors, payloads, pre-flight checks, and post-flight maintenance.",
  },
  {
    icon: <CheckCircle2 aria-hidden="true" />,
    text: "Certification Support",
    desc: "Guidance and preparation support for drone pilot licensing and certification pathways through authorized channels.",
  },
  {
    icon: <Users aria-hidden="true" />,
    text: "Career & Entrepreneurship Pathway",
    desc: "Support for students, operators, SHGs, FPOs, and rural entrepreneurs to start drone-based service businesses.",
  },
];

function AcademyPage() {
  return (
    <SectionWrapper
      id="academy"
      eyebrow="TorqWings Academy"
      title="Training the next generation of drone pilots and aerial intelligence professionals"
    >
      <p className="text-muted-foreground max-w-3xl">
        TorqWings Academy provides hands-on drone pilot training and certification support for students,
        farmers, rural entrepreneurs, SHGs, FPOs, and professionals. The program focuses on safe drone
        operations, mission planning, field applications, agri-drone workflows, mapping basics, maintenance
        awareness, and real-world drone service readiness.
      </p>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACADEMY_PROGRAMS.map((c) => (
          <Card key={c.text}>
            <IconBubble>{c.icon}</IconBubble>
            <h3 className="mt-4 text-base font-semibold">{c.text}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
          </Card>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Link to="/contact">
            Join Drone Training Program <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </SectionWrapper>
  );
}
