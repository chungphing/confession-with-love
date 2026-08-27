"use client";

import { useEffect, useState } from "react";

export type ThemeName = "pink" | "minimal";

export function readTheme(): ThemeName {
  if (typeof window === "undefined") return "pink";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--cw-theme")
    .trim();
  return v === "minimal" ? "minimal" : "pink";
}

export function useTheme(): ThemeName {
  const [theme, setTheme] = useState<ThemeName>(() =>
    typeof window === "undefined" ? "pink" : readTheme(),
  );

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  return theme;
}

