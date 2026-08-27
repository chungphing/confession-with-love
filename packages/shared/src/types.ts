export const GRID_SIZE = 1000;
export const CELL_PRICE_USD = 0.5;
export const MAX_MESSAGE_LENGTH = 280;
export const LOCK_TTL_MS = 3 * 60 * 1000;

export const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const cellKey = (x: number, y: number): string => `${x}:${y}`;

export interface CellCoord {
  x: number;
  y: number;
}

export interface Confession {
  id: string;
  txId: string;
  x: number;
  y: number;
  message: string;
  createdAt: number;
  reactions: Record<string, number>;
}

export interface ReactionRequest {
  x: number;
  y: number;
  emoji: string;
}

export interface CheckoutRequest {
  x: number;
  y: number;
  message: string;
}

export interface CheckoutBulkRequest {
  cells: CellCoord[];
  message: string;
}

export interface CheckoutResponse {
  txId: string;
  cells: CellCoord[];
  count: number;
  amountUsd: number;
  qrPayload: string;
  expiresAt: number;
}

export interface PaymentWebhook {
  txId: string;
}

export interface GridSnapshotResponse {
  confessions: Confession[];
}
