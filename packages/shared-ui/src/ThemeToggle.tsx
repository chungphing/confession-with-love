"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./icons";

type ColorMode = "light" | "dark";

const STORAGE_KEY = "cw-color-mode";

function currentMode(): ColorMode {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ColorMode>("light");

  useEffect(() => {
    setMode(currentMode());
  }, []);

  const toggle = useCallback(() => {
    const next: ColorMode = currentMode() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    setMode(next);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle color theme"
      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--panel-border)] bg-[var(--card)] transition hover:bg-[var(--hover-bg)]"
    >
      <Icon
        icon={mode === "dark" ? "clarity:sun-line" : "clarity:moon-line"}
        width={18}
        height={18}
      />
    </button>
  );
}
