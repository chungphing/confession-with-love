import { randomUUID } from "node:crypto";
import {
  cellKey,
  CELL_PRICE_USD,
  CellCoord,
  Confession,
  LOCK_TTL_MS,
} from "@confession/shared";

export type PublishFn = (event: string, payload: unknown) => void;

export interface CheckoutResult {
  ok: boolean;
  reason?: string;
  txId?: string;
  count?: number;
  expiresAt?: number;
}

export interface ConfirmResult {
  ok: boolean;
  duplicate?: boolean;
  reason?: string;
  confessions?: Confession[];
}

interface Tx {
  txId: string;
  cells: CellCoord[];
  message: string;
  expiresAt: number;
  timer: NodeJS.Timeout;
}

export class GridStore {
  private cells = new Map<string, Confession>();
  private locks = new Map<string, string>();
  private txs = new Map<string, Tx>();
  private processedTx = new Set<string>();

  constructor(private publish: PublishFn) {}

  seed(confessions: Confession[]): void {
    for (const c of confessions) {
      this.cells.set(cellKey(c.x, c.y), c);
      this.processedTx.add(c.txId);
    }
  }

  snapshot(): Confession[] {
    return Array.from(this.cells.values());
  }

  isFilled(x: number, y: number): boolean {
    return this.cells.has(cellKey(x, y));
  }

  isLocked(x: number, y: number): boolean {
    return this.locks.has(cellKey(x, y));
  }

  checkout(cells: CellCoord[], message: string): CheckoutResult {
    const unique = new Map<string, CellCoord>();
    for (const c of cells) {
      const key = cellKey(c.x, c.y);
      if (unique.has(key)) continue;
      if (this.cells.has(key)) return { ok: false, reason: "taken" };
      if (this.locks.has(key)) return { ok: false, reason: "locked" };
      unique.set(key, c);
    }
    if (unique.size === 0) return { ok: false, reason: "bad_request" };

    const list = Array.from(unique.values());
    const txId = randomUUID();
    const expiresAt = Date.now() + LOCK_TTL_MS;

    const timer = setTimeout(() => this.expireTx(txId), LOCK_TTL_MS);

    this.txs.set(txId, { txId, cells: list, message, expiresAt, timer });
    for (const c of list) {
      this.locks.set(cellKey(c.x, c.y), txId);
      this.publish("cell:locked", { x: c.x, y: c.y, expiresAt });
    }

    return { ok: true, txId, count: list.length, expiresAt };
  }

  private expireTx(txId: string): void {
    const tx = this.txs.get(txId);
    if (!tx) return;
    this.txs.delete(txId);
    for (const c of tx.cells) {
      this.locks.delete(cellKey(c.x, c.y));
      this.publish("cell:unlocked", { x: c.x, y: c.y });
    }
  }

  confirmPayment(txId: string): ConfirmResult {
    if (this.processedTx.has(txId)) {
      return { ok: true, duplicate: true };
    }

    const tx = this.txs.get(txId);
    if (!tx) {
      return { ok: false, reason: "unknown_tx" };
    }

    this.processedTx.add(txId);
    clearTimeout(tx.timer);
    this.txs.delete(txId);

    const confessions: Confession[] = [];
    for (const c of tx.cells) {
      const key = cellKey(c.x, c.y);
      this.locks.delete(key);
      if (this.cells.has(key)) continue;

      const confession: Confession = {
        id: randomUUID(),
        txId,
        x: c.x,
        y: c.y,
        message: tx.message,
        createdAt: Date.now(),
        reactions: {},
      };
      this.cells.set(key, confession);
      this.publish("cell:updated", confession);
      confessions.push(confession);
    }

    return { ok: true, confessions };
  }

  react(x: number, y: number, emoji: string): { ok: boolean; confession?: Confession } {
    const key = cellKey(x, y);
    const existing = this.cells.get(key);
    if (!existing) return { ok: false };

    const updated: Confession = {
      ...existing,
      reactions: {
        ...existing.reactions,
        [emoji]: (existing.reactions[emoji] ?? 0) + 1,
      },
    };

    this.cells.set(key, updated);
    this.publish("cell:updated", updated);
    return { ok: true, confession: updated };
  }

  priceUsd(): number {
    return CELL_PRICE_USD;
  }
}
