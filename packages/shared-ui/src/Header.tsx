"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./theme";
import type { AuthUser } from "./auth";

interface HeaderProps {
  user: AuthUser | null;
  onLogout: () => void;
  liveCount: number;
  onGoTo: (x: number, y: number) => void;
  onConfess: () => void;
}

const COORD_RE = /(\d+)\D+(\d+)/;

export function Header({
  user,
  onLogout,
  liveCount,
  onGoTo,
  onConfess,
}: HeaderProps) {
  const [query, setQuery] = useState("");
  const theme = useTheme();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const match = query.match(COORD_RE);
    if (!match) return;
    onGoTo(Number(match[1]), Number(match[2]));
    setQuery("");
  };

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 shadow-sm backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--panel-border)] bg-[var(--soft-accent)] text-accent transition group-hover:scale-105">
            <Icon icon="clarity:heart-solid" width={18} height={18} />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight md:text-xl">
            Confess
            <span className="ml-1 rounded-full border border-[var(--panel-border)] bg-[var(--soft-accent)] px-1.5 py-0.5 font-sans text-sm font-semibold text-accent">
              with love
            </span>
          </span>
        </Link>

        <div className="hidden h-4 w-px bg-[var(--field-border)] sm:block" />

        <div className="hidden items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--field-bg)] px-2.5 py-1 text-xs font-medium sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
          </span>
          <span className="font-semibold">
            {liveCount.toLocaleString()} whispering
          </span>
          <span className="opacity-40">·</span>
          <span className="opacity-50">drag to pan · scroll to zoom</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <form
          onSubmit={submitSearch}
          className="relative hidden items-center lg:flex"
        >
          <Icon
            icon="clarity:search-line"
            width={14}
            height={14}
            className="pointer-events-none absolute left-2 opacity-40"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Go to brick (e.g. #510, 500)…"
            aria-label="Go to brick"
            className="w-48 rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] py-1.5 pl-7 pr-2.5 text-xs outline-none transition placeholder:opacity-40 focus:border-accent focus:bg-[var(--card)]"
          />
        </form>

        {theme === "minimal" && <ThemeToggle />}

        {user ? (
          <div className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--card)] py-1 pl-1 pr-2 text-xs shadow-sm">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--soft-accent)] text-[11px] font-bold text-accent">
              {user.email[0].toUpperCase()}
            </span>
            <span className="hidden max-w-[160px] truncate font-medium md:inline">
              {user.email}
            </span>
            <button
              onClick={onLogout}
              className="rounded-md px-2 py-0.5 text-[11px] opacity-60 transition hover:bg-[var(--hover-bg)] hover:opacity-100"
              aria-label="Log out"
            >
              Log out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--panel-border)] bg-[var(--card)] transition hover:bg-[var(--hover-bg)]"
            aria-label="Log in"
          >
            <Icon icon="clarity:user-line" width={18} height={18} />
          </Link>
        )}

        <button
          onClick={onConfess}
          className="shadow-pixel inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-on-accent transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <Icon icon="clarity:heart-solid" width={14} height={14} />
          <span>Confess</span>
        </button>
      </div>
    </header>
  );
}
