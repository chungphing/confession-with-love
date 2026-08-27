"use client";

import { motion } from "framer-motion";
import { Confession } from "@confession/shared";
import { useTheme } from "./theme";

function topReaction(c: Confession): { emoji: string; count: number } | null {
  const entries = Object.entries(c.reactions);
  if (entries.length === 0) return null;
  const [emoji, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return { emoji, count };
}

interface MarqueeCardProps {
  c: Confession;
  theme: "pink" | "minimal";
  onSelect: (c: Confession) => void;
}

function MarqueeCard({ c, theme, onSelect }: MarqueeCardProps) {
  const top = topReaction(c);
  return (
    <motion.button
      onClick={() => onSelect(c)}
      whileHover={theme === "pink" ? { scale: 1.04, rotate: -1 } : { y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="mr-3 flex w-56 shrink-0 flex-col justify-between rounded-[var(--hl-radius)] bg-[var(--hl-bg)] p-3.5 text-left shadow-sm"
      style={{ color: "var(--hl-fg)", fontFamily: "var(--hl-font)" }}
    >
      <p className="line-clamp-2 text-sm leading-snug">{c.message}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] opacity-50">
          ({c.x}, {c.y})
        </span>
        {top && (
          <span className="text-xs font-semibold">
            {top.emoji} {top.count}
          </span>
        )}
      </div>
    </motion.button>
  );
}

interface MarqueeRowProps {
  items: Confession[];
  reverse: boolean;
  duration: number;
  theme: "pink" | "minimal";
  onSelect: (c: Confession) => void;
}

function MarqueeRow({
  items,
  reverse,
  duration,
  theme,
  onSelect,
}: MarqueeRowProps) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex"
        style={{ width: "max-content" }}
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((c, i) => (
          <MarqueeCard key={`${c.id}-${i}`} c={c} theme={theme} onSelect={onSelect} />
        ))}
      </motion.div>
    </div>
  );
}

interface HighlightsProps {
  items: Confession[];
  onSelect: (c: Confession) => void;
}

export function Highlights({ items, onSelect }: HighlightsProps) {
  const theme = useTheme();

  const rows: Confession[][] = [[], [], []];
  items.forEach((c, i) => rows[i % 3].push(c));

  const durations =
    theme === "pink" ? [16, 21, 16] : [30, 40, 30];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] backdrop-blur-md">
      <div className="px-5 pb-2 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest opacity-80">
          Trending
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm opacity-40">
            No confessions yet — be the first to publish.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-3 overflow-hidden py-3">
          {rows.map((row, i) =>
            row.length > 0 ? (
              <MarqueeRow
                key={i}
                items={row}
                reverse={i === 1}
                duration={durations[i % durations.length]}
                theme={theme}
                onSelect={onSelect}
              />
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
