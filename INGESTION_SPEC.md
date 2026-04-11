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

Base URL pattern: `https://gis.dec.ny.gov/arcgis/rest/services/`

| Layer | Purpose | Expected geometry |
|---|---|---|
| `dil_land_assets_lean_to` | Lean-to point locations | Point |
| `dil_reference` (park boundary) | Adirondack Blue Line polygon for spatial filtering | Polygon |
| `dil_reference` (water features) | Rivers, streams, lakes, ponds for water proximity metric | Point / Line / Polygon (TBD) |

**Pagination strategy:**
- Use `resultOffset` / `resultRecordCount` for standard pagination
- Fall back to ObjectID range queries if the server does not support offset pagination
- Fetch until no further records are returned

**Query parameters:**
- `where=1=1` to fetch all features
- `outFields=*` to return all attributes
- `f=geojson` for GeoJSON output
- Apply bounding box or geometry filter using the Blue Line boundary where possible to limit response size

### OSM Overpass API

Base URL: `https://overpass-api.de/api/interpreter`

| Query | Purpose | Expected geometry |
|---|---|---|
| `tourism=camp_site` or `leisure=camp_pitch` within park boundary | Primitive campsite locations | Point |
| `highway=trailhead` within park boundary | Trailhead locations | Point |
| `highway=path\|track\|footway\|steps\|bridleway` within park boundary | Trail geometries (for context, routing handled separately) | Line |

**Fetch strategy:**
- Query using a bounding box covering the Adirondack Park (~43.5°N to 44.9°N, -75.3°W to -73.3°W)
- Use QL (Overpass Query Language) with `out geom` to include geometry in response
- Output format: GeoJSON

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
  arcgis_water_features.json
  osm_campsites.json
  osm_trailheads.json
  osm_trails.json
```

---

## Done When

- All six cache files exist and are non-empty
- Feature counts are plausible (no obviously truncated responses)
- Cache is readable by subsequent pipeline stages
