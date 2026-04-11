# Cataloguing Spec

## Overview

The cataloguing phase inspects each cached file and produces a human-readable field catalog. This catalog is the source of truth for writing normalization field mappings. No normalization code should be written before the catalog is complete.

```
Raw Cache → [Cataloguing] → CATALOG.md → Normalization
```

---

## Goal

Understand the shape, completeness, and quality of each cached dataset before writing any transformation code.

---

## What to Document Per Layer

For each cached layer, record:

- **Feature count** — total number of features returned
- **Geometry type** — point, line, polygon, mixed, or null
- **Null geometry count** — how many features have missing geometry
- **Field inventory** — for each field:
  - Field name (raw, as returned by the API)
  - Data type (string, number, boolean, null)
  - Null/empty rate (what % of features have this field populated)
  - Example values (3-5 representative values)
- **Anomalies** — anything unexpected: duplicate IDs, features outside the park boundary, malformed geometries, inconsistent value formats

---

## Open Questions to Resolve

The following questions must be answered before normalization code is written. They are grouped by layer.

### Park Boundary
- **Geometry type:** The catalog shows a single Polygon — confirm it is suitable as a spatial filter without needing to be converted to a MultiPolygon.

### Lean-Tos
- **Park boundary filtering:** The lean-to layer contains 316 features covering all of NYS. Normalization must spatially filter to only those within the Adirondack Park boundary polygon. Confirm the expected count after filtering.
- **Freeform condition fields:** `DESCRIP` and `NOTES` are freeform text fields with no consistent structure (e.g. "Fair Condition", "Built For Ada", "-99"). Decide whether to attempt to extract condition data from these fields or discard them entirely in v1.
- **`UPDATED` timestamp:** Stored as a Unix timestamp in milliseconds. Confirm this is the last-updated date for the record and include it in the normalized output as an ISO date string.
- **Fields to discard:** `PHOTO_LINK` (87% null, internal network paths), all `ACC_*` fields (100% null), `ACCU_METHODS` (metadata about GPS accuracy, not user-facing). Confirm these should be dropped in normalization.

### Water Features
- **Wrong layer identified:** `dil_reference/MapServer/2` is the Forest Ranger Contact layer, not water bodies. The correct water layer must be identified by browsing the `dil_reference` MapServer layer list. Candidate layers to investigate: any layer named "Lakes", "Streams", "Water Bodies", or similar.
- **Geometry types:** Once the correct layer is found, determine whether water features are points, lines, polygons, or a mix. Normalization must handle whichever types are present.
- **Water feature classification:** Determine whether the correct layer includes feature type values (lake, stream, river, pond, spring) and whether any types should be excluded (e.g. intermittent streams).

### Parking (Routing Start Points)
- **Non-hiking lots:** Parking lots include fishing access, boat launches, and other non-hiking uses. These are not excluded — any public DEC parking lot is a valid approach start point for routing purposes.
- **Generic names:** Some lots are named "Parking Area" with no further context. These are acceptable — the lot is still a valid routing target even without a descriptive name.
- **Coverage assessment:** ~528 lots in the Adirondack region (REGION=5). Verify geographic distribution after spatial filtering to the park boundary.

---

## Catalog Output

Produce `pipeline/catalog/CATALOG.md` with one section per layer. This file is committed to the repo and becomes the reference document for normalization.

### Structure per layer

```markdown
## Layer: <name>
- Source: <url or api>
- Feature count: <n>
- Geometry type: <type>
- Null geometry count: <n>

### Fields
| Field | Type | Null rate | Example values |
|---|---|---|---|
| FIELD_NAME | string | 0% | "value1", "value2" |

### Anomalies
- <any issues found>

### Open Questions Resolved
- <answers to any open questions above>
```

---

## Done When

- `CATALOG.md` has a complete entry for every layer
- All open questions listed above are answered or explicitly noted as unresolvable from the data alone
- Any newly discovered anomalies or questions are documented
- Normalization field mappings can be written without further API inspection
