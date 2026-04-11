# Map View Spec

## Overview

The map view is the foundation of the frontend. It loads `shelters.json`, renders lean-tos and campsites as distinct point markers on the Mapbox map, and supports basic click behavior showing a shelter's name and type.

The map already renders (scaffolded in `frontend/src/App.tsx`). This phase wires it to real data.

---

## Goal

A full-screen interactive map showing all shelters with distinct markers, where clicking a shelter surfaces its basic details.

---

## Data Loading

Load `shelters.json` from `/shelters.json` (served from `frontend/public/`) at app startup using a single `fetch` call. While loading, show a loading state. On error, show an error state.

Store the loaded data in React state at the top level (`App.tsx`) and pass it down as props. No global state library needed — the dataset is loaded once and never mutated.

---

## TypeScript Types

Define the frontend types in `src/types.ts` mirroring the pipeline output schema:

```typescript
export interface ShelterFeature {
  id: number;
  type: 'lean-to' | 'campsite';
  name: string;
  facility: string;
  unit: string;
  region: number;
  office: string;
  accessible: boolean;
  asset_num: string | null;
  updated: string;
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

export interface ParkingFeature {
  id: number;
  name: string;
  facility: string;
  lng: number;
  lat: number;
}

export interface WaterFeature {
  id: number;
  name: string;
  feature_class: string;
  lng: number;
  lat: number;
}

export interface SheltersData {
  meta: {
    generated_at: string;
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

export type GeoJSONLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};
```

---

## Map Markers

Render shelters as Mapbox GL JS markers using react-map-gl's `<Marker>` component.

- **Lean-tos:** distinct color/shape from campsites (e.g. dark green triangle or shelter icon)
- **Campsites:** distinct color/shape (e.g. orange circle)
- Markers are rendered at `[shelter.lng, shelter.lat]`
- At low zoom levels (< 10), use small simple markers. No clustering in v1.

Use inline SVG elements for markers rather than image assets — keeps the bundle self-contained and makes styling straightforward.

---

## Click Behavior

When a shelter marker is clicked:
- Store the selected shelter in React state (`selectedShelter: ShelterFeature | null`)
- Show a popup anchored to the marker with:
  - Shelter name
  - Type badge ("Lean-To" or "Campsite")
  - Facility name
  - Accessible indicator if `accessible === true`
- Clicking elsewhere on the map or the popup close button clears the selection

Use react-map-gl's `<Popup>` component.

---

## Component Structure

```
App
├── loads shelters.json, holds state (data, selectedShelter)
├── MapView
│   ├── <Map> (Mapbox, outdoors-v12, centered on ADK)
│   ├── <Marker> × N (lean-tos)
│   ├── <Marker> × N (campsites)
│   └── <Popup> (when selectedShelter is set)
└── LoadingState / ErrorState (while data loads)
```

---

## Map Configuration

- **Style:** `mapbox://styles/mapbox/outdoors-v12` (renders trails natively)
- **Initial center:** `[-74.2, 44.1]` (Adirondack Park)
- **Initial zoom:** `8`
- **Token:** `import.meta.env.VITE_MAPBOX_TOKEN`

---

## Environment

`VITE_MAPBOX_TOKEN` must be set in `frontend/.env.local`. The frontend already reads this. Add `.env.local` to `.gitignore` if not already present.

---

## Done When

- `shelters.json` loads successfully and all shelter markers appear on the map
- Lean-to and campsite markers are visually distinct
- Clicking a marker shows a popup with name, type, facility, and accessibility
- Clicking away dismisses the popup
- Loading and error states are handled
