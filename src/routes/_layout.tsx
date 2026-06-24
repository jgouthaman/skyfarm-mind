import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";

export const Route = createFileRoute("/_layout")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" theme="dark" />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  );
}
