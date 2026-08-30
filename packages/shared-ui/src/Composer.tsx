"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MAX_MESSAGE_LENGTH } from "@confession/shared";

interface ComposerProps {
  open: boolean;
  cell: { x: number; y: number } | null;
  count: number;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

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
          className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-4"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Write your confession</h2>
                <p className="text-sm opacity-60">
                  {count > 1
                    ? `${count} cells selected`
                    : cell
                      ? `Cell (${cell.x}, ${cell.y})`
                      : "Select a cell"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-sm opacity-60 transition hover:opacity-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {count > 1 && (
              <p className="mb-3 text-xs opacity-50">
                This message will be published on all {count} cells.
              </p>
            )}

            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="What do you need to say?"
              className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-base outline-none placeholder:opacity-40 focus:border-accent"
            />

            <div className="mt-3 flex items-center justify-between">
              <span
                className={`text-xs ${
                  remaining < 20 ? "text-red-400" : "opacity-50"
                }`}
              >
                {remaining}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!valid || submitting}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition disabled:opacity-40"
              >
                {submitting ? "Reserving…" : "Continue to payment"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
