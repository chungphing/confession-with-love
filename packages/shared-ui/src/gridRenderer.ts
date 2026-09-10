import { Confession, GRID_SIZE } from "@confession/shared";
import clarity from "@iconify-json/clarity/icons.json";

export interface Camera {
  scale: number;
  ox: number;
  oy: number;
}

export interface Palette {
  bg: string;
  dot: string;
  cellEmpty: string;
  cellEmptyBorder: string;
  cellFilled: string;
  cellFilledBorder: string;
  cellLocked: string;
  cellLockedBorder: string;
  cellSelected: string;
  cellHover: string;
  cellIcon: string;
  gridLine: string;
  cellRadius: number;
  flameOuter: string;
  flameMid: string;
  flameCore: string;
  theme: "pink" | "minimal";
}

export interface LockedCell {
  x: number;
  y: number;
}

// World-unit size of a single cell (rectangle, wider than tall).
export const CELL_W = 1.6;
export const CELL_H = 1;

export const MAX_SCALE = 80;
const INITIAL_SCALE_FRACTION = 0.8;
const CARD_MIN_PX = 12;

export const GRID_WORLD_W = GRID_SIZE * CELL_W;
export const GRID_WORLD_H = GRID_SIZE * CELL_H;

export function fitCamera(width: number, height: number): Camera {
  const scale = Math.min(width / GRID_WORLD_W, height / GRID_WORLD_H);
  return {
    scale,
    ox: (width - GRID_WORLD_W * scale) / 2,
    oy: (height - GRID_WORLD_H * scale) / 2,
  };
}

export function initialCamera(width: number, height: number): Camera {
  const scale = Math.max(MAX_SCALE * INITIAL_SCALE_FRACTION, 1);
  const cx = (GRID_SIZE / 2 + 0.5) * CELL_W;
  const cy = (GRID_SIZE / 2 + 0.5) * CELL_H;
  return {
    scale,
    ox: width / 2 - cx * scale,
    oy: height / 2 - cy * scale,
  };
}

export function screenToCell(
  cam: Camera,
  sx: number,
  sy: number,
): { x: number; y: number } {
  const wx = (sx - cam.ox) / cam.scale;
  const wy = (sy - cam.oy) / cam.scale;
  return { x: Math.floor(wx / CELL_W), y: Math.floor(wy / CELL_H) };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// --- pixel-art buttons + icons (retro accents) ---

const PIXEL_HEART = [
  "011000110",
  "111111111",
  "111111111",
  "111111111",
  "011111110",
  "001111100",
  "000111000",
  "000010000",
];

function extractPaths(body: string): string[] {
  const paths: string[] = [];
  const tagRe = /<path\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(body))) {
    const tag = match[0];
    if (tag.includes('fill="none"')) continue;
    const d = tag.match(/\bd="([^"]+)"/)?.[1];
    if (d) paths.push(d);
  }
  return paths;
}

const CHECK_PATHS = extractPaths(
  (clarity.icons["check-line"] as { body: string }).body,
);

let checkPathCache: Path2D[] | null = null;

function getCheckPaths(): Path2D[] {
  if (typeof Path2D === "undefined") return [];
  if (!checkPathCache) {
    checkPathCache = CHECK_PATHS.map((d) => new Path2D(d));
  }
  return checkPathCache;
}

function snapValue(ctx: CanvasRenderingContext2D, v: number): number {
  const s = ctx.getTransform().a || 1;
  return Math.round(v * s) / s;
}

// Pixel-art rounded rect: a stair-stepped corner built from unit pixel dots
// (not an arc). All coordinates are assumed integer/device-snapped.
function pixelRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const cr = Math.max(0, Math.min(r, Math.floor(Math.min(w, h) / 2)));
  ctx.beginPath();
  if (cr === 0) {
    ctx.rect(x, y, w, h);
    return;
  }

  ctx.moveTo(x + cr, y);
  ctx.lineTo(x + w - cr, y);
  for (let i = 0; i < cr; i++) {
    ctx.lineTo(x + w - cr + i, y + i + 1);
    ctx.lineTo(x + w - cr + i + 1, y + i + 1);
  }
  ctx.lineTo(x + w, y + h - cr);
  for (let i = 0; i < cr; i++) {
    ctx.lineTo(x + w - i - 1, y + h - cr + i);
    ctx.lineTo(x + w - i - 1, y + h - cr + i + 1);
  }
  ctx.lineTo(x + cr, y + h);
  for (let i = 0; i < cr; i++) {
    ctx.lineTo(x + cr - i - 1, y + h - i);
    ctx.lineTo(x + cr - i - 1, y + h - i - 1);
  }
  ctx.lineTo(x, y + cr);
  for (let i = 0; i < cr; i++) {
    ctx.lineTo(x + i + 1, y + cr - i);
    ctx.lineTo(x + i + 1, y + cr - i - 1);
  }
  ctx.closePath();
}

function drawPixelButton(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  h: number,
  base: string,
  outline?: string,
): void {
  const x = snapValue(ctx, sx);
  const y = snapValue(ctx, sy);
  const ww = Math.max(1, snapValue(ctx, w));
  const hh = Math.max(1, snapValue(ctx, h));
  const border = Math.max(1, Math.round(Math.min(ww, hh) * 0.08));
  const bevel = Math.max(1, Math.round(hh * 0.044));
  const corner = Math.max(1, Math.round(Math.min(ww, hh) * 0.05));
  const faceW = Math.max(1, ww - border * 2);
  const faceH = Math.max(1, hh - border * 2);
  const highlight = Math.max(1, Math.round(border * 0.6));

  ctx.save();
  pixelRoundRectPath(ctx, x, y, ww, hh, corner);
  ctx.clip();

  if (outline) {
    ctx.fillStyle = outline;
    ctx.fillRect(x, y, ww, hh);
  } else {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, ww, hh);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x, y, ww, hh);
  }

  ctx.fillStyle = base;
  ctx.fillRect(x + border, y + border, faceW, faceH);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x + border, y + hh - border - bevel, faceW, bevel);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(x + border, y + border, faceW, highlight);

  ctx.restore();
}

function drawPixelHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha: number,
): void {
  const cols = PIXEL_HEART[0].length;
  const rows = PIXEL_HEART.length;
  const px = Math.max(1, Math.floor(size / cols));
  const originX = snapValue(ctx, cx - (cols * px) / 2);
  const originY = snapValue(ctx, cy - (rows * px) / 2);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (PIXEL_HEART[r][c] !== "1") continue;
      ctx.fillRect(originX + c * px, originY + r * px, px, px);
    }
  }
  ctx.restore();
}

function drawCheck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  alpha: number,
): void {
  const paths = getCheckPaths();
  if (paths.length === 0) return;
  const scale = size / 36;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.translate(snapValue(ctx, cx - size / 2), snapValue(ctx, cy - size / 2));
  ctx.scale(scale, scale);
  for (const p of paths) ctx.fill(p);
  ctx.restore();
}

// --- "hot" brick fire effect ---

const FLAME_COLS = 12;
const FLAME_ROWS = 16;
const FLAME_FRAMES = 6;

// Deterministic value noise so server and client build identical sprites.
function flameRand(a: number, b: number): number {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// Pixel-art flame frames, generated once. Chars: "." empty, "o" outer,
// "y" mid, "w" core. Each frame has a taller core and a drifting tongue.
const PIXEL_FLAME: string[][] = (() => {
  const frames: string[][] = [];
  for (let f = 0; f < FLAME_FRAMES; f++) {
    const heights: number[] = [];
    const tongue = (f / FLAME_FRAMES) * FLAME_COLS;
    for (let c = 0; c < FLAME_COLS; c++) {
      const nx = (c - (FLAME_COLS - 1) / 2) / ((FLAME_COLS - 1) / 2);
      const base = Math.pow(1 - Math.abs(nx), 0.8);
      let height = base * (FLAME_ROWS - 2);
      height += (flameRand(f, c) - 0.5) * 3.5;
      if (Math.abs(c - tongue) < 1.3) height += 3;
      heights.push(
        Math.max(1, Math.min(FLAME_ROWS - 1, Math.round(height))),
      );
    }

    const rows: string[] = [];
    for (let r = 0; r < FLAME_ROWS; r++) {
      let row = "";
      for (let c = 0; c < FLAME_COLS; c++) {
        const fromBottom = FLAME_ROWS - 1 - r;
        if (fromBottom < heights[c]) {
          const nx = (c - (FLAME_COLS - 1) / 2) / ((FLAME_COLS - 1) / 2);
          const heat =
            (1 - fromBottom / heights[c]) * 0.5 + (1 - Math.abs(nx)) * 0.5;
          row += heat > 0.72 ? "w" : heat > 0.45 ? "y" : "o";
        } else {
          row += ".";
        }
      }
      rows.push(row);
    }
    frames.push(rows);
  }
  return frames;
})();

let reducedMotionCache: boolean | null = null;

function prefersReducedMotion(): boolean {
  if (reducedMotionCache === null) {
    reducedMotionCache =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return reducedMotionCache;
}

function drawFlameSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  width: number,
  frame: number,
  alpha: number,
  palette: Palette,
): void {
  const sprite =
    PIXEL_FLAME[((frame % FLAME_FRAMES) + FLAME_FRAMES) % FLAME_FRAMES];
  const px = Math.max(1, Math.floor(width / FLAME_COLS));
  const originX = snapValue(ctx, cx - (FLAME_COLS * px) / 2);
  const originY = snapValue(ctx, baseY - FLAME_ROWS * px);

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let r = 0; r < FLAME_ROWS; r++) {
    const row = sprite[r];
    for (let c = 0; c < FLAME_COLS; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      ctx.fillStyle =
        ch === "w"
          ? palette.flameCore
          : ch === "y"
            ? palette.flameMid
            : palette.flameOuter;
      ctx.fillRect(originX + c * px, originY + r * px, px, px);
    }
  }
  ctx.restore();
}

// Blazing perimeter fire: a wall of flames across the top, side licks,
// a pulsing whole-brick glow and rising embers. The face stays clear.
function drawBrickFire(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  h: number,
  seed: number,
  frame: number,
  time: number,
  palette: Palette,
  radius: number,
): void {
  const cx = sx + w / 2;
  const cy = sy + h / 2;
  const reduced = prefersReducedMotion();
  const flick = reduced ? 1 : 0.82 + 0.18 * Math.sin(time * 0.006 + seed);

  // Whole-brick glow.
  const glowR = Math.max(w, h) * 0.9;
  ctx.save();
  ctx.globalAlpha = 0.5 * flick;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  glow.addColorStop(0, palette.flameMid);
  glow.addColorStop(0.55, palette.flameOuter);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Warm rim hugging the brick.
  ctx.save();
  ctx.globalAlpha = 0.55 * flick;
  ctx.strokeStyle = palette.flameMid;
  ctx.lineWidth = Math.max(1, w * 0.03);
  roundRectPath(ctx, sx, sy, w, h, radius);
  ctx.stroke();
  ctx.restore();

  // Wall of flames across the full top edge.
  const topCount = Math.max(3, Math.min(6, Math.round(w / (h * 0.6))));
  const drawW = (w * 1.6) / topCount;
  for (let i = 0; i < topCount; i++) {
    const t = topCount === 1 ? 0.5 : i / (topCount - 1);
    const fx = sx + t * w;
    const jitter = reduced
      ? 0
      : Math.sin(time * 0.004 + i * 1.7 + seed) * h * 0.06;
    drawFlameSprite(
      ctx,
      fx,
      sy + h * 0.15 + jitter,
      drawW,
      frame + i * 2,
      0.95 * flick,
      palette,
    );
  }

  // Side licks climbing the vertical edges.
  drawFlameSprite(
    ctx,
    sx + w * 0.08,
    sy + h * 0.55,
    w * 0.4,
    frame + 3,
    0.85 * flick,
    palette,
  );
  drawFlameSprite(
    ctx,
    sx + w * 0.92,
    sy + h * 0.55,
    w * 0.4,
    frame + 5,
    0.85 * flick,
    palette,
  );

  // Rising embers.
  if (!reduced) {
    const ember = Math.max(1, w * 0.035);
    for (let i = 0; i < 6; i++) {
      const ex = sx + w * (0.12 + 0.76 * flameRand(seed + i, i * 3.1));
      const speed = 0.02 + 0.02 * flameRand(i, seed);
      const prog = ((time * speed + flameRand(i, seed + 7) * 100) % 100) / 100;
      const ey = sy - prog * h * 1.2;
      ctx.save();
      ctx.globalAlpha = (1 - prog) * 0.8;
      ctx.fillStyle = prog < 0.5 ? palette.flameCore : palette.flameOuter;
      ctx.fillRect(snapValue(ctx, ex), snapValue(ctx, ey), ember, ember);
      ctx.restore();
    }
  }
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cam: Camera,
  confessions: Map<string, Confession>,
  locked: Map<string, LockedCell>,
  selected: { x: number; y: number } | null,
  hover: { x: number; y: number } | null,
  palette: Palette,
  selectedCells: Set<string> | null = null,
  hotKeys: Set<string> | null = null,
): void {
  // Transparent canvas: the dotted parchment pattern shows through from CSS.
  ctx.clearRect(0, 0, width, height);

  const cellW = CELL_W * cam.scale;
  const cellH = CELL_H * cam.scale;

  // Visible cell bounds.
  const xStart = Math.max(0, Math.floor(-cam.ox / cam.scale / CELL_W));
  const xEnd = Math.min(GRID_SIZE, Math.ceil((width - cam.ox) / cam.scale / CELL_W));
  const yStart = Math.max(0, Math.floor(-cam.oy / cam.scale / CELL_H));
  const yEnd = Math.min(GRID_SIZE, Math.ceil((height - cam.oy) / cam.scale / CELL_H));

  const toScreenX = (x: number) => x * cellW + cam.ox;
  const toScreenY = (y: number) => y * cellH + cam.oy;

  const margin = Math.min(cellW, cellH) * 0.1;
  const cardW = Math.max(0, cellW - margin * 2);
  const cardH = Math.max(0, cellH - margin * 2);
  const radius = Math.max(2, Math.min(cardW, cardH) * 0.18);
  const isPink = palette.theme === "pink";

  const inView = (x: number, y: number) =>
    x >= xStart && x < xEnd && y >= yStart && y < yEnd;

  const drawBrick = (x: number, y: number, fill: string, border: string) => {
    const sx = toScreenX(x) + margin;
    const sy = toScreenY(y) + margin;
    if (cellW >= CARD_MIN_PX) {
      roundRectPath(ctx, sx, sy, cardW, cardH, radius);
      ctx.fillStyle = fill;
      ctx.fill();

      // Tight paper depth: top highlight + bottom shadow (no blur).
      const inset = radius * 0.6;
      const lineW = Math.max(1, cardW - inset * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(sx + inset, sy + 1, lineW, 1);
      ctx.fillStyle = "rgba(80,60,40,0.07)";
      ctx.fillRect(sx + inset, sy + cardH - 2, lineW, 1);

      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      roundRectPath(ctx, sx, sy, cardW, cardH, radius);
      ctx.stroke();
    } else {
      ctx.fillStyle = fill;
      ctx.fillRect(sx, sy, cardW, cardH);
    }
  };

  const drawCellIcon = (x: number, y: number) => {
    if (cellW < CARD_MIN_PX) return;
    const sx = toScreenX(x) + margin;
    const sy = toScreenY(y) + margin;
    const iconSize = Math.min(cardW, cardH) * 0.6;
    const cx = sx + cardW / 2;
    const cy = sy + cardH / 2;
    if (isPink) {
      drawPixelHeart(ctx, cx, cy, iconSize, palette.cellIcon, 0.9);
    } else {
      drawCheck(ctx, cx, cy, iconSize, palette.cellIcon, 0.9);
    }
  };

  const drawClaimed = (x: number, y: number) => {
    if (cellW < CARD_MIN_PX) {
      ctx.fillStyle = palette.cellFilled;
      ctx.fillRect(
        toScreenX(x),
        toScreenY(y),
        Math.max(1, cellW),
        Math.max(1, cellH),
      );
      return;
    }
    if (isPink) {
      drawPixelButton(
        ctx,
        toScreenX(x) + margin,
        toScreenY(y) + margin,
        cardW,
        cardH,
        palette.cellFilled,
        palette.cellFilledBorder,
      );
    } else {
      drawBrick(x, y, palette.cellFilled, palette.cellFilledBorder);
    }
    drawCellIcon(x, y);
  };

  if (cellW >= CARD_MIN_PX) {
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        drawBrick(x, y, palette.cellEmpty, palette.cellEmptyBorder);
      }
    }
    for (const c of confessions.values()) {
      if (!inView(c.x, c.y)) continue;
      drawClaimed(c.x, c.y);
    }
    for (const l of locked.values()) {
      if (!inView(l.x, l.y)) continue;
      drawBrick(l.x, l.y, palette.cellLocked, palette.cellLockedBorder);
    }
  } else {
    for (const c of confessions.values()) {
      if (!inView(c.x, c.y)) continue;
      ctx.fillStyle = palette.cellFilled;
      ctx.fillRect(toScreenX(c.x), toScreenY(c.y), Math.max(1, cellW), Math.max(1, cellH));
    }
    for (const l of locked.values()) {
      if (!inView(l.x, l.y)) continue;
      ctx.fillStyle = palette.cellLocked;
      ctx.fillRect(toScreenX(l.x), toScreenY(l.y), Math.max(1, cellW), Math.max(1, cellH));
    }
  }

  // "Hot" bricks: blazing perimeter fire.
  if (hotKeys && hotKeys.size > 0 && cellW >= CARD_MIN_PX) {
    const time = performance.now();
    const frame = prefersReducedMotion() ? 0 : Math.floor(time / 80);
    for (const key of hotKeys) {
      const [xs, ys] = key.split(":");
      const x = Number(xs);
      const y = Number(ys);
      if (!inView(x, y)) continue;
      const sx = toScreenX(x) + margin;
      const sy = toScreenY(y) + margin;
      const seed = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      drawBrickFire(ctx, sx, sy, cardW, cardH, seed, frame, time, palette, radius);
    }
  }

  // Grid boundary.
  ctx.strokeStyle = palette.gridLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    toScreenX(0),
    toScreenY(0),
    GRID_WORLD_W * cam.scale,
    GRID_WORLD_H * cam.scale,
  );

  const fillCard = (x: number, y: number, color: string, alpha: number) => {
    const sx = toScreenX(x) + margin;
    const sy = toScreenY(y) + margin;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    if (cellW >= CARD_MIN_PX) {
      roundRectPath(ctx, sx, sy, cardW, cardH, radius);
      ctx.fill();
    } else {
      ctx.fillRect(sx, sy, cardW, cardH);
    }
    ctx.restore();
  };

  const strokeCard = (
    x: number,
    y: number,
    color: string,
    lineWidth: number,
    dash: number[] | null = null,
  ) => {
    const sx = toScreenX(x) + margin;
    const sy = toScreenY(y) + margin;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (dash) ctx.setLineDash(dash);
    if (cellW >= CARD_MIN_PX) {
      roundRectPath(ctx, sx, sy, cardW, cardH, radius);
      ctx.stroke();
    } else {
      ctx.strokeRect(sx, sy, cardW, cardH);
    }
    ctx.restore();
  };

  if (selectedCells && selectedCells.size > 0) {
    const dash = [Math.max(3, cellW * 0.14), Math.max(3, cellW * 0.1)];
    for (const key of selectedCells) {
      const [xs, ys] = key.split(":");
      const x = Number(xs);
      const y = Number(ys);
      if (!inView(x, y)) continue;
      fillCard(x, y, palette.cellSelected, 0.16);
      strokeCard(x, y, palette.cellSelected, Math.max(1.5, cellW * 0.06), dash);
    }
  }

  if (hover && inView(hover.x, hover.y)) {
    strokeCard(hover.x, hover.y, palette.cellHover, Math.max(1, cellW * 0.045));
  }

  if (selected) {
    fillCard(selected.x, selected.y, palette.cellSelected, 0.16);
    strokeCard(selected.x, selected.y, palette.cellSelected, Math.max(2, cellW * 0.08));
  }
}
