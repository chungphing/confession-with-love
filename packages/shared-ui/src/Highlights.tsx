"use client";

import { motion } from "framer-motion";
import { Confession } from "@confession/shared";
import { formatRelativeTime } from "./comments";
import { Icon } from "./icons";

interface HighlightsProps {
  items: Confession[];
  onSelect: (c: Confession) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function heartCount(c: Confession): number {
  return c.reactions["❤️"] ?? 0;
}

export function Highlights({ items, onSelect }: HighlightsProps) {
  const now = Date.now();
  const today = items.filter((c) => now - c.createdAt < DAY_MS).length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-2xl backdrop-blur-xl">
      <div className="shrink-0 border-b border-[var(--panel-border)] p-6 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest opacity-60">
              Trending Whispers
            </h2>
          </div>
          <span className="rounded-full border border-[var(--panel-border)] bg-[var(--soft-accent)] px-2 py-0.5 text-[11px] font-semibold text-accent">
            {today} today
          </span>
        </div>

        <div className="relative mt-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--card)] p-3.5 shadow-sm">
          <div className="absolute -top-2 left-6 rounded bg-[var(--soft-accent)] px-3 py-0.5 text-[10px] font-medium tracking-wide text-accent">
            ✨ Daily Prompt
          </div>
          <p className="mt-1 font-serif text-[13px] leading-snug">
            “What is something you never had the courage to say aloud to someone
            you loved?”
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <span className="opacity-50">142 answers whispered</span>
            <button className="font-semibold text-accent transition hover:opacity-80">
              Answer prompt ✍️
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {items.length === 0 ? (
          <p className="px-2 py-6 text-sm opacity-40">
            No whispers yet — be the first to leave one.
          </p>
        ) : (
          items.map((c) => (
            <motion.button
              key={c.id}
              onClick={() => onSelect(c)}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="block w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--card)] p-4 text-left transition hover:border-[var(--accent)] hover:shadow-md"
            >
              <p className="font-serif text-[15px] leading-relaxed">
                “{c.message}”
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono text-[11px] opacity-40">
                  <span>
                    ({c.x}, {c.y})
                  </span>
                  <span>·</span>
                  <span>{formatRelativeTime(c.createdAt, now)}</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--panel-border)] bg-[var(--soft-accent)] px-2.5 py-1 text-xs font-semibold text-accent">
                  <Icon icon="clarity:heart-solid" width={12} height={12} />
                  {heartCount(c)}
                </span>
              </div>
            </motion.button>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--panel-border)] bg-[var(--field-bg)] p-3 text-center text-[11px] font-medium opacity-60">
        Encrypted &amp; anonymous · Sealed permanently
      </div>
    </div>
  );
}
