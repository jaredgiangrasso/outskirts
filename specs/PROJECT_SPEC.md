# ADK Shelter Explorer — Project Spec

## One-Line Summary

A scored, filterable, interactive map of every lean-to and primitive campsite in the Adirondack Park, with precomputed spatial metrics and rich on-click visualizations showing each shelter's relationship to its surroundings.

## Project Goal

Build a data pipeline that ingests public geospatial data from OSM and NYS DECinfo Locator, computes meaningful spatial relationships for backcountry shelters, and serves the result through a polished web application aimed at backpackers.

The emphasis is on:

- Working with real, messy government and community GIS data
- Designing a coherent ingestion, normalization, and routing pipeline
- Computing non-trivial spatial relationships between features
- Presenting spatial data through thoughtful, interactive visualization

## Architecture

The system has two independent pieces with a JSON file as the boundary between them.

**Pipeline (CLI tool):** A TypeScript CLI that queries ArcGIS MapServer endpoints and the OSM Overpass API, normalizes the data, computes spatial metrics (including trail-routed distances via a routing API), and outputs a static JSON file. Runs manually on the developer's machine. No scheduling, no real-time updates.

**Frontend (static site):** A React application that loads the JSON file, renders an interactive map, and provides filtering, sorting, and spatial visualization. No backend server. No database in production. All filtering and sorting is client-side.

```
ArcGIS APIs  ┐
OSM Overpass ┤→ CLI Pipeline → shelters.json → Static React App → User
Routing API  ┘
```

The JSON file is committed to the repo or placed in the public assets folder. To update the data, re-run the pipeline and redeploy.

## Tech Stack

**Pipeline:**
- TypeScript / Node.js
- Turf.js for straight-line spatial computations
- OSM Overpass API for trailhead and trail geometry data
- Routing API (Mapbox Directions or GraphHopper) for trail-distance computation
- Direct HTTP requests to ArcGIS REST endpoints
- R-tree spatial index (flatbush) for efficient nearest-neighbor candidate selection

**Frontend:**
- React (Vite)
- Mapbox GL JS (via react-map-gl)
- TypeScript

**Deployment:**
- Static hosting (Vercel or Netlify)
- No backend server or database in production

## Geographic Scope

**v1: Adirondack Park** (the "Blue Line" boundary)

The park boundary polygon is available from the DECinfo Locator reference layer and will be used to spatially filter all ingested features.

**Future:** Expand to all of New York State.

## Feature Types

The app has two shelter types, treated as separate entities sharing a common metric schema.

### Lean-To
- Fixed structure shelter
- Source: DECinfo Locator (`dil_land_assets_lean_to`)

### Primitive Campsite
- Binary: exists or doesn't. No amenity detail in v1.
- Source: OSM (`tourism=camp_site` or `leisure=camp_pitch`) and/or DECinfo Locator
- Exact count TBD — query APIs during milestone 1 to determine volume and confirm routing API call budget

## Data Sources

| Data | Source |
|---|---|
| Lean-to locations | DECinfo Locator `dil_land_assets_lean_to` |
| Primitive campsites | DECinfo Locator `dec_backcountry_features/MapServer/0` (ASSET in PRIMITIVE CAMPSITE, PRIMATIVE CAMPSITE, PRIMITIVE TENT SITE) |
| Parking (routing start points) | DECinfo Locator `dec_backcountry_features/MapServer/0` (ASSET in UNPAVED/PAVED PARKING LOT, PUBLICUSE=Y) |
| Water features | DECinfo Locator GNIS (`gnis/MapServer/0`), filtered to NY water types |
| Park boundary | DECinfo Locator `dil_reference` (Blue Line polygon) |

## Spatial Metrics (Computed Per Shelter)

These metrics apply to both lean-tos and primitive campsites.

| Metric | Description | Computation Method |
|---|---|---|
| Distance to nearest parking | Trail-routed distance from nearest DEC public parking lot | Mapbox Directions API (returns distance + route geometry) |
| Distance to nearest water | Straight-line distance to closest water feature | Turf.js nearest point |
| Distance to nearest neighbor | Straight-line distance to nearest other shelter (any type) | Turf.js nearest point |

**Why these computation methods:**
- Parking distance uses trail routing because this is the metric where straight-line is most misleading to a backpacker. The Mapbox Directions API also returns the actual route geometry for map display.
- Water and neighbor distances use straight-line because trail routing doesn't meaningfully apply (you bushwhack to water; neighbor distance is an isolation signal, not a hiking route).

**Nearest parking computation strategy:**
1. Use flatbush R-tree spatial index to find the N nearest parking lot candidates by straight-line distance
2. Route only to those candidates via the Mapbox Directions API
3. Store the shortest trail distance and its GeoJSON LineString geometry

**Routing API:** Mapbox Directions. Profile: `mapbox/walking`. Token read from `MAPBOX_TOKEN` environment variable.

## Setup

Before pipeline work begins, both the pipeline and frontend projects must be scaffolded with correct configuration. See `SETUP_SPEC.md` for details.

**Pipeline:**
- Initialize Node.js project with TypeScript in strict mode
- Install core dependencies (Turf.js, flatbush, etc.)
- Configure build and run scripts

**Frontend:**
- Initialize React + Vite project with TypeScript in strict mode
- Install core dependencies (react-map-gl, Mapbox GL JS)
- Configure build and dev scripts

## Pipeline Stages

### 1. Ingestion
- Query ArcGIS MapServer endpoints and OSM Overpass API
- Handle ArcGIS pagination (resultOffset/resultRecordCount, with ObjectID fallback)
- Pull full datasets within the Adirondack Park boundary
- Cache raw responses locally to avoid re-fetching during development

### 2. Cataloguing
- Inspect raw cached responses from each data source
- Inventory available fields, types, and example values per layer
- Assess data completeness (null rates, missing fields)
- Document geometry types and any anomalies
- Produce a human-readable field catalog that informs normalization field mappings
- Resolve open questions about data shape before any normalization code is written

### 3. Normalization
- Convert raw features into canonical TypeScript types
- Standardize field names, types, and geometry formats
- Per-layer field mapping config with optional transform hooks for edge cases
- Data quality rules:
  - Features with null geometry: drop
  - Features outside park boundary: drop
  - Missing names: assign synthetic ID
  - Document additional rules as discovered

### 4. Spatial Computation
- Build R-tree spatial index over trailheads
- For each shelter: find nearest trailhead candidates, route via API, store distance + geometry
- For each shelter: compute straight-line distance to nearest water feature
- For each shelter: compute straight-line distance to nearest neighboring shelter
- Maximum straight-line search radius of 2 miles for water and neighbor computations

### 5. Output
- Write a single JSON file (`shelters.json`) containing all shelters with computed metrics
- Include supporting feature collections (trailheads, water sources) for map rendering
- Exact schema TBD after milestone 1 when the data model is concrete

## Frontend Behavior

### Map View
- Full-screen interactive map using Mapbox GL JS
- Lean-tos and primitive campsites rendered as distinct point markers
- Trail route geometries, water features, and neighbor lines rendered as contextual layers on click

### List Panel
- Sortable, filterable list of shelters alongside the map
- Filter by feature type (lean-to, primitive campsite, or both)
- Filter by any spatial metric (e.g. "within 0.5 miles of water")
- Sort by any spatial metric
- List and map are synchronized — filtering the list filters map markers and vice versa

### Spatial Visualization on Click (Core UX)
When a user clicks any shelter, the map visualizes its spatial relationships:
- The routed trail path draws from the shelter to the nearest trailhead, labeled with trail distance
- A straight line draws to the nearest water source, labeled with distance
- Dashed lines draw to nearby neighboring shelters, labeled with distances
- All three visualizations appear simultaneously

This is the central UX feature. The same precomputed data that powers filtering becomes a visible, interactive spatial story for each shelter.

### Design Quality
- Smooth animations and transitions for spatial visualizations
- Thoughtful color system, typography, and responsive layout
- Well-designed empty states, loading states, and error states

## Milestones

### Milestone 1: Pipeline Foundation
- Ingest lean-to and primitive campsite layers
- Ingest supporting layers (trailheads, water, park boundary)
- Determine primitive campsite count and confirm routing API call budget
- Normalize into clean TypeScript types
- Export to JSON (metrics TBD at this stage)
- Validate in QGIS — verify geometry, feature counts, attribute sanity
- **Done when:** A correct, clean JSON file exists with shelter features and supporting data

### Milestone 2: Spatial Computation
- Build trailhead R-tree index
- Route each shelter to its nearest trailhead via routing API, store distance + geometry
- Compute water and neighbor straight-line distances
- Add all metrics to JSON output
- Validate results — spot-check distances in QGIS, sanity-check extremes
- **Done when:** Every shelter has all three metrics and the values are plausible

### Milestone 3: Functional Frontend
- Render lean-tos and campsites on the Mapbox map with distinct markers
- Build the list panel with filtering (including type filter) and sorting
- Synchronize map and list interactions
- Basic click behavior showing shelter details
- **Done when:** The app is usable — you can filter, sort, and inspect shelters

### Milestone 4: Spatial Visualization and Polish
- Implement on-click spatial visualization (trail route, water line, neighbor lines)
- Design pass — color system, typography, animations, responsive layout
- Loading states, empty states, error handling
- **Done when:** The app is complete and polished

## Open Questions

- **Output JSON schema:** Defer until spatial computation is complete when the data model is concrete. Single file assumed.

## Explicitly Not Doing (v1)

- No backend server or API
- No database in production
- No real-time data updates or scheduled pipeline runs
- No campsite amenity detail beyond binary existence
- No trip planning or multi-stop route generation
- No user accounts, saved preferences, or persistent state
- No attempt to replicate the full DECinfo Locator
- No mobile-native app (responsive web only)

## Future Enhancements (Post-v1)

- Expand to all NYS shelters
- Multi-stop trip planning (select a sequence of shelters, see legs on map)
- Additional feature types (fire towers, lean-to condition ratings)
- Along-trail distance between shelters (not just to trailhead)
- GeoPackage or PostGIS for persistence if data volume grows
- **Improved parking routing:** v1 routes only to the single nearest parking lot (by straight-line) due to ORS free tier limits (~2,000 calls/day vs ~8,000 needed for k=5). A future improvement would route to the k=5 nearest candidates and select the shortest routed distance, catching cases where the nearest lot is a boat launch but a slightly farther lot has trail access. Could also be solved by self-hosting GraphHopper (no call limits) or upgrading ORS tier.
- **Parking lot type differentiation:** DEC parking data has no structured type field. v1 treats all public lots as valid routing targets. A future improvement would classify lots (hiking trailhead vs boat launch vs fishing access) using NAME keyword parsing, enabling users to filter by trip type (foot vs paddle).
