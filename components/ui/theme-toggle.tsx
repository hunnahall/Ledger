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

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerTheme);

  function handleChange(next: Theme) {
    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute("data-theme", next);
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <div className="flex w-fit gap-1 rounded-md border border-border p-1">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => handleChange(option)}
          className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors duration-150 ${
            theme === option
              ? "bg-foreground text-surface"
              : "text-foreground hover:bg-border/60"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
