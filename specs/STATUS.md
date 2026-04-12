# Project Status

## Setup

| Phase | Status |
|---|---|
| Pipeline scaffolding | Completed |
| Frontend scaffolding | Completed |

## Pipeline Stages

| Phase | Status |
|---|---|
| 1. Ingestion | Completed |
| 2. Cataloguing | Completed |
| 3. Normalization | Completed |
| 4. Spatial Computation | In Progress |
| 5. Output | Completed |

## Milestones

| Milestone | Status |
|---|---|
| 1. Pipeline Foundation | In Progress |
| 2. Spatial Computation | In Progress |
| 3. Map View | Completed |
| 4. Spatial Visualization on Click | In Progress |
| 5. List Panel | Not Started |

## Known Issues / Planned Work

| Issue | Area | Status |
|---|---|---|
| Water distance uses GNIS point coordinates — inaccurate for extended features (streams, rivers). Switch to OSM water geometry and compute nearest point on LineString/Polygon. Affects spatial computation and visualization. | Pipeline + Frontend | Not Started |
