"use client";

import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "ledger-theme";
const THEME_EVENT = "ledger-theme-change";
const OPTIONS: Theme[] = ["system", "light", "dark"];

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function getServerTheme(): Theme {
  return "system";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Exported so other entry points into the same preference — the command
 * palette's theme actions — write it exactly the way this control does. */
export function setTheme(next: Theme) {
  if (next === "system") {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute("data-theme");
  } else {
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerTheme);

  return (
    <div className={`flex w-fit gap-1 border border-border p-1 ${className}`}>
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setTheme(option)}
          className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors duration-[120ms] ease-standard ${
            theme === option
              ? "bg-accent text-on-accent"
              : "text-foreground hover:bg-fill-hover"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
