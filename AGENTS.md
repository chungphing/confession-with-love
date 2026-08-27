# AGENTS.md

## Status

Demo-stage monorepo (npm workspaces). No database or Redis yet — the backend keeps grid state in memory (`packages/backend/src/store.ts`). The checkout lock and idempotent-webhook logic are already implemented against that in-memory store, so a DB/Redis swap later should not change the API surface.

## Run it

```bash
npm install          # first time
npm run dev          # backend:4000, pink:3000, minimal:3001 (concurrently)
npm run build        # next build for both apps (+ backend typecheck via its own script)
npm run typecheck    # tsc --noEmit across backend, pink, minimal
```

Single workspace: `npm run dev -w @confession/pink`, etc. Frontends read the backend URL from `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:4000`).

## Architecture

- `packages/shared` — types/constants/event names shared by frontend + backend. `"type": "module"` and exports raw `src/*.ts` (no build step).
- `packages/shared-ui` — all React: `ConfessionApp` (header + highlights sidebar + canvas grid + overlays), `Composer`, `PaymentSheet`, `ConfessionCard`, `Header`, `Highlights`, `gridRenderer`, `qr`. Exports raw `src/*.ts`; consumed via Next `transpilePackages` (no build step). Do NOT add a compiled `dist`.
- `packages/backend` — Express + Socket.io, run with `tsx` (no compiled output; `"type": "module"`). In-memory `GridStore` with seed data from `seed.ts`.
- `apps/pink`, `apps/minimal` — identical Next.js apps; only `globals.css` + `tailwind.config.ts` differ (palette/typography). Both render `<ConfessionApp />`.

## Theming (important)

Themes are pure CSS variables. Each app defines `--cw-*` (canvas colors) and `--accent/--card/--on-accent/--background/--foreground` (UI tokens) in its `globals.css`, and maps them in `tailwind.config.ts`. `shared-ui` reads `--cw-*` at runtime via `getComputedStyle` — canvas colors are not hardcoded. Tailwind `content` in each app must include `../../packages/shared-ui/src/**/*.{ts,tsx}` or classes there won't be generated.

## Grid rendering (non-negotiable)

- 1000×1000 cells drawn on a single `<canvas>` 2D context with viewport culling — never HTML `<div>` per cell. See `gridRenderer.ts`.
- Cells are rectangular: world-unit size is `CELL_W = 1.6` × `CELL_H = 1` (grid world is `1000*1.6` × `1000`). All world↔screen math must account for the differing axes; `screenToCell` divides by `CELL_W`/`CELL_H`.
- Mouse clicks/drags are translated to cell coordinates (`screenToCell`) to drive React overlays. Grid data lives in refs read by a `requestAnimationFrame` loop (which also runs the `flyTo` camera tween via `animRef`); the same confession data is ALSO mirrored to React state so the sidebar (`Highlights`) and viewer re-render — update both via `applyConfession`.
- SSR safety: anything touching `window`/`getComputedStyle` must be guarded (see `readPalette`), or `next build` prerender fails.

## Payment flow (demo, no real KHQR)

1. `POST /api/checkout` `{x,y,message}` or `POST /api/checkout/bulk` `{cells:[{x,y}],message}` → 3-min in-memory lock(s) + returns `txId` and a fake `qrPayload` (bulk locks N cells under one tx). Grid drag-select (`selectMode`) feeds the bulk endpoint.
2. `POST /api/webhook/payment` `{txId}` → idempotent (deduped by `processedTx` set); broadcasts `cell:updated` per cell via Socket.io (bulk confirms all cells of the tx at once).
3. `POST /api/reactions` `{x,y,emoji}` → increments `Confession.reactions[emoji]`, broadcasts `cell:updated` (reused for reactions too).
4. Socket events (`EVENTS` in `packages/shared/src/events.ts`): `cell:updated`, `cell:locked`, `cell:unlocked`. Lock TTL is enforced by `setTimeout` in `store.ts`.
