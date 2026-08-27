"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { readTheme } from "./theme";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

const SELECT_MAX = 100;

const DEFAULT_PALETTE: Palette = {
  bg: "#0b0b0f",
  cellEmpty: "#1a1a22",
  cellFilled: "#ec4899",
  cellLocked: "#f59e0b",
  cellSelected: "#ffffff",
  cellHover: "#ffffff",
  gridLine: "rgba(255,255,255,0.08)",
};

function readPalette(): Palette {
  if (typeof window === "undefined") return DEFAULT_PALETTE;
  const root = getComputedStyle(document.documentElement);
  const val = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;
  return {
    bg: val("--cw-bg", DEFAULT_PALETTE.bg),
    cellEmpty: val("--cw-cell-empty", DEFAULT_PALETTE.cellEmpty),
    cellFilled: val("--cw-cell-filled", DEFAULT_PALETTE.cellFilled),
    cellLocked: val("--cw-cell-locked", DEFAULT_PALETTE.cellLocked),
    cellSelected: val("--cw-cell-selected", DEFAULT_PALETTE.cellSelected),
    cellHover: val("--cw-cell-hover", DEFAULT_PALETTE.cellHover),
    gridLine: val("--cw-grid-line", DEFAULT_PALETTE.gridLine),
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const camRef = useRef<Camera | null>(null);
  const paletteRef = useRef<Palette>(readPalette());

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
    [viewing, applyConfession],
  );

  const popular = useMemo(() => {
    const total = (c: Confession) =>
      Object.values(c.reactions).reduce((a, b) => a + b, 0);
    return Array.from(confessions.values())
      .sort((a, b) => total(b) - total(a))
      .slice(0, 8);
  }, [confessions]);

  const composerCount = selection.size > 0 ? selection.size : selected ? 1 : 0;

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <Header />

      <div className="relative min-h-0 flex-1">
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

        <aside className="absolute bottom-3 left-3 top-3 z-10 hidden w-[40%] max-w-md min-w-[260px] md:block">
          <Highlights items={popular} onSelect={openConfession} />
        </aside>

        {marquee && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border border-white/70 bg-white/10"
            style={{
              left: marquee.x0,
              top: marquee.y0,
              width: marquee.x1 - marquee.x0,
              height: marquee.y1 - marquee.y0,
            }}
          />
        )}

        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 text-sm">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          <span className="opacity-70">
            {connected ? "live" : "connecting…"}
          </span>
          <span className="opacity-40">
            {selectMode ? "· drag to select" : "· drag to pan · scroll to zoom"}
          </span>
        </div>

        {selectMode && selection.size === 0 && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur">
            Drag to select cells · click to toggle
          </div>
        )}

        <button
          onClick={toggleSelectMode}
          className={`absolute bottom-3 right-3 z-10 rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${
            selectMode
              ? "bg-accent text-on-accent"
              : "bg-black/60 text-white backdrop-blur hover:bg-black/80"
          }`}
        >
          {selectMode ? "Done" : "Select multiple"}
        </button>

        {selectMode && selection.size > 0 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 py-2 pl-4 pr-2 text-sm text-white backdrop-blur">
            <span>
              {selection.size} cell{selection.size > 1 ? "s" : ""} · $
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
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-sm text-white backdrop-blur"
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
