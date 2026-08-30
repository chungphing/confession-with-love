"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Confession, REACTIONS } from "@confession/shared";
import { useTheme } from "./theme";
import { CommentSection } from "./CommentSection";
import { generateComments } from "./comments";

interface ConfessionCardProps {
  confession: Confession | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
}

export function ConfessionCard({
  confession,
  onClose,
  onReact,
}: ConfessionCardProps) {
  const theme = useTheme();
  const isPink = theme === "pink";

  return (
    <AnimatePresence>
      {confession && (
        <motion.div
          key="viewer"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col gap-3 sm:flex-row" onClick={(e) => e.stopPropagation()}>
            <motion.div
              className="flex max-h-[50vh] w-full shrink-0 flex-col overflow-y-auto rounded-[var(--panel-radius)] p-7 shadow-2xl sm:max-h-none sm:w-[55%]"
              style={{
                background: "var(--hl-bg)",
                color: "var(--hl-fg)",
                fontFamily: "var(--hl-font)",
                transformStyle: "preserve-3d",
                perspective: 1000,
              }}
              initial={isPink ? { rotateY: -90, opacity: 0 } : { opacity: 0, y: 24 }}
              animate={isPink ? { rotateY: 0, opacity: 1 } : { opacity: 1, y: 0 }}
              exit={isPink ? { rotateY: 90, opacity: 0 } : { opacity: 0, y: 24 }}
              transition={
                isPink
                  ? { type: "spring", stiffness: 200, damping: 24 }
                  : { duration: 0.25, ease: "easeOut" }
              }
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest opacity-50">
                  Cell ({confession.x}, {confession.y})
                </span>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 text-sm opacity-60 transition hover:opacity-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <p className="text-xl leading-relaxed">{confession.message}</p>
              <p className="mt-2 text-xs opacity-40">
                {new Date(confession.createdAt).toLocaleString()}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {REACTIONS.map((emoji) => {
                  const count = confession.reactions[emoji] ?? 0;
                  return (
                    <button
                      key={emoji}
                      onClick={() => onReact(emoji)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition hover:scale-105 active:scale-95 ${
                        isPink
                          ? "border-black/10 bg-black/5 hover:bg-black/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-semibold">{count}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              className="flex max-h-[50vh] w-full min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-card font-sans shadow-2xl sm:max-h-none"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
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
