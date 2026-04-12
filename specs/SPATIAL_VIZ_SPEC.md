# Spatial Visualization on Click Spec

## Overview

When a shelter is clicked, the map draws three spatial relationship layers simultaneously:
1. The routed trail path to the nearest parking lot (or straight-line if no route)
2. A straight line to the nearest water feature
3. A dashed line to the nearest neighboring shelter

This is the central UX feature of the app. The visualizations appear and disappear as the user selects and deselects shelters.

---

## Data Lookups

All reference features are already in `shelters.json`. When a shelter is selected, look up its related features by ID:

- **Nearest water:** `data.water.find(w => w.id === shelter.nearest_water_id)`
- **Nearest neighbor:** search `[...data.lean_tos, ...data.campsites].find(s => s.id === shelter.nearest_shelter_id)`
- **Nearest parking:** `data.parking.find(p => p.id === shelter.nearest_parking_id)` (needed only when route is null, for fallback straight-line)

The parking route geometry is stored directly on the shelter as `nearest_parking_route` (a `GeoJSONLineString | null`) — no separate lookup needed when a route exists.

**Null cases to handle:**
- `nearest_parking_route === null`: ~30–43% of shelters. Show straight-line to nearest parking lot instead, with a "(straight-line)" label.
- `nearest_parking_id === null`: no routable parking found at all. Omit the parking layer entirely.
- `nearest_shelter_id === null`: no neighbor within range. Omit the neighbor layer.
- Water is always present (`nearest_water_id` is never null).

---

## Map Layers

Use react-map-gl's `<Source>` and `<Layer>` components. All layers are added/removed dynamically when `selectedShelter` changes. Use `beforeId` to keep layers below labels.

### Parking Layer

- **When route exists:** render `nearest_parking_route` LineString as-is
- **When route is null but parking ID exists:** construct a two-point LineString from `[shelter.lng, shelter.lat]` to `[parking.lng, parking.lat]`
- **Line style:** solid, amber (`#f59e0b`), width 3px, opacity 0.9
- **Fallback style:** same color, dashed (`line-dasharray: [4, 3]`), to visually distinguish straight-line estimates

### Water Layer

- Construct a two-point LineString from shelter to water feature
- **Line style:** solid, blue (`#3b82f6`), width 2.5px, opacity 0.85

### Neighbor Layer

- Construct a two-point LineString from shelter to neighbor shelter
- **Line style:** dashed (`line-dasharray: [6, 4]`), muted purple (`#a78bfa`), width 2px, opacity 0.8

---

## Distance Labels

Render a `<Marker>` at the midpoint of each line with a small HTML label showing the distance.

**Midpoint calculation:** average of the two endpoint coordinates (or midpoint of the polyline for the parking route — use the coordinate at `Math.floor(coordinates.length / 2)`).

**Distance formatting:**
- Convert meters to miles: `(meters / 1609.34).toFixed(1) + " mi"`
- Parking label: `"4.2 mi trail"` or `"2.0 mi (est)"` for straight-line fallback
- Water label: `"0.1 mi"`
- Neighbor label: `"0.5 mi"`

**Label style:** small pill (white background, 1px border matching the line color, 11px sans-serif, rounded). Keep compact — these appear on top of map content.

---

## Detail Panel

Replace the existing `<Popup>` with a fixed detail panel anchored to the bottom-left of the screen. The panel shows when `selectedShelter` is set and is dismissed via a close button or by clicking the map.

**Panel content:**

```
[Type badge]  [Accessible badge if applicable]
Shelter Name                            [✕]
Facility name · Region X

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🅿  Nearest Parking     4.2 mi trail
                        (Loj Road Parking Lot)

💧  Nearest Water       0.1 mi
                        (Ausable River)

⛺  Nearest Shelter     0.5 mi
                        (Lean-To · Heart Lake Lean-To)
```

- Panel width: 300px, fixed position bottom-left with 16px margin
- Parking row shows "(est)" instead of "trail" when route is null
- If parking is entirely absent (null ID), show "No parking data"
- If neighbor is absent, show "No nearby shelters"
- Smooth slide-up animation when panel appears (`transform: translateY` transition, 200ms ease-out)

---

## Component Structure

```
App
├── data, selectedShelter state
└── <Map onClick={clearSelection}>
    ├── MapView (markers only — no longer renders Popup)
    └── SpatialLayers (new — renders when selectedShelter is set)
        ├── <Source> + <Layer> (parking)
        ├── <Source> + <Layer> (water)
        ├── <Source> + <Layer> (neighbor)
        ├── <Marker> (parking distance label)
        ├── <Marker> (water distance label)
        └── <Marker> (neighbor distance label)

DetailPanel (fixed overlay, outside <Map>)
└── renders when selectedShelter is set
```

`SpatialLayers` receives: `shelter`, `data` (for lookups), rendered inside `<Map>`.
`DetailPanel` receives: `shelter | null`, `onClose` — rendered as a sibling of `<Map>` in the top-level div.

---

## Color System

| Layer | Color | Usage |
|---|---|---|
| Parking route | `#f59e0b` (amber) | Trail line and label border |
| Water line | `#3b82f6` (blue) | Water line and label border |
| Neighbor line | `#a78bfa` (purple) | Neighbor dashed line and label border |
| Lean-to marker | `#2d6a4f` (dark green) | Already established |
| Campsite marker | `#e07b39` (orange) | Already established |

---

## Done When

- Clicking a shelter draws all applicable spatial layers on the map
- Parking: route line when available, straight-line fallback otherwise, omitted when no parking found
- Water: always drawn (water data always present)
- Neighbor: drawn when a neighbor exists, omitted otherwise
- Distance labels appear at line midpoints
- Detail panel shows shelter info and all three metrics
- Clicking the map or the close button dismisses everything
- Slide-up animation on panel appearance
