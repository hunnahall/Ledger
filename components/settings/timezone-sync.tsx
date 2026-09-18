"use client";

import { useEffect, useRef } from "react";
import { updateTimezone } from "@/lib/actions/settings";

// settings.timezone defaults to 'UTC', which is also what a brand-new
// account has before the user has ever been asked. Only the browser knows
// where they actually are, so the first authenticated render offers it once.
// A user genuinely in UTC just re-confirms UTC, which is a no-op.
//
// Deliberately one-shot and silent: it never overrides a zone the user has
// explicitly picked in Settings, because it only fires while the stored
// value is still the untouched default.
export function TimezoneSync({ storedTimezone }: { storedTimezone: string }) {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    if (storedTimezone !== "UTC") return;

    let detected: string | undefined;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!detected || detected === "UTC") return;

    attempted.current = true;
    // Best effort — a failure here just leaves the account on UTC, which is
    // the behaviour it had before this existed.
    void updateTimezone(detected);
  }, [storedTimezone]);

  return null;
}
