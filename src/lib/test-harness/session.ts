import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

// Test Harness session guard — same lightweight sessionStorage-flag
// pattern as the-hangar's useHangarSession (src/lib/the-hangar/session.ts),
// a distinct key ("th_session"), fully isolated from it and from any other
// auth in this app. No real auth: the login page's single hardcoded
// username/password check is the only gate.
const TH_SESSION_KEY = "th_session";

export function markThSessionActive() {
  sessionStorage.setItem(TH_SESSION_KEY, "1");
}

export function useThSession(): boolean {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(TH_SESSION_KEY)) {
      navigate({ to: "/t-h/login" });
      return;
    }
    setReady(true);
  }, [navigate]);

  return ready;
}
