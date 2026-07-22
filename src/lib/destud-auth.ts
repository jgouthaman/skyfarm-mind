import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export interface DestudUser {
  id: string;
  full_name: string;
  email: string;
  plan: string | null;
}

// Mirrors verifyAcademyUser (src/lib/academy-auth.ts): no real Supabase Auth
// session for this flow, so verification happens via a SECURITY DEFINER RPC
// against destud_users rather than a client-side select.
export async function verifyDestudUser(name: string, email: string): Promise<DestudUser | null> {
  const { data, error } = await supabase.rpc("verify_destud_user" as any, {
    p_name: name.trim(),
    p_email: email.trim(),
  } as any);
  if (error) throw error;
  return (data as DestudUser) ?? null;
}

// Phase 1 only onboards Explorer and Engineer — Studio/Squadron/Campus plan
// values shouldn't exist yet but are handled defensively rather than assumed
// away, since destud_users.plan is free text (whatever the pricing tier's
// display name was at signup time), not a real enum.
export type DestudTier = "explorer" | "engineer";
export type DestudTierResolution =
  | { kind: "resolved"; tier: DestudTier }
  | { kind: "missing" } // plan is null/empty — default to explorer, log a warning
  | { kind: "unsupported"; raw: string }; // e.g. "Studio"/"Squadron"/"Campus"

export function resolveDestudTier(plan: string | null | undefined): DestudTierResolution {
  const normalized = (plan ?? "").trim().toLowerCase();
  if (!normalized) return { kind: "missing" };
  if (normalized === "explorer") return { kind: "resolved", tier: "explorer" };
  if (normalized === "engineer") return { kind: "resolved", tier: "engineer" };
  return { kind: "unsupported", raw: plan as string };
}

export function destudDashboardPath(tier: DestudTier): "/destud/dashboard/explorer" | "/destud/dashboard/engineer" {
  return tier === "engineer" ? "/destud/dashboard/engineer" : "/destud/dashboard/explorer";
}

// Any-tier session read for pages (like the wizard) that any signed-in
// DeStud user can reach regardless of plan — unlike useDestudSession below,
// this doesn't redirect based on tier, just bounces to /destud if there's no
// session at all.
export function useDestudUser(): DestudUser | null {
  const navigate = useNavigate();
  const [user, setUser] = useState<DestudUser | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("destud_user");
    if (!raw) {
      navigate({ to: "/destud" });
      return;
    }
    setUser(JSON.parse(raw) as DestudUser);
  }, [navigate]);

  return user;
}

// Shared session guard for both tier dashboards: bounces back to /destud if
// there's no cached session, and redirects to the *other* tier's dashboard
// if a signed-in Explorer/Engineer lands on the wrong one directly (e.g. by
// URL). Returns null while redirecting so the caller can render nothing.
export function useDestudSession(expectedTier: DestudTier): DestudUser | null {
  const navigate = useNavigate();
  const [user, setUser] = useState<DestudUser | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("destud_user");
    if (!raw) {
      navigate({ to: "/destud" });
      return;
    }
    const cached = JSON.parse(raw) as DestudUser;
    const resolution = resolveDestudTier(cached.plan);
    const actualTier = resolution.kind === "resolved" ? resolution.tier : "explorer";
    if (actualTier !== expectedTier) {
      navigate({ to: destudDashboardPath(actualTier) });
      return;
    }
    setUser(cached);
  }, [navigate, expectedTier]);

  return user;
}
