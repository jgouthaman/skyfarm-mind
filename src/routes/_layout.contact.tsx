import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { HANGAR_PUBLIC_HEAD_LINKS } from "@/styles/hangarPublicTheme";
import { OG_IMAGE_URL, absoluteUrl } from "@/lib/siteConfig";

const TITLE = "Contact TorqWings | Partner With Us";
const DESCRIPTION = "OEMs, operators, defence and research programmes, institutions and investors: talk to TorqWings about early access, custom platform design or partnerships.";

export const Route = createFileRoute("/_layout/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/contact") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE_URL },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/contact") }, ...HANGAR_PUBLIC_HEAD_LINKS],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <section id="contact" className="hgr-pub-section" style={{ paddingTop: 128, borderBottom: "none" }}>
      <div className="hgr-pub-wrap">
        <div className="grid lg:grid-cols-12 gap-10">

          <div className="lg:col-span-5">
            <span className="hgr-pub-badge hgr-pub-badge-dark">Get In Touch</span>
            <h1 className="hgr-pub-h2">Partner with TorqWings</h1>
            <p className="hgr-pub-sub">
              Whether you're building aircraft, flying them, or funding the next generation — OEMs,
              operators, defence and research programmes, institutions and investors — we'd like to hear
              what you're working on. Early access to The Hangar, custom platform design, Academy
              partnerships or pilots: start here.
            </p>
            <div className="hgr-pub-info-row">
              <Phone className="h-4 w-4" aria-hidden="true" /> +919940263589
            </div>
            <div className="hgr-pub-info-row">
              <Mail className="h-4 w-4" aria-hidden="true" /> support@torqwings.com
            </div>
          </div>

          <div className="lg:col-span-7 hgr-pub-form-panel">
            <ContactForm />
          </div>

        </div>
      </div>
    </section>
  );
}
