# Setup Spec

## Overview

Project scaffolding for both the pipeline and frontend. This phase produces no data or product output — it establishes the foundation that all subsequent phases build on. Both sub-projects are independent and can be set up in either order.

---

## Pipeline (`pipeline/`)

### Goal
A runnable TypeScript CLI project with all core dependencies installed and a working build/run configuration.

### Steps

1. Initialize Node.js project (`npm init`)
2. Install and configure TypeScript in strict mode
3. Configure `tsconfig.json`:
   - `strict: true`
   - `module: NodeNext` or `ESNext`
   - `outDir: dist`
   - `rootDir: src`
4. Install core dependencies:
   - `@turf/turf` — spatial computations
   - `flatbush` — R-tree spatial index
   - `node-fetch` or native `fetch` — HTTP requests
5. Install dev dependencies:
   - `typescript`
   - `ts-node` or `tsx` — run TypeScript directly during development
6. Add scripts to `package.json`:
   - `build` — compile TypeScript
   - `start` — run the pipeline entry point
7. Create `src/index.ts` as a minimal entry point (no logic yet)
8. Add `pipeline/cache/` to `.gitignore`

### Done When
- `npm run build` succeeds with no errors
- `npm start` runs without crashing
- `pipeline/cache/` is gitignored

---

## Frontend (`frontend/`)

### Goal
A runnable React + Vite project with Mapbox GL JS configured and a working dev/build setup.

### Steps

1. Scaffold with Vite: `npm create vite@latest frontend -- --template react-ts`
2. Install core dependencies:
   - `react-map-gl` — React wrapper for Mapbox GL JS
   - `mapbox-gl` — Mapbox GL JS
3. Verify `tsconfig.json` has `strict: true`
4. Add a Mapbox token placeholder to `.env.local` (not committed)
5. Add `.env.local` to `.gitignore`
6. Replace the Vite boilerplate in `App.tsx` with a minimal Mapbox map centered on the Adirondack Park

### Done When
- `npm run dev` renders a Mapbox map in the browser centered on the Adirondacks
- `npm run build` succeeds with no errors
- `.env.local` is gitignored
