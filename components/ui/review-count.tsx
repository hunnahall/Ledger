"use client";

import { useEffect, useSyncExternalStore } from "react";

// The number of transactions without a Source, shown as a badge on the
// Transactions nav item. The layout streams it in behind Suspense (so the
// shell never waits on it) and hands it to this store; the nav reads it.
let current = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReviewCount() {
  return useSyncExternalStore(subscribe, () => current, () => 0);
}

export function ReviewCountSync({ count }: { count: number }) {
  useEffect(() => {
    if (current === count) return;
    current = count;
    listeners.forEach((l) => l());
  }, [count]);
  return null;
}
