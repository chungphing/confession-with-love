"use client";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-base text-on-accent">
          ♥
        </span>
        <span className="text-lg font-bold tracking-tight">Confess</span>
      </div>

      <button
        className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sm font-semibold transition hover:bg-white/20"
        aria-label="Profile"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      </button>
    </header>
  );
}
