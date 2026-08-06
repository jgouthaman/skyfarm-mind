import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

// Fully isolated from destud-auth.ts — a distinct sessionStorage key
// ("hangar_session", set by the-hangar.index.tsx's stubbed Flight Deck
// login) and its own hook, not shared with /destud in any way. Shared only
// between The Hangar's own route files (welcome, mission, and future bay
// pages) so the guard isn't duplicated across each one.
export function useHangarSession(): boolean {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("hangar_session")) {
      navigate({ to: "/the-hangar" });
      return;
    }
    setReady(true);
  }, [navigate]);

  return ready;
}
