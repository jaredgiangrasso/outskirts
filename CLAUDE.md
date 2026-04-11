# ADK Lean-To Explorer

## Project Overview

An interactive web app that displays scored, filterable lean-to shelters in the Adirondack Park. A TypeScript CLI pipeline ingests public GIS data from NYS DECinfo Locator ArcGIS endpoints, computes spatial metrics, and outputs a static JSON file consumed by a React frontend. There is no backend server.

See `PROJECT_SPEC.md` for full requirements, architecture, data sources, and milestones.

## Tech Stack

- **Pipeline:** TypeScript, Node.js, Turf.js
- **Frontend:** React (Vite), TypeScript, Mapbox GL JS (react-map-gl)
- **Deployment:** Static hosting (Vercel or Netlify)

## Project Structure

```
pipeline/        # CLI tool — ingestion, normalization, spatial computation
frontend/        # React app — map, list, filtering, spatial visualization
PROJECT_SPEC.md  # Detailed requirements and open questions
```

## Key Architectural Decisions

- No backend server. The pipeline outputs a static JSON file that the frontend loads directly.
- All filtering and sorting is client-side. The dataset is small (~200 lean-tos for Adirondacks).
- All spatial distances are Euclidean (straight-line) for v1. No along-trail routing.
- The pipeline runs manually on the developer's machine. No scheduling or real-time updates.

## Rules

- When requirements, scope, or architectural decisions change during a session, update `PROJECT_SPEC.md` to reflect the change.
- Each phase in any section of `PROJECT_SPEC.md` must have its own dedicated spec file (e.g. `INGESTION_SPEC.md`, `CATALOGUING_SPEC.md`, `MILESTONE_1_SPEC.md`). Create the spec file for a phase before writing any code for that phase.
- Track all phase statuses in `STATUS.md`. When a phase is added or removed from `PROJECT_SPEC.md`, update `STATUS.md` to match. When work begins on a phase, mark it as `In Progress`. When a phase is complete, mark it as `Completed`.
- Do not introduce backend servers, databases, or API layers unless explicitly discussed and agreed upon.
- Keep the pipeline and frontend as independent projects with the JSON file as the only contract between them.
- Use TypeScript strict mode throughout.
- Write tests alongside code for the normalization and spatial computation phases. These are the stages with non-trivial logic where silent errors are hard to catch by inspection alone. No test framework setup is needed before those phases.

## Common Commands

### Pipeline (`pipeline/`)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the pipeline via `tsx src/index.ts`
