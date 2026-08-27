import { Confession, GRID_SIZE } from "@confession/shared";

export interface Camera {
  scale: number;
  ox: number;
  oy: number;
}

export interface Palette {
  bg: string;
  cellEmpty: string;
  cellFilled: string;
  cellLocked: string;
  cellSelected: string;
  cellHover: string;
  gridLine: string;
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
): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

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
  const radius = Math.min(cardW, cardH) * 0.18;

  const drawCard = (x: number, y: number, color: string) => {
    const sx = toScreenX(x) + margin;
    const sy = toScreenY(y) + margin;
    ctx.fillStyle = color;
    if (cellW >= CARD_MIN_PX) {
      roundRectPath(ctx, sx, sy, cardW, cardH, radius);
      ctx.fill();
    } else {
      ctx.fillRect(sx, sy, cardW, cardH);
    }
  };

  if (cellW >= CARD_MIN_PX) {
    // Card mode: every cell in view is drawn as a rounded card.
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        drawCard(x, y, palette.cellEmpty);
      }
    }
    for (const c of confessions.values()) {
      if (c.x < xStart || c.x >= xEnd || c.y < yStart || c.y >= yEnd) continue;
      drawCard(c.x, c.y, palette.cellFilled);
    }
    for (const l of locked.values()) {
      if (l.x < xStart || l.x >= xEnd || l.y < yStart || l.y >= yEnd) continue;
      drawCard(l.x, l.y, palette.cellLocked);
    }
  } else {
    // Far zoom: only meaningful cells are drawn as points.
    for (const c of confessions.values()) {
      if (c.x < xStart || c.x >= xEnd || c.y < yStart || c.y >= yEnd) continue;
      ctx.fillStyle = palette.cellFilled;
      ctx.fillRect(toScreenX(c.x), toScreenY(c.y), Math.max(1, cellW), Math.max(1, cellH));
    }
    for (const l of locked.values()) {
      if (l.x < xStart || l.x >= xEnd || l.y < yStart || l.y >= yEnd) continue;
      ctx.fillStyle = palette.cellLocked;
      ctx.fillRect(toScreenX(l.x), toScreenY(l.y), Math.max(1, cellW), Math.max(1, cellH));
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

  const strokeCard = (x: number, y: number, color: string, width: number) => {
    const sx = toScreenX(x) + margin;
    const sy = toScreenY(y) + margin;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (cellW >= CARD_MIN_PX) {
      roundRectPath(ctx, sx, sy, cardW, cardH, radius);
      ctx.stroke();
    } else {
      ctx.strokeRect(sx, sy, cardW, cardH);
    }
  };

  if (selectedCells && selectedCells.size > 0) {
    for (const key of selectedCells) {
      const [xs, ys] = key.split(":");
      const x = Number(xs);
      const y = Number(ys);
      if (x < xStart || x >= xEnd || y < yStart || y >= yEnd) continue;
      ctx.save();
      ctx.globalAlpha = 0.35;
      drawCard(x, y, palette.cellSelected);
      ctx.restore();
      strokeCard(x, y, palette.cellSelected, Math.max(1.5, cellW * 0.08));
    }
  }

  if (hover && hover.x >= xStart && hover.x < xEnd && hover.y >= yStart && hover.y < yEnd) {
    strokeCard(hover.x, hover.y, palette.cellHover, Math.max(1, cellW * 0.035));
  }

  if (selected) {
    strokeCard(selected.x, selected.y, palette.cellSelected, Math.max(2, cellW * 0.2));
  }
}
