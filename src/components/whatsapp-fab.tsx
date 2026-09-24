import { MessageCircle } from "lucide-react";

const PHONE = "919940263589";
const MESSAGE = "Hi TorqWings, I'd like to know more about The Hangar.";

function waLink(msg: string) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
}

// Was a dropdown of old vertical-specific presets (AgriSky/InfraSky/
// GuardSky/GeoSky/Academy/Labs) that no longer match the site's current
// focus on The Hangar. Replaced with a single link — a dropdown for one
// option is just an extra click, so this goes straight to WhatsApp
// instead of keeping the details/summary wrapper around one item.
export function WhatsAppFab() {
  return (
    <a
      href={waLink(MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-[60] grid place-items-center h-14 w-14 rounded-full bg-[#25D366] text-white shadow-soft hover:scale-105 transition-transform"
      aria-label="Ask about The Hangar on WhatsApp"
      title="Ask about The Hangar"
    >
      <MessageCircle className="h-7 w-7" aria-hidden="true" />
    </a>
  );
}
