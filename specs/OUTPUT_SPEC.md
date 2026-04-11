# Output Spec

## Overview

The output stage reads the enriched shelter files and supporting normalized layers, assembles them into a single static JSON file, and writes it to the frontend's public assets directory.

```
Enriched GeoJSON + Normalized GeoJSON → [Output] → shelters.json → Frontend
```

---

## Goal

Produce a single `shelters.json` file that contains everything the frontend needs to render the map, power the list panel, and draw on-click spatial visualizations — with no further API calls at runtime.

---

## Output File Location

```
frontend/public/shelters.json
```

This file is loaded directly by the React app at startup. It is not committed to the repo (add to `.gitignore` in the frontend).

---

## Schema

```typescript
interface SheltersFile {
  meta: {
    generated_at: string;   // ISO timestamp of when the pipeline was run
    lean_to_count: number;
    campsite_count: number;
    parking_count: number;
    water_count: number;
  };
  lean_tos: ShelterFeature[];
  campsites: ShelterFeature[];
  parking: ParkingFeature[];
  water: WaterFeature[];
}

interface ShelterFeature {
  id: number;
  type: 'lean-to' | 'campsite';
  name: string;
  facility: string;
  unit: string;
  region: number;
  office: string;
  accessible: boolean;
  asset_num: string | null;
  updated: string;                          // ISO date string
  lng: number;
  lat: number;
  nearest_parking_straight_m: number;
  nearest_parking_m: number | null;
  nearest_parking_id: number | null;
  nearest_parking_route: GeoJSONLineString | null;
  nearest_water_m: number;
  nearest_water_id: number;
  nearest_shelter_m: number | null;
  nearest_shelter_id: number | null;
  nearest_shelter_type: 'lean-to' | 'campsite' | null;
}

interface ParkingFeature {
  id: number;
  name: string;
  facility: string;
  lng: number;
  lat: number;
}

interface WaterFeature {
  id: number;
  name: string;
  feature_class: string;
  lng: number;
  lat: number;
}

type GeoJSONLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};
```

---

## Design Decisions

**Flat coordinates instead of GeoJSON geometry** — shelters, parking, and water features use `lng`/`lat` number fields rather than a GeoJSON Point geometry object. The frontend uses Mapbox GL JS which accepts coordinate arrays directly. This avoids the `{ type: 'Feature', geometry: { type: 'Point', coordinates: [...] } }` nesting overhead across thousands of features.

**Route geometry kept as GeoJSON LineString** — `nearest_parking_route` is kept as a GeoJSON LineString because Mapbox GL JS consumes LineString geometry directly for layer rendering.

**Parking and water are lookup tables** — included so the frontend can resolve `nearest_parking_id` and `nearest_water_id` to names and coordinates for on-click visualization labels without embedding full details in every shelter.

**No park boundary** — the boundary polygon is only needed by the pipeline for spatial filtering. The frontend uses Mapbox's built-in map tiles for visual context.

---

## Assembly Logic

1. Read `enriched/lean_tos.geojson` and `enriched/campsites.geojson`
2. Read `normalized/parking.geojson` and `normalized/water_features.geojson`
3. For each shelter feature, flatten geometry coordinates into `lng`/`lat` fields and add `type` field
4. For parking and water, extract only the fields needed by the frontend (id, name, feature_class where applicable, lng, lat)
5. Write the assembled object to `frontend/public/shelters.json`

---

## Done When

- `frontend/public/shelters.json` exists and is valid JSON
- All shelter features have `lng`, `lat`, and all metric fields present
- `nearest_parking_route` is a valid LineString or null
- Parking and water lookup tables contain all features referenced by shelter IDs
- File size is reasonable (target under 20MB; route geometries are the main contributor)
