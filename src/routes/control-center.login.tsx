import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plane, Smartphone, ArrowRight, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/control-center/login")({
  head: () => ({
    meta: [
      { title: "AtomSky Control Center — Login" },
      { name: "description", content: "Secure access for drone operations and aerial intelligence." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const isMobileValid = /^\d{10}$/.test(mobile);
  const isOtpValid = /^\d{5}$/.test(otp);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMobileValid) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSent(true);
    setOtp("");
    toast.success("Demo OTP sent");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtpValid) {
      toast.error("Please enter a valid 5-digit OTP.");
      return;
    }

    const expectedOtp = mobile.slice(-5);
    if (otp === expectedOtp) {
      toast.success("Welcome to AtomSky Control Center");
      setTimeout(() => navigate({ to: "/control-center" }), 300);
    } else {
      toast.error("Invalid OTP. Please enter the last 5 digits of your mobile number.");
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    if (digitsOnly.length <= 10) {
      setMobile(digitsOnly);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    if (digitsOnly.length <= 5) {
      setOtp(digitsOnly);
    }
  };

  const handleBackToMobile = () => {
    setOtpSent(false);
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      <Toaster richColors position="top-center" theme="dark" />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

      <header className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-semibold text-lg">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-primary shadow-glow">
            <Plane className="h-4 w-4 text-primary-foreground" />
          </span>
          <span>AtomSky</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-md px-5 pt-10 pb-20">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary/90 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
            <Shield className="h-3.5 w-3.5" /> Secure access
          </span>
          <h1 className="mt-5 text-3xl sm:text-4xl font-semibold">AtomSky Control Center</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Secure access for drone operations, aerial intelligence, and vertical-specific mission control.
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6 shadow-card space-y-5">
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={mobile}
                  onChange={handleMobileChange}
                  className="pl-9"
                  placeholder="9876543210"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">Enter your 10-digit mobile number to receive a demo OTP.</p>
            </div>

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              Send OTP <ArrowRight className="ml-1 h-4 w-4" />
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Protected by AtomSky aerospace-grade access controls.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-6 shadow-card space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="otp">Enter OTP</Label>
                <button type="button" onClick={handleBackToMobile} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Change number
                </button>
              </div>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="otp"
                  type="tel"
                  inputMode="numeric"
                  maxLength={5}
                  required
                  value={otp}
                  onChange={handleOtpChange}
                  className="pl-9 tracking-[0.3em] text-center font-mono text-lg"
                  placeholder="• • • • •"
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              Verify & Login <ArrowRight className="ml-1 h-4 w-4" />
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Demo mode — no real SMS is sent.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
