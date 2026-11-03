"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fetchReviewCount } from "@/lib/actions/review-count";

// The number of transactions without a Source, shown as a badge on the
// Transactions nav item. The layout streams it in behind Suspense (so the
// shell never waits on it) and hands it to this store; the nav reads it.
//
// The layout's count alone went stale: a client navigation reuses the
// already-rendered layout, and an edit's refresh doesn't always re-render
// it. So the Transactions page hands over its own count after every render
// (edits there re-render it), and the store refetches the count itself on
// every navigation and whenever the window regains focus.
let current = 0;
let request = 0;
const listeners = new Set<() => void>();

function set(count: number) {
  if (current === count) return;
  current = count;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Only the newest request may write, so a slow older answer can't overwrite
// a fresher one.
export function refreshReviewCount() {
  const id = ++request;
  fetchReviewCount()
    .then((count) => {
      if (id === request) set(count);
    })
    .catch(() => {});
}

export function useReviewCount() {
  return useSyncExternalStore(subscribe, () => current, () => 0);
}

export function ReviewCountSync({ count }: { count: number }) {
  useEffect(() => {
    request++;
    set(count);
  }, [count]);
  return null;
}

// Lives in the (app) layout, inside its Suspense boundary (useSearchParams
// needs one).
export function ReviewCountRefresher() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    refreshReviewCount();
  }, [pathname, search]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refreshReviewCount();
    }
    window.addEventListener("focus", refreshReviewCount);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refreshReviewCount);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
