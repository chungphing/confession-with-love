"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CELL_PRICE_USD, MAX_MESSAGE_LENGTH } from "@confession/shared";
import { Icon } from "./icons";

interface ComposerProps {
  open: boolean;
  cell: { x: number; y: number } | null;
  count: number;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

// Discrete stepped easing for a chunky, pixel-art feel.
const pixelEase = (t: number): number => Math.min(1, Math.floor(t * 6) / 5);

export function Composer({ open, cell, count, onClose, onSubmit }: ComposerProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setMessage("");
  }, [open, cell?.x, cell?.y, count]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      textareaRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const remaining = MAX_MESSAGE_LENGTH - message.length;
  const valid = message.trim().length > 0 && remaining >= 0;

  const handleSubmit = () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    onSubmit(message.trim());
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="composer"
          className="absolute inset-0 z-20 flex items-end justify-center bg-[var(--overlay-bg)] p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-2xl backdrop-blur-xl"
            initial={{ y: 32, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.28, ease: pixelEase }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                  ✍️ New whisper
                </p>
                <h2 className="mt-1 font-serif text-2xl font-semibold">
                  Leave a whisper
                </h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full text-sm opacity-50 transition hover:bg-[var(--hover-bg)] hover:opacity-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--panel-border)] bg-[var(--soft-accent)] px-2.5 py-1 font-mono text-accent">
                {count > 1
                  ? `${count} bricks`
                  : cell
                    ? `Cell (${cell.x}, ${cell.y})`
                    : "No brick selected"}
              </span>
              {count > 0 && (
                <span className="rounded-full border border-[var(--panel-border)] bg-[var(--field-bg)] px-2.5 py-1 font-mono opacity-70">
                  ${(CELL_PRICE_USD * count).toFixed(2)}
                </span>
              )}
              {count > 1 && (
                <span className="opacity-50">
                  Published on all {count} bricks.
                </span>
              )}
            </div>

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="What do you need to say?"
              className="h-36 w-full resize-none rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4 font-serif text-base leading-relaxed outline-none transition placeholder:opacity-40 focus:border-accent focus:ring-2 focus:ring-[var(--soft-accent)]"
            />

            <div className="mt-4 flex items-center justify-between">
              <span
                className={`font-mono text-xs ${
                  remaining < 20 ? "text-red-500" : "opacity-50"
                }`}
              >
                {remaining} left
              </span>
              <button
                onClick={handleSubmit}
                disabled={!valid || submitting}
                className="shadow-pixel inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 disabled:shadow-none"
              >
                <Icon icon="clarity:heart-solid" width={14} height={14} />
                {submitting ? "Reserving…" : "Continue to payment"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
