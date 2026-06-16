import { MessageCircle } from "lucide-react";

const PHONE = "919940263589";

const presets: { label: string; msg: string }[] = [
  { label: "AgriSky — Drone for my farm", msg: "Hi TorqWings, I'm interested in AgriSky drone services for my farm. Please share details." },
  { label: "InfraSky — Inspection enquiry", msg: "Hi TorqWings, I'd like to discuss drone inspection (InfraSky) for our infrastructure assets." },
  { label: "GuardSky — Surveillance enquiry", msg: "Hi TorqWings, I'm interested in GuardSky aerial surveillance & early fire response." },
  { label: "GeoSky — Mapping / Survey", msg: "Hi TorqWings, I need aerial mapping / survey (GeoSky) for a site. Please get in touch." },
  { label: "Academy — Pilot training", msg: "Hi TorqWings, I'd like to enrol in TorqWings Academy drone pilot training." },
  { label: "Labs — Custom UAV / R&D", msg: "Hi TorqWings, I want to discuss a custom UAV / payload project with TorqWings Labs." },
  { label: "Other — General enquiry", msg: "Hi TorqWings, I'd like to know more about your drone services." },
];

function waLink(msg: string) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
}

export function WhatsAppFab() {
  return (
    <div className="fixed bottom-5 right-5 z-[60] group">
      <details className="relative">
        <summary className="list-none cursor-pointer select-none">
          <span className="grid place-items-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-soft hover:scale-105 transition-transform">
            <MessageCircle className="h-7 w-7" />
          </span>
          <span className="sr-only">Chat on WhatsApp</span>
        </summary>
        <div className="absolute bottom-16 right-0 w-72 rounded-2xl border border-border/60 bg-card/95 backdrop-blur shadow-card p-3">
          <div className="px-2 pb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Chat on WhatsApp</div>
          <ul className="space-y-1 max-h-80 overflow-auto">
            {presets.map((p) => (
              <li key={p.label}>
                <a
                  href={waLink(p.msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm px-3 py-2 rounded-lg hover:bg-muted/60 text-foreground"
                >
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}
