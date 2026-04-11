# Normalization Spec

## Overview

The normalization phase reads all five cached raw GeoJSON files, applies field mappings and data quality rules, and outputs a set of clean TypeScript-typed feature collections. No spatial metrics are computed here — that is the next phase.

```
Raw Cache → [Normalization] → Typed Feature Collections
```

---

## Goal

Convert raw ArcGIS features into canonical TypeScript types with:
- Standardized field names (snake_case, user-facing)
- Consistent value formats (ISO dates, trimmed strings, corrected typos)
- Spatial filtering to the Adirondack Park boundary
- Dropped null-geometry features
- Dropped private/internal fields

---

## Output Types

```typescript
interface LeanTo {
  id: number;            // ASSET_UID
  name: string;          // NAME (trimmed)
  facility: string;      // FACILITY
  unit: string;          // UNIT
  region: number;        // REGION
  office: string;        // OFFICE
  accessible: boolean;   // ACCESSIBLE === 'Y'
  asset_num: string | null; // ASSET_NUM (null if blank)
  updated: string;       // UPDATED → ISO date string
  geometry: Point;       // GeoJSON Point
}

interface Campsite {
  id: number;            // ASSET_UID
  name: string;          // NAME (trimmed)
  facility: string;      // FACILITY
  unit: string;          // UNIT
  region: number;        // REGION
  office: string;        // OFFICE
  accessible: boolean;   // ACCESSIBLE === 'Y'
  asset_num: string | null; // ASSET_NUM (null if blank)
  updated: string;       // UPDATED → ISO date string
  geometry: Point;       // GeoJSON Point
}

interface ParkingLot {
  id: number;            // ASSET_UID
  name: string;          // NAME (trimmed)
  facility: string;      // FACILITY
  unit: string;          // UNIT
  region: number;        // REGION
  asset: string;         // ASSET ('UNPAVED PARKING LOT' | 'PAVED PARKING LOT')
  asset_num: string | null; // ASSET_NUM (null if blank)
  geometry: Point;       // GeoJSON Point
}

interface WaterFeature {
  id: number;            // FEATURE_ID
  name: string;          // NAME
  feature_class: string; // FEATURE_CL
  county: string;        // COUNTY
  geometry: Point;       // GeoJSON Point (PRIM_LAT_D / PRIM_LONG1)
}

interface ParkBoundary {
  geometry: Polygon;     // single Polygon from dil_reference/MapServer/7
}
```

> `Point` and `Polygon` refer to GeoJSON geometry objects as defined in `geojson` types.

---

## Data Quality Rules (applied to all layers)

| Rule | Action |
|---|---|
| Null geometry | Drop feature |
| Outside park boundary | Drop feature (lean-tos, campsites, parking, water only) |
| PUBLICUSE = 'N' | Drop feature (campsites only — parking pre-filtered at ingest) |
| Blank/whitespace-only string | Treat as null |
| Null required field | Drop feature and log warning |

---

## Per-Layer Field Mappings

### Lean-Tos (`arcgis_lean_tos.json`)

| Raw field | Output field | Transform |
|---|---|---|
| ASSET_UID | id | — |
| NAME | name | trim() |
| FACILITY | facility | trim() |
| UNIT | unit | trim() |
| REGION | region | — |
| OFFICE | office | trim() |
| ACCESSIBLE | accessible | `=== 'Y'` |
| ASSET_NUM | asset_num | trim(); null if blank |
| UPDATED | updated | ms timestamp → ISO string |
| geometry | geometry | — |

**Drop:** OBJECTID, ASSET, DESCRIP, NOTES, FACILITY_NO, ACCU_METHODS, PHOTO_LINK, PUBLICUSE, ACC_TYPE, ACC_NOTE, ACC_DATE, ACC_BUILT, ACC_STATUS

---

### Campsites (`arcgis_campsites.json`)

Same field mapping as lean-tos.

**Additional rule:** Drop features where PUBLICUSE !== 'Y'.

**Additional transform:** Normalize ASSET value — `"PRIMATIVE CAMPSITE"` → `"PRIMITIVE CAMPSITE"` (typo correction; not stored in output type but used for any internal logging).

**Drop:** Same as lean-tos.

---

### Parking (`arcgis_parking.json`)

| Raw field | Output field | Transform |
|---|---|---|
| ASSET_UID | id | — |
| NAME | name | trim() |
| FACILITY | facility | trim() |
| UNIT | unit | trim() |
| REGION | region | — |
| ASSET | asset | trim() |
| ASSET_NUM | asset_num | trim(); null if blank |
| geometry | geometry | — |

**Drop:** OBJECTID, DESCRIP, NOTES, FACILITY_NO, ACCU_METHODS, PHOTO_LINK, PUBLICUSE, UPDATED, OFFICE, ACCESSIBLE, ACC_TYPE, ACC_NOTE, ACC_DATE, ACC_BUILT, ACC_STATUS

---

### Water Features (`arcgis_water_features.json`)

| Raw field | Output field | Transform |
|---|---|---|
| FEATURE_ID | id | — |
| NAME | name | trim() |
| FEATURE_CL | feature_class | — |
| COUNTY | county | — |
| PRIM_LAT_D | (used to build geometry) | — |
| PRIM_LONG1 | (used to build geometry) | — |

**Note:** Geometry is reconstructed from `PRIM_LAT_D` / `PRIM_LONG1` rather than trusting the raw GeoJSON point (both should agree; use the decimal degree fields as the authoritative source).

**Drop:** OBJECTID, LAT, LONG_, STATE_NUME, ST_ALPHA, COUNTY_NUM, SOURCELAT, SOURCELON, SOURCE_L_1, SOURCE_L_2, ELEV, ELEV_IN_M, QUAD, DATE_CREAT, DATE_EDITE, TYPE, LATDD, LONGDD

---

### Park Boundary (`arcgis_park_boundary.json`)

Extract the single Polygon geometry. No field mapping needed — only the geometry is used downstream.

---

## Spatial Filtering

Apply after field mapping, before writing output:

1. Load the park boundary polygon from the normalized `ParkBoundary`.
2. For each feature in lean-tos, campsites, parking, and water features: use Turf.js `booleanPointInPolygon` to test whether the feature's Point falls within the boundary.
3. Drop features outside the boundary.
4. Log counts: total in, dropped (null geometry), dropped (outside boundary), dropped (PUBLICUSE=N), out.

---

## Output Format

Write normalized features as GeoJSON FeatureCollections to `pipeline/normalized/`:

```
normalized/
  lean_tos.geojson
  campsites.geojson
  parking.geojson
  water_features.geojson
  park_boundary.geojson
```

Each file is a valid GeoJSON FeatureCollection. Properties match the output types above. Normalized files are not committed to the repo (add to `.gitignore`).

---

## Tests

Tests live alongside the normalization code. Test the following:

- Field mapping for each layer type (unit tests with fixture features)
- Trailing whitespace trimming
- UPDATED ms→ISO conversion
- ACCESSIBLE boolean coercion
- ASSET_NUM null-on-blank handling
- PUBLICUSE=N drop for campsites
- Null geometry drop
- `booleanPointInPolygon` spatial filter (one point inside, one outside)

---

## Done When

- All five normalized GeoJSON files exist and are non-empty
- Counts are logged and plausible (lean-tos ~200, campsites ~300–600, parking ~500 after ADK filter)
- All tests pass
- No features with null geometry or missing required fields remain
- Field names in output match the TypeScript types exactly
