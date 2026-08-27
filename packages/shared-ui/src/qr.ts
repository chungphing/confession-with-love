"use client";

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const N = 25;

export function drawQr(canvas: HTMLCanvasElement, payload: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const size = canvas.width;
  const cell = size / (N + 2);
  const rand = seededRand(hashString(payload));

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Finder patterns (top-left, top-right, bottom-left).
  const finder = (r0: number, c0: number) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(c0 * cell, r0 * cell, cell * 3, cell * 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((c0 + 1) * cell, (r0 + 1) * cell, cell, cell);
  };

  ctx.fillStyle = "#000000";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inFinder =
        (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3);
      if (inFinder) continue;
      if (rand() > 0.5) {
        ctx.fillRect((c + 1) * cell, (r + 1) * cell, cell * 0.92, cell * 0.92);
      }
    }
  }

  finder(1, 1);
  finder(1, N - 2);
  finder(N - 2, 1);
}
