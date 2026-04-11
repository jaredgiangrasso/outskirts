# Spatial Computation Spec

## Overview

The spatial computation phase reads the normalized GeoJSON files, computes three spatial metrics per shelter, and writes enriched GeoJSON files ready for the output stage.

```
Normalized GeoJSON → [Spatial Computation] → Enriched GeoJSON
```

---

## Goal

Compute three metrics for every lean-to and campsite:

| Metric | Method | Unit |
|---|---|---|
| Distance to nearest parking lot | Trail-routed (Mapbox Directions API) | meters |
| Distance to nearest water feature | Straight-line (Turf.js) | meters |
| Distance to nearest neighboring shelter | Straight-line (Turf.js) | meters |

---

## Inputs

- `normalized/lean_tos.geojson`
- `normalized/campsites.geojson`
- `normalized/parking.geojson`
- `normalized/water_features.geojson`

---

## Output Types

```typescript
interface SpatialMetrics {
  nearest_parking_straight_m: number;         // straight-line distance to nearest parking lot (always populated)
  nearest_parking_m: number | null;           // routed distance in meters; null if no trail access
  nearest_parking_id: number | null;          // id of the nearest parking lot; null if no trail access
  nearest_parking_route: LineString | null;   // GeoJSON LineString of the route; null if no trail access
  nearest_water_m: number;                    // straight-line distance in meters
  nearest_water_id: number;                   // id of the nearest water feature
  nearest_shelter_m: number | null;           // null if no neighbor within 50 km
  nearest_shelter_id: number | null;
  nearest_shelter_type: 'lean-to' | 'campsite' | null;
}

type EnrichedLeanTo = LeanTo & SpatialMetrics;
type EnrichedCampsite = Campsite & SpatialMetrics;
```

---

## Algorithm

### Spatial Index

Build a flatbush R-tree index over each target feature set (parking, water, all shelters combined) keyed on `[lng, lat]`. Used for nearest-candidate pre-selection before exact distance computation.

### Per-shelter computation

For each shelter (lean-to or campsite):

**1. Nearest parking (routed)**
- Query the parking R-tree for the **k=1** nearest candidate by straight-line distance
- Call the ORS API (`foot-hiking` profile) for that candidate
- If the route succeeds, store: `nearest_parking_m`, `nearest_parking_id`, `nearest_parking_route`
- If the route fails (no OSM trail within 350m of either point), store nulls for all three fields
- k=1 is a deliberate simplification to stay within the ORS free tier (2,000 calls/day). See PROJECT_SPEC.md Future Enhancements for the k=5 improvement plan.

**2. Nearest water (straight-line)**
- Query the water R-tree for the **k=5** nearest candidates
- Select the true nearest by exact Turf.js distance
- Store: `nearest_water_m`, `nearest_water_id`
- No search radius limit — every shelter must have a value

**3. Nearest neighbor (straight-line)**
- Query the combined shelter R-tree (lean-tos + campsites) for the **k=2** nearest candidates (k=2 because k=1 will often be the shelter itself)
- Exclude the query shelter by id
- Select the nearest remaining candidate by exact Turf.js distance
- Store: `nearest_shelter_m`, `nearest_shelter_id`, `nearest_shelter_type`
- If no neighbor is found within **50 km**, store nulls

---

## Mapbox Directions API

- **Profile:** `mapbox/walking`
- **Token:** read from `MAPBOX_TOKEN` environment variable (same token used by the frontend)
- **Endpoint:** `https://api.mapbox.com/directions/v5/mapbox/walking/{lng,lat};{lng,lat}`
- **Parameters:** `geometries=geojson&overview=full`
- **Response:** use `routes[0].distance` (meters) and `routes[0].geometry` (GeoJSON LineString)
- **Rate limiting:** add a short delay between requests to avoid hitting burst limits
- **Error handling:** if a route fails for a candidate (API error), skip that candidate and try the next. If all candidates fail to route — e.g. the shelter is water-access only with no OSM trail nearby — store `null` for all three parking fields and log an info message. This is expected for a small number of shelters.

### Call budget

~700 shelters × 5 candidates = up to 3,500 calls. Mapbox free tier is 100,000 calls/month — well within budget.

---

## Distance Computation

- Straight-line: `@turf/distance` with `{ units: 'meters' }`, rounded to nearest integer
- Routed: `routes[0].distance` from Mapbox response (already in meters), rounded to nearest integer

---

## Output Format

Write enriched features as GeoJSON FeatureCollections to `pipeline/enriched/`:

```
enriched/
  lean_tos.geojson
  campsites.geojson
```

Parking, water, and park boundary files are not modified — the output stage reads them directly from `normalized/`.

Enriched files are not committed to the repo (add to `.gitignore`).

---

## Environment

`MAPBOX_TOKEN` must be set in the environment before running the pipeline. The pipeline reads it via `process.env.MAPBOX_TOKEN` and throws immediately if it is missing.

---

## Tests

Test the following without hitting the real Mapbox API:

- R-tree index builds correctly and returns the expected k nearest candidates
- True nearest is correctly selected from candidates when bounding-box order differs from distance order
- Neighbor search excludes the query shelter itself
- `nearest_shelter_*` fields are null when no neighbor is within 50 km (contrived fixture)
- Routed distance is preferred; straight-line fallback is used when all Mapbox calls fail
- Distances are rounded integers

The Mapbox client function should be injectable so tests can substitute a stub that returns fixture route responses.

---

## Done When

- All lean-tos and campsites in `enriched/` have water and neighbor metrics populated
- `nearest_parking_*` fields are null only for shelters with no nearby OSM trail (expected: a small number of water-access-only locations)
- `nearest_shelter_m` is null only for shelters with no neighbor within 50 km (expected: zero in the ADK)
- Spot-check: pick 3–5 shelters and verify distances are plausible against a map
- All tests pass
