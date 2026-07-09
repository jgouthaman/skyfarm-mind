import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin } from "lucide-react";
import { Card } from "@/components/Card";
import { ContactForm } from "@/components/ContactForm";
import { SectionBadge } from "@/components/SectionBadge";

export const Route = createFileRoute("/_layout/contact")({
  component: ContactPage,
});

function ContactPage() {
  return (
    <section id="contact" className="relative py-20 sm:py-28 bg-gradient-hero">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8 relative grid lg:grid-cols-12 gap-10">

        <div className="lg:col-span-5">
          <SectionBadge label="Get In Touch" />
          <h2 className="text-3xl sm:text-4xl font-bold">Partner with TorqWings</h2>
          <p className="mt-4 text-muted-foreground">
            Whether you are a farmer, infrastructure company, autonomous aerial platform operator, investor, institution, or
            industry partner — TorqWings is open to pilots, partnerships, and custom aerial intelligence
            projects.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" aria-hidden="true" /> Hello : +919940263589
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-primary" aria-hidden="true" /> support@torqwings.com
            </li>

          </ul>
        </div>

        <Card className="lg:col-span-7">
          <ContactForm />
        </Card>

      </div>
    </section>
  );
}
