"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Confession, REACTIONS } from "@confession/shared";
import { CommentSection } from "./CommentSection";
import { formatRelativeTime, generateComments } from "./comments";

interface ConfessionCardProps {
  confession: Confession | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
}

// Discrete stepped easing for a chunky, pixel-art feel.
const pixelEase = (t: number): number => Math.min(1, Math.floor(t * 6) / 5);

export function ConfessionCard({
  confession,
  onClose,
  onReact,
}: ConfessionCardProps) {
  return (
    <AnimatePresence>
      {confession && (
        <motion.div
          key="viewer"
          className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--overlay-bg)] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-5xl flex-col gap-3 sm:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="relative flex max-h-[50vh] w-full shrink-0 flex-col overflow-y-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-7 shadow-2xl sm:max-h-none sm:w-[55%]"
              style={{
                background: "var(--hl-bg)",
                color: "var(--hl-fg)",
                fontFamily: "var(--hl-font)",
              }}
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.28, ease: pixelEase }}
            >
              <div
                className="absolute -top-3 left-1/2 h-6 w-28 -translate-x-1/2 rounded-[3px] shadow-sm"
                style={{ background: "var(--accent)", opacity: 0.25 }}
              />

              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest opacity-50">
                  Cell ({confession.x}, {confession.y})
                </span>
                <button
                  onClick={onClose}
                  className="grid h-8 w-8 place-items-center rounded-full text-sm opacity-60 transition hover:bg-[var(--hover-bg)] hover:opacity-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <p className="font-serif text-2xl leading-relaxed">
                {confession.message}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] opacity-50">
                <span>anon-{confession.id.slice(0, 4)}</span>
                <span>·</span>
                <span>{formatRelativeTime(confession.createdAt, Date.now())}</span>
                <span>·</span>
                <span>{new Date(confession.createdAt).toLocaleString()}</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {REACTIONS.map((emoji) => {
                  const count = confession.reactions[emoji] ?? 0;
                  return (
                    <button
                      key={emoji}
                      onClick={() => onReact(emoji)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--field-bg)] px-3 py-1.5 text-sm font-semibold text-accent transition hover:scale-105 active:scale-95"
                    >
                      <span>{emoji}</span>
                      <span className="font-mono text-xs">{count}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-auto pt-6 font-mono text-[10px] uppercase tracking-widest opacity-40">
                Sealed permanently
              </p>
            </motion.div>

            <motion.div
              className="flex max-h-[50vh] w-full min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--card)] font-sans shadow-2xl sm:max-h-none"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.28, ease: pixelEase, delay: 0.05 }}
            >
              <CommentSection
                key={confession.id}
                comments={generateComments(confession.id)}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
