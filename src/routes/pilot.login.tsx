import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Plane, Leaf, Shield } from "lucide-react";
import { pilotStore } from "@/lib/pilot-store";
import { getPilotByPhone } from "@/lib/cloud-api";

export const Route = createFileRoute("/pilot/login")({
  head: () => ({ meta: [{ title: "AgriSky Pilot — Login" }] }),
  component: PilotLogin,
});

function PilotLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);

  const sendOtp = () => {
    if (mobile.length !== 10) return toast.error("Enter a valid 10-digit mobile number");
    setSent(true);
    toast.success("Demo OTP sent");
  };
  const verify = async () => {
    if (otp.length !== 5) return toast.error("OTP must be exactly 5 digits");
    if (otp !== mobile.slice(-5)) return toast.error("Invalid OTP. Please enter the last 5 digits of your mobile number.");
    let name = "Pilot";
    try {
      const p = await getPilotByPhone(mobile);
      if (!p) {
        return toast.error("No pilot registered with this mobile number. Ask Control Center to add you first.");
      }
      name = p.name;
    } catch (e) {
      return toast.error((e as Error).message);
    }
    pilotStore.login(name, mobile);
    toast.success(`Welcome ${name}`);
    setTimeout(() => navigate({ to: "/field" }), 250);
  };

  return (
    <div className="min-h-screen bg-gradient-hero grid-bg flex items-center justify-center p-5">
      <Toaster richColors position="top-center" theme="dark" />
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="grid place-items-center h-10 w-10 rounded-xl bg-gradient-primary shadow-glow">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </span>
          <div className="text-left">
            <div className="font-display font-semibold leading-none">AtomSky</div>
            <div className="text-xs text-muted-foreground">AgriSky Pilot App</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-xs text-accent mb-3">
            <Leaf className="h-3.5 w-3.5" /> Field operations gateway
          </div>
          <h1 className="text-xl font-semibold">Pilot sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Verify your mobile number to access today's missions.</p>

          <label className="text-xs text-muted-foreground mt-5 block">Mobile number</label>
          <input
            inputMode="numeric"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile"
            className="mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-base outline-none focus:ring-2 focus:ring-ring"
          />

          {!sent ? (
            <Button onClick={sendOtp} className="mt-4 w-full h-12 bg-gradient-primary text-primary-foreground">Send OTP</Button>
          ) : (
            <>
              <label className="text-xs text-muted-foreground mt-4 block">Enter OTP</label>
              <input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="5-digit OTP"
                className="mt-1 w-full h-12 rounded-lg bg-input/40 border border-border/60 px-3 text-center text-lg tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={verify} className="mt-4 w-full h-12 bg-gradient-agri text-primary-foreground">Verify & Login</Button>
              <button onClick={() => { setSent(false); setOtp(""); }} className="mt-3 text-xs text-muted-foreground hover:text-foreground w-full text-center">Change number</button>
            </>
          )}

          <p className="mt-5 text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Shield className="h-3 w-3 mt-0.5 shrink-0" />
            OTP validation uses the last 5 digits of the entered mobile number for demo.
          </p>
        </div>

        <div className="text-center mt-5">
          <Link to="/control-center" className="text-xs text-muted-foreground hover:text-foreground">Go to Control Center →</Link>
        </div>
      </div>
    </div>
  );
}
