import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { BACKEND_PORT, CheckoutBulkRequest, CheckoutRequest, CellCoord, PaymentWebhook, ReactionRequest } from "@confession/shared";
import { GridStore } from "./store.js";
import { buildSeed } from "./seed.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const store = new GridStore((event, payload) => {
  io.emit(event, payload);
});

store.seed(buildSeed());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/grid", (_req, res) => {
  res.json({ confessions: store.snapshot() });
});

app.post("/api/checkout", (req, res) => {
  const { x, y, message } = (req.body ?? {}) as Partial<CheckoutRequest>;

  if (typeof x !== "number" || typeof y !== "number" || typeof message !== "string") {
    return res.status(400).json({ ok: false, reason: "bad_request" });
  }
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return res.status(400).json({ ok: false, reason: "bad_request" });
  }
  if (message.trim().length === 0) {
    return res.status(400).json({ ok: false, reason: "empty_message" });
  }

  const result = store.checkout([{ x, y }], message.trim());
  if (!result.ok) {
    return res.status(409).json(result);
  }

  return res.json({
    ok: true,
    txId: result.txId,
    cells: [{ x, y }],
    count: result.count,
    amountUsd: store.priceUsd() * (result.count ?? 1),
    qrPayload: `KHQR://confession-grid?tx=${result.txId}&cell=${x},${y}`,
    expiresAt: result.expiresAt,
  });
});

app.post("/api/checkout/bulk", (req, res) => {
  const { cells, message } = (req.body ?? {}) as Partial<CheckoutBulkRequest>;

  if (typeof message !== "string" || !Array.isArray(cells)) {
    return res.status(400).json({ ok: false, reason: "bad_request" });
  }
  const validCells = cells.filter(
    (c): c is CellCoord =>
      c != null &&
      Number.isInteger(c.x) &&
      Number.isInteger(c.y) &&
      c.x >= 0 &&
      c.x < 1000 &&
      c.y >= 0 &&
      c.y < 1000,
  );
  if (validCells.length === 0 || validCells.length > 100) {
    return res.status(400).json({ ok: false, reason: "bad_request" });
  }
  if (message.trim().length === 0) {
    return res.status(400).json({ ok: false, reason: "empty_message" });
  }

  const result = store.checkout(validCells, message.trim());
  if (!result.ok) {
    return res.status(409).json(result);
  }

  return res.json({
    ok: true,
    txId: result.txId,
    cells: validCells,
    count: result.count,
    amountUsd: store.priceUsd() * (result.count ?? 1),
    qrPayload: `KHQR://confession-grid?tx=${result.txId}&count=${result.count}`,
    expiresAt: result.expiresAt,
  });
});

app.post("/api/webhook/payment", (req, res) => {
  const { txId } = (req.body ?? {}) as Partial<PaymentWebhook>;
  if (typeof txId !== "string" || txId.length === 0) {
    return res.status(400).json({ ok: false, reason: "bad_request" });
  }

  const result = store.confirmPayment(txId);
  if (!result.ok) {
    return res.status(409).json(result);
  }

  return res.json({ ok: true, duplicate: !!result.duplicate, confessions: result.confessions ?? [] });
});

app.post("/api/reactions", (req, res) => {
  const { x, y, emoji } = (req.body ?? {}) as Partial<ReactionRequest>;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    typeof emoji !== "string" ||
    emoji.length === 0
  ) {
    return res.status(400).json({ ok: false, reason: "bad_request" });
  }

  const result = store.react(x, y, emoji);
  if (!result.ok) {
    return res.status(404).json({ ok: false, reason: "not_found" });
  }
  return res.json({ ok: true, confession: result.confession });
});

io.on("connection", (socket) => {
  socket.emit("ready", { confessions: store.snapshot() });
});

server.listen(BACKEND_PORT, () => {
  console.log(`[backend] listening on http://localhost:${BACKEND_PORT}`);
});
