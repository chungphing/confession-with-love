"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CELL_PRICE_USD,
  CellCoord,
  CheckoutResponse,
  Confession,
  EVENTS,
  GRID_SIZE,
  cellKey,
} from "@confession/shared";
import { getSocket } from "./socket";
import { logout, useAuth } from "./auth";
import {
  Camera,
  CELL_H,
  CELL_W,
  drawGrid,
  fitCamera,
  GRID_WORLD_H,
  GRID_WORLD_W,
  initialCamera,
  MAX_SCALE,
  Palette,
  screenToCell,
} from "./gridRenderer";
import { Composer } from "./Composer";
import { PaymentSheet } from "./PaymentSheet";
import { ConfessionCard } from "./ConfessionCard";
import { Header } from "./Header";
import { Highlights } from "./Highlights";
import { Icon } from "./icons";
import { readTheme } from "./theme";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

const SELECT_MAX = 100;
const BASE_SCALE = MAX_SCALE * 0.8;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_PALETTE: Palette = {
  bg: "#f5efeb",
  dot: "#d6cdbc",
  cellEmpty: "#efe9de",
  cellEmptyBorder: "#dfd5c4",
  cellFilled: "#fff1f4",
  cellFilledBorder: "#fda4af",
  cellLocked: "#e7e5e4",
  cellLockedBorder: "#d6d3d1",
  cellSelected: "#e11d48",
  cellHover: "#fecdd3",
  cellIcon: "#e11d48",
  gridLine: "rgba(214,205,188,0.5)",
  cellRadius: 12,
  theme: "pink",
};

function readPalette(): Palette {
  if (typeof window === "undefined") return DEFAULT_PALETTE;
  const root = getComputedStyle(document.documentElement);
  const val = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;
  return {
    bg: val("--cw-bg", DEFAULT_PALETTE.bg),
    dot: val("--cw-dot", DEFAULT_PALETTE.dot),
    cellEmpty: val("--cw-cell-empty", DEFAULT_PALETTE.cellEmpty),
    cellEmptyBorder: val(
      "--cw-cell-empty-border",
      DEFAULT_PALETTE.cellEmptyBorder,
    ),
    cellFilled: val("--cw-cell-filled", DEFAULT_PALETTE.cellFilled),
    cellFilledBorder: val(
      "--cw-cell-filled-border",
      DEFAULT_PALETTE.cellFilledBorder,
    ),
    cellLocked: val("--cw-cell-locked", DEFAULT_PALETTE.cellLocked),
    cellLockedBorder: val(
      "--cw-cell-locked-border",
      DEFAULT_PALETTE.cellLockedBorder,
    ),
    cellSelected: val("--cw-cell-selected", DEFAULT_PALETTE.cellSelected),
    cellHover: val("--cw-cell-hover", DEFAULT_PALETTE.cellHover),
    cellIcon: val("--cw-cell-icon", DEFAULT_PALETTE.cellIcon),
    gridLine: val("--cw-grid-line", DEFAULT_PALETTE.gridLine),
    cellRadius:
      Number(val("--cw-cell-radius", String(DEFAULT_PALETTE.cellRadius))) ||
      DEFAULT_PALETTE.cellRadius,
    theme: val("--cw-theme", "pink") === "minimal" ? "minimal" : "pink",
  };
}

interface Selection {
  x: number;
  y: number;
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function ConfessionApp() {
  const router = useRouter();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const camRef = useRef<Camera | null>(null);
  const paletteRef = useRef<Palette>(readPalette());
  const zoomLabelRef = useRef<HTMLSpanElement | null>(null);

  const confessionsRef = useRef<Map<string, Confession>>(new Map());
  const lockedRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animRef = useRef<{
    from: Camera;
    to: Camera;
    start: number;
    dur: number;
    ease: (t: number) => number;
  } | null>(null);

  const selectedRef = useRef<Selection | null>(null);
  const hoverRef = useRef<Selection | null>(null);
  const selectionRef = useRef<Set<string>>(new Set());
  const selectDragRef = useRef<{
    startSx: number;
    startSy: number;
    id: number;
    moved: boolean;
  } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    cam: Camera;
    moved: boolean;
    id: number;
  } | null>(null);

  const [confessions, setConfessions] = useState<Map<string, Confession>>(
    new Map(),
  );
  const [selected, setSelected] = useState<Selection | null>(null);
  const [viewing, setViewing] = useState<Confession | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [composing, setComposing] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const setSelectionBoth = useCallback((next: Set<string>) => {
    selectionRef.current = next;
    setSelection(next);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionBoth(new Set());
  }, [setSelectionBoth]);

  const applyConfession = useCallback((c: Confession) => {
    const key = cellKey(c.x, c.y);
    confessionsRef.current.set(key, c);
    setConfessions((prev) => new Map(prev).set(key, c));
    setViewing((prev) =>
      prev && cellKey(prev.x, prev.y) === key ? c : prev,
    );
  }, []);

  const flyTo = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas || !cam) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const scale = MAX_SCALE * 0.55;
    const ox = w / 2 - (cx + 0.5) * CELL_W * scale;
    const oy = h / 2 - (cy + 0.5) * CELL_H * scale;
    animRef.current = {
      from: { ...cam },
      to: { scale, ox, oy },
      start: performance.now(),
      dur: 650,
      ease: easeInOutCubic,
    };
  }, []);

  const recenter = useCallback(() => {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas || !cam) return;
    animRef.current = {
      from: { ...cam },
      to: initialCamera(canvas.clientWidth, canvas.clientHeight),
      start: performance.now(),
      dur: 650,
      ease: easeInOutCubic,
    };
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas || !cam) return;
    animRef.current = null;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const minScale = Math.min(w / GRID_WORLD_W, h / GRID_WORLD_H);
    const next = Math.min(MAX_SCALE, Math.max(minScale, cam.scale * factor));
    const worldX = (w / 2 - cam.ox) / cam.scale;
    const worldY = (h / 2 - cam.oy) / cam.scale;
    cam.ox = w / 2 - worldX * next;
    cam.oy = h / 2 - worldY * next;
    cam.scale = next;
  }, []);

  const goToCell = useCallback(
    (x: number, y: number) => {
      const cx = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(x)));
      const cy = Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(y)));
      flyTo(cx, cy);
    },
    [flyTo],
  );

  // --- data: snapshot + socket ---
  useEffect(() => {
    let cancelled = false;

    fetch(`${BACKEND_URL}/api/grid`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const map = new Map<string, Confession>();
        for (const c of data.confessions as Confession[]) {
          map.set(cellKey(c.x, c.y), c);
        }
        confessionsRef.current = map;
        setConfessions(map);
      })
      .catch(() => {});

    const socket = getSocket();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on(EVENTS.CELL_UPDATED, (c: Confession) => {
      lockedRef.current.delete(cellKey(c.x, c.y));
      applyConfession(c);
    });
    socket.on(EVENTS.CELL_LOCKED, (p: { x: number; y: number }) => {
      lockedRef.current.set(cellKey(p.x, p.y), { x: p.x, y: p.y });
    });
    socket.on(EVENTS.CELL_UNLOCKED, (p: { x: number; y: number }) => {
      lockedRef.current.delete(cellKey(p.x, p.y));
    });

    return () => {
      cancelled = true;
      socket.off("connect");
      socket.off("disconnect");
      socket.off(EVENTS.CELL_UPDATED);
      socket.off(EVENTS.CELL_LOCKED);
      socket.off(EVENTS.CELL_UNLOCKED);
    };
  }, [applyConfession]);

  // --- canvas sizing + render loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      if (!camRef.current) {
        camRef.current = fitCamera(w, h);
        const to = initialCamera(w, h);
        const theme = readTheme();
        animRef.current = {
          from: { ...camRef.current },
          to,
          start: performance.now(),
          dur: theme === "pink" ? 1500 : 900,
          ease: theme === "pink" ? easeOutBack : easeOutCubic,
        };
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const cam = camRef.current;
      if (!cam) return;

      const anim = animRef.current;
      if (anim) {
        const t = Math.min(1, (performance.now() - anim.start) / anim.dur);
        const e = anim.ease(t);
        cam.scale = anim.from.scale + (anim.to.scale - anim.from.scale) * e;
        cam.ox = anim.from.ox + (anim.to.ox - anim.from.ox) * e;
        cam.oy = anim.from.oy + (anim.to.oy - anim.from.oy) * e;
        if (t >= 1) animRef.current = null;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (zoomLabelRef.current) {
        zoomLabelRef.current.textContent = `${Math.round(
          (cam.scale / BASE_SCALE) * 100,
        )}%`;
      }
      drawGrid(
        ctx,
        w,
        h,
        cam,
        confessionsRef.current,
        lockedRef.current,
        selectedRef.current,
        hoverRef.current,
        paletteRef.current,
        selectionRef.current,
      );
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // --- wheel zoom (native, passive false) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camRef.current;
      if (!cam) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      const minScale = Math.min(w / GRID_WORLD_W, h / GRID_WORLD_H);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const next = Math.min(MAX_SCALE, Math.max(minScale, cam.scale * factor));

      const worldX = (mx - cam.ox) / cam.scale;
      const worldY = (my - cam.oy) / cam.scale;
      cam.ox = mx - worldX * next;
      cam.oy = my - worldY * next;
      cam.scale = next;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const cellsInRect = useCallback((cam: Camera, r: Rect): Set<string> => {
    const c0 = screenToCell(cam, r.x0, r.y0);
    const c1 = screenToCell(cam, r.x1, r.y1);
    const xmin = Math.max(0, Math.min(c0.x, c1.x));
    const xmax = Math.min(GRID_SIZE - 1, Math.max(c0.x, c1.x));
    const ymin = Math.max(0, Math.min(c0.y, c1.y));
    const ymax = Math.min(GRID_SIZE - 1, Math.max(c0.y, c1.y));
    const set = new Set<string>();
    for (let y = ymin; y <= ymax && set.size < SELECT_MAX; y++) {
      for (let x = xmin; x <= xmax && set.size < SELECT_MAX; x++) {
        const key = cellKey(x, y);
        if (confessionsRef.current.has(key) || lockedRef.current.has(key)) continue;
        set.add(key);
      }
    }
    return set;
  }, []);

  // --- pointer: pan/click (default) or drag-select (select mode) ---
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas || !cam) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (selectMode) {
      selectDragRef.current = {
        startSx: sx,
        startSy: sy,
        id: e.pointerId,
        moved: false,
      };
      return;
    }

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      cam: { ...cam },
      moved: false,
      id: e.pointerId,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas || !cam) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (selectMode) {
      const sd = selectDragRef.current;
      if (sd && sd.id === e.pointerId) {
        if (Math.abs(sx - sd.startSx) > 3 || Math.abs(sy - sd.startSy) > 3) {
          sd.moved = true;
        }
        if (sd.moved) {
          const r = {
            x0: Math.min(sd.startSx, sx),
            y0: Math.min(sd.startSy, sy),
            x1: Math.max(sd.startSx, sx),
            y1: Math.max(sd.startSy, sy),
          };
          setMarquee(r);
          setSelectionBoth(cellsInRect(cam, r));
        }
        hoverRef.current = null;
        return;
      }
      hoverRef.current = null;
      return;
    }

    const drag = dragRef.current;
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
      cam.ox = drag.cam.ox + dx;
      cam.oy = drag.cam.oy + dy;
      hoverRef.current = null;
      return;
    }

    const cell = screenToCell(cam, sx, sy);
    if (cell.x < 0 || cell.y < 0 || cell.x >= GRID_SIZE || cell.y >= GRID_SIZE) {
      hoverRef.current = null;
      return;
    }
    hoverRef.current = cell;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas || !cam) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (selectMode) {
      const sd = selectDragRef.current;
      if (!sd || sd.id !== e.pointerId) return;
      selectDragRef.current = null;
      setMarquee(null);

      if (!sd.moved) {
        const cell = screenToCell(cam, sx, sy);
        if (cell.x < 0 || cell.y < 0 || cell.x >= GRID_SIZE || cell.y >= GRID_SIZE) {
          return;
        }
        const key = cellKey(cell.x, cell.y);
        if (confessionsRef.current.has(key) || lockedRef.current.has(key)) return;
        const next = new Set(selectionRef.current);
        if (next.has(key)) next.delete(key);
        else if (next.size < SELECT_MAX) next.add(key);
        setSelectionBoth(next);
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const wasDrag = drag.moved;
    dragRef.current = null;
    if (wasDrag) return;

    const cell = screenToCell(cam, sx, sy);
    if (cell.x < 0 || cell.y < 0 || cell.x >= GRID_SIZE || cell.y >= GRID_SIZE) {
      return;
    }
    handleCellClick(cell.x, cell.y);
  };

  const openConfession = useCallback(
    (c: Confession) => {
      selectedRef.current = { x: c.x, y: c.y };
      setSelected({ x: c.x, y: c.y });
      setViewing(c);
      flyTo(c.x, c.y);
    },
    [flyTo],
  );

  const handleCellClick = (x: number, y: number) => {
    const key = cellKey(x, y);
    const sel = { x, y };
    selectedRef.current = sel;
    setSelected(sel);

    const filled = confessionsRef.current.get(key);
    if (filled) {
      setViewing(filled);
      return;
    }
    if (lockedRef.current.has(key)) {
      showToast("This cell is currently reserved — try another.");
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }
    setCheckout(null);
    setComposing(true);
  };

  const closeComposer = () => {
    setComposing(false);
    selectedRef.current = null;
    setSelected(null);
  };

  const closeOverlays = () => {
    selectedRef.current = null;
    setSelected(null);
    setViewing(null);
    setCheckout(null);
    setComposing(false);
  };

  const toggleSelectMode = () => {
    setSelectMode((v) => {
      if (v) clearSelection();
      return !v;
    });
    closeOverlays();
  };

  const beginBulkCompose = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setComposing(true);
  };

  const submitMessage = async (message: string) => {
    const cells: CellCoord[] =
      selection.size > 0
        ? Array.from(selection).map((k) => {
            const [x, y] = k.split(":").map(Number);
            return { x, y };
          })
        : selected
          ? [{ x: selected.x, y: selected.y }]
          : [];

    if (cells.length === 0) return;

    const isBulk = cells.length > 1;
    const url = isBulk
      ? `${BACKEND_URL}/api/checkout/bulk`
      : `${BACKEND_URL}/api/checkout`;
    const body = isBulk
      ? { cells, message }
      : { x: cells[0].x, y: cells[0].y, message };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      showToast(
        data.reason === "taken"
          ? "Someone just bought one of those cells."
          : "One of those cells is currently reserved.",
      );
      closeOverlays();
      return;
    }
    setComposing(false);
    setCheckout(data as CheckoutResponse);
  };

  const simulatePayment = async () => {
    if (!checkout) return;
    const res = await fetch(`${BACKEND_URL}/api/webhook/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txId: checkout.txId }),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      if (Array.isArray(data.confessions)) {
        for (const c of data.confessions) applyConfession(c as Confession);
      }
      showToast("Confession published — it's live for everyone.");
      clearSelection();
      closeOverlays();
    } else {
      showToast("Payment failed — please try again.");
    }
  };

  const handleReact = useCallback(
    async (emoji: string) => {
      if (!viewing) return;
      if (!user) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${BACKEND_URL}/api/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: viewing.x, y: viewing.y, emoji }),
      });
      const data = await res.json();
      if (res.ok && data.confession) {
        applyConfession(data.confession as Confession);
      }
    },
    [viewing, user, applyConfession, router],
  );

  const popular = useMemo(() => {
    const total = (c: Confession) =>
      Object.values(c.reactions).reduce((a, b) => a + b, 0);
    return Array.from(confessions.values())
      .sort((a, b) => total(b) - total(a))
      .slice(0, 8);
  }, [confessions]);

  const composerCount = selection.size > 0 ? selection.size : selected ? 1 : 0;

  const liveCount = confessions.size;
  const boughtCount = confessions.size;
  const totalBricks = GRID_SIZE * GRID_SIZE;
  const totalLabel =
    totalBricks >= 1_000_000
      ? `${totalBricks / 1_000_000}M`
      : totalBricks.toLocaleString();

  const handleConfessCta = () => {
    if (selection.size > 0 || selected) {
      beginBulkCompose();
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }
    setSelectMode(true);
    showToast("Pick bricks on the wall, then buy them.");
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <Header
        user={user}
        onLogout={() => logout()}
        liveCount={liveCount}
        onGoTo={goToCell}
        onConfess={handleConfessCta}
      />

      <div className="canvas-dots relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none ${
            selectMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        <aside className="absolute bottom-5 left-5 top-5 z-10 hidden w-[420px] max-w-[calc(100vw-40px)] md:block">
          <Highlights items={popular} onSelect={openConfession} />
        </aside>

        {marquee && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border-2 border-dashed border-[var(--accent)] bg-[var(--soft-accent)]"
            style={{
              left: marquee.x0,
              top: marquee.y0,
              width: marquee.x1 - marquee.x0,
              height: marquee.y1 - marquee.y0,
            }}
          />
        )}

        {selectMode && selection.size === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
            <div className="rounded-full bg-[var(--chip-bg)] px-4 py-2 text-sm text-[var(--chip-fg)] shadow-lg">
              Drag to select bricks · click to toggle
            </div>
          </div>
        )}

        {selectMode && selection.size > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[var(--chip-bg)] py-2 pl-4 pr-2 text-sm text-[var(--chip-fg)] shadow-lg">
              <span>
                {selection.size} brick{selection.size > 1 ? "s" : ""} · $
                {(CELL_PRICE_USD * selection.size).toFixed(2)}
              </span>
              <button
                onClick={clearSelection}
                className="rounded-full px-3 py-1 text-xs opacity-70 transition hover:opacity-100"
              >
                Clear
              </button>
              <button
                onClick={beginBulkCompose}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent"
              >
                Buy
              </button>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 shadow-xl backdrop-blur-md">
            <button
              onClick={recenter}
              title="Recenter the wall"
              aria-label="Recenter the wall"
              className="grid h-8 w-8 place-items-center rounded-full text-[var(--foreground)] opacity-70 transition hover:bg-[var(--hover-bg)] hover:opacity-100"
            >
              <Icon icon="clarity:target-line" width={16} height={16} />
            </button>

            <div className="flex items-center gap-1 rounded-full border border-[var(--panel-border)] bg-[var(--field-bg)] px-2 py-0.5 text-xs font-medium">
              <button
                onClick={() => zoomBy(0.8)}
                aria-label="Zoom out"
                className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-[var(--hover-bg)]"
              >
                −
              </button>
              <span
                ref={zoomLabelRef}
                className="w-9 text-center font-mono text-[11px]"
              >
                100%
              </span>
              <button
                onClick={() => zoomBy(1.25)}
                aria-label="Zoom in"
                className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-[var(--hover-bg)]"
              >
                +
              </button>
            </div>

            <button
              onClick={toggleSelectMode}
              title="Select multiple bricks"
              aria-label="Select multiple bricks"
              className={`grid h-8 w-8 place-items-center rounded-full border transition ${
                selectMode
                  ? "border-accent text-accent ring-2 ring-accent"
                  : "border-transparent text-[var(--foreground)] opacity-70 hover:bg-[var(--hover-bg)] hover:opacity-100"
              }`}
            >
              <Icon icon="clarity:grid-view-line" width={16} height={16} />
            </button>

            <div className="h-4 w-px bg-[var(--field-border)]" />

            <button
              onClick={handleConfessCta}
              className="shadow-pixel inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-on-accent transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Icon icon="clarity:heart-solid" width={14} height={14} />
              <span className="hidden sm:inline">
                Leave a Whisper on the Wall
              </span>
            </button>

            <span className="hidden pl-1 font-mono text-[11px] opacity-50 md:inline">
              {boughtCount.toLocaleString()} / {totalLabel} bricks
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-none absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[var(--chip-bg)] px-4 py-2 text-sm text-[var(--chip-fg)] shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <Composer
        open={composing && !checkout}
        cell={selected}
        count={composerCount}
        onClose={closeComposer}
        onSubmit={submitMessage}
      />

      <PaymentSheet
        checkout={checkout}
        onClose={closeOverlays}
        onPaid={simulatePayment}
      />

      <ConfessionCard
        confession={viewing}
        onClose={closeOverlays}
        onReact={handleReact}
      />
    </div>
  );
}
