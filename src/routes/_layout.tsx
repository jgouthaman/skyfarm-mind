import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { HANGAR_PUBLIC_CSS } from "@/styles/hangarPublicTheme";

export const Route = createFileRoute("/_layout")({
  component: PublicLayout,
});

// .hgr-pub wraps the whole public site (every page nested under this
// layout) so the shared Navbar/Footer and each restyled page (Home, About,
// Contact) all read the same --hp-* theme variables from one place — see
// hangarPublicTheme.ts.
//
// flex-col + main:flex-1 is the standard sticky-footer pattern: min-h-screen
// alone guarantees this wrapper is at least one viewport tall, but without
// a flex layout that extra height just sits *after* the Footer as dead
// space — invisible on a page whose own content already exceeds the
// viewport (Contact, with its tall form), but a visible gap under the
// Footer on a shorter one (About). flex-1 on <main> makes it absorb that
// leftover height instead, so the Footer sits flush at the bottom of the
// viewport on every page, short or tall.
function PublicLayout() {
  return (
    <div className="hgr-pub min-h-screen flex flex-col bg-background text-foreground">
      <style>{HANGAR_PUBLIC_CSS}</style>
      <Toaster richColors position="top-center" theme="dark" />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  );
}
