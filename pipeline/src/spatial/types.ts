import type { LineString } from 'geojson';
import type { LeanTo, Campsite } from '../normalize/types.js';

export interface SpatialMetrics {
  nearest_parking_straight_m: number;
  nearest_parking_m: number | null;
  nearest_parking_id: number | null;
  nearest_parking_route: LineString | null;
  nearest_water_m: number;
  nearest_water_id: number;
  nearest_shelter_m: number | null;
  nearest_shelter_id: number | null;
  nearest_shelter_type: 'lean-to' | 'campsite' | null;
}

export type EnrichedLeanTo = LeanTo & SpatialMetrics;
export type EnrichedCampsite = Campsite & SpatialMetrics;
