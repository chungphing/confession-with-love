"use client";

import Link from "next/link";
import { Icon } from "./icons";
import type { AuthUser } from "./auth";

interface HeaderProps {
  user: AuthUser | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-on-accent">
          <Icon icon="clarity:heart-solid" />
        </span>
        <span className="text-lg font-bold tracking-tight">Confess</span>
      </div>

      {user ? (
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent">
            {user.email[0].toUpperCase()}
          </span>
          <span className="hidden max-w-[180px] truncate text-sm font-semibold sm:block">
            {user.email}
          </span>
          <button
            onClick={onLogout}
            className="rounded-full px-3 py-1.5 text-xs font-semibold opacity-60 transition hover:opacity-100"
            aria-label="Log out"
          >
            Log out
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-semibold transition hover:bg-white/20"
          aria-label="Log in"
        >
          <Icon icon="clarity:user-line" width={18} height={18} />
        </Link>
      )}
    </header>
  );
}
