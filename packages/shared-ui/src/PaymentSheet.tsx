"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckoutResponse } from "@confession/shared";
import { drawQr } from "./qr";

interface PaymentSheetProps {
  checkout: CheckoutResponse | null;
  onClose: () => void;
  onPaid: () => void;
}

export function PaymentSheet({ checkout, onClose, onPaid }: PaymentSheetProps) {
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (checkout && qrRef.current) {
      drawQr(qrRef.current, checkout.qrPayload);
    }
  }, [checkout]);

  const handlePaid = () => {
    if (paying) return;
    setPaying(true);
    onPaid();
  };

  return (
    <AnimatePresence>
      {checkout && (
        <motion.div
          key="payment"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 text-center shadow-2xl"
            initial={{ scale: 0.9, rotateX: -25 }}
            animate={{ scale: 1, rotateX: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <h2 className="text-lg font-semibold">Pay with KHQR</h2>
            <p className="mt-1 text-sm opacity-60">
              {checkout.count > 1
                ? `${checkout.count} cells`
                : `Cell (${checkout.cells[0]?.x}, ${checkout.cells[0]?.y})`}
            </p>

            <div className="mx-auto my-4 w-48 rounded-xl bg-white p-3">
              <canvas
                ref={qrRef}
                width={176}
                height={176}
                className="h-44 w-44"
              />
            </div>

            <div className="text-2xl font-bold">
              ${checkout.amountUsd.toFixed(2)}
            </div>
            <p className="mb-4 text-xs opacity-50">
              Lock expires in 3 minutes
            </p>

            <button
              onClick={handlePaid}
              disabled={paying}
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent transition disabled:opacity-40"
            >
              {paying ? "Confirming…" : "Simulate scan & pay"}
            </button>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-full px-5 py-2 text-sm opacity-60 transition hover:opacity-100"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
