import type { LineString } from 'geojson';
import type { SpatialMetrics } from './types.js';
import type { SpatialIndex } from './index-builder.js';
import { kNearest, straightLineMeters } from './index-builder.js';

export interface ORSRoute {
  distanceM: number;
  geometry: LineString;
}

export type ORSClient = (
  fromLng: number, fromLat: number,
  toLng: number, toLat: number,
) => Promise<ORSRoute | null>;

const NEIGHBOR_MAX_M = 50_000;
// k=1 to stay within ORS free tier (~2,000 calls/day for ~1,583 shelters).
// Only the single straight-line nearest lot is tried. If it fails (e.g. boat
// launch with no OSM trail coverage), nearest_parking_* is stored as null.
// See PROJECT_SPEC.md Future Enhancements for the k=5 improvement plan.
const K_PARKING_CANDIDATES = 1;
const K_CANDIDATES = 5;

export async function computeMetrics(
  shelterLng: number,
  shelterLat: number,
  shelterId: number,
  parkingIndex: SpatialIndex,
  waterIndex: SpatialIndex,
  shelterIndex: SpatialIndex,
  orsClient: ORSClient,
): Promise<SpatialMetrics> {
  // --- Nearest parking (routed) ---
  const parkingCandidates = kNearest(parkingIndex, shelterLng, shelterLat, K_PARKING_CANDIDATES);

  // Always compute straight-line to the closest candidate
  const closestParking = parkingCandidates.reduce((best, f) => {
    const d = straightLineMeters(shelterLng, shelterLat, f.lng, f.lat);
    const bd = straightLineMeters(shelterLng, shelterLat, best.lng, best.lat);
    return d < bd ? f : best;
  });
  const nearest_parking_straight_m = Math.round(
    straightLineMeters(shelterLng, shelterLat, closestParking.lng, closestParking.lat),
  );

  // Try routing to each candidate, pick the shortest successful route
  let bestRoute: { distanceM: number; id: number; geometry: LineString } | null = null;
  for (const candidate of parkingCandidates) {
    const route = await orsClient(shelterLng, shelterLat, candidate.lng, candidate.lat);
    if (route && (bestRoute === null || route.distanceM < bestRoute.distanceM)) {
      bestRoute = { distanceM: route.distanceM, id: candidate.id, geometry: route.geometry };
    }
  }

  // --- Nearest water (straight-line) ---
  const waterCandidates = kNearest(waterIndex, shelterLng, shelterLat, K_CANDIDATES);
  const nearestWater = waterCandidates.reduce((best, f) => {
    const d = straightLineMeters(shelterLng, shelterLat, f.lng, f.lat);
    const bd = straightLineMeters(shelterLng, shelterLat, best.lng, best.lat);
    return d < bd ? f : best;
  });
  const nearest_water_m = Math.round(
    straightLineMeters(shelterLng, shelterLat, nearestWater.lng, nearestWater.lat),
  );

  // --- Nearest neighbor (straight-line, exclude self) ---
  const shelterCandidates = kNearest(shelterIndex, shelterLng, shelterLat, K_CANDIDATES)
    .filter(f => f.id !== shelterId);

  let nearestNeighbor: { distanceM: number; id: number; type: string } | null = null;
  for (const candidate of shelterCandidates) {
    const d = Math.round(straightLineMeters(shelterLng, shelterLat, candidate.lng, candidate.lat));
    if (d <= NEIGHBOR_MAX_M && (nearestNeighbor === null || d < nearestNeighbor.distanceM)) {
      nearestNeighbor = { distanceM: d, id: candidate.id, type: candidate.type ?? 'lean-to' };
    }
  }

  return {
    nearest_parking_straight_m,
    nearest_parking_m: bestRoute ? Math.round(bestRoute.distanceM) : null,
    nearest_parking_id: bestRoute ? bestRoute.id : null,
    nearest_parking_route: bestRoute ? bestRoute.geometry : null,
    nearest_water_m,
    nearest_water_id: nearestWater.id,
    nearest_shelter_m: nearestNeighbor ? nearestNeighbor.distanceM : null,
    nearest_shelter_id: nearestNeighbor ? nearestNeighbor.id : null,
    nearest_shelter_type: nearestNeighbor
      ? (nearestNeighbor.type as 'lean-to' | 'campsite')
      : null,
  };
}
