# Ingestion Spec

## Overview

The ingestion phase fetches raw data from all required external sources and caches it locally. No transformation or computation happens here. Every subsequent pipeline stage reads from the cache — not from the APIs directly.

```
External APIs → [Ingestion] → Raw Cache
```

---

## Goal

Fetch raw data from all required sources and cache it locally.

---

## Data Sources & Fetch Strategy

### DECinfo Locator (ArcGIS REST)

All data comes from a single provider. Base URL: `https://gisservices.dec.ny.gov/arcgis/rest/services/`

| Layer | Purpose | Where clause | Expected geometry |
|---|---|---|---|
| `dil_land_assets_lean_to/MapServer/0` | Lean-to point locations | none | Point |
| `dil_reference/MapServer/7` | Adirondack Blue Line polygon for spatial filtering | none | Polygon |
| `dec_backcountry_features/MapServer/0` | Primitive campsites and tent sites | `ASSET IN ('PRIMITIVE CAMPSITE', 'PRIMATIVE CAMPSITE', 'PRIMITIVE TENT SITE')` | Point |
| `dec_backcountry_features/MapServer/0` | Public parking lots (routing start points) | `ASSET IN ('UNPAVED PARKING LOT', 'PAVED PARKING LOT') AND PUBLICUSE='Y'` | Point |
| `gnis/MapServer/0` | Named water bodies filtered to NY | `ST_ALPHA='NY' AND FEATURE_CL IN ('Stream', 'Lake', 'Reservoir', 'Spring', 'Swamp', 'Bay', 'Canal', 'Falls', 'Rapids')` | Point |

**Pagination strategy:**
- Use `resultOffset` / `resultRecordCount` (confirmed supported by all layers)
- Fetch until no further records are returned

---

## Cache Format

- Store each response as a raw JSON/GeoJSON file in `pipeline/cache/`
- One file per layer/query
- Cache files are not committed to the repo (add to `.gitignore`)
- Include a timestamp in the cache metadata so staleness can be assessed

### Cache File Naming
```
cache/
  arcgis_lean_tos.json
  arcgis_park_boundary.json
  arcgis_campsites.json
  arcgis_parking.json
  arcgis_water_features.json
```

---

## Done When

- All five cache files exist and are non-empty
- Feature counts are plausible (no obviously truncated responses)
- Cache is readable by subsequent pipeline stages
