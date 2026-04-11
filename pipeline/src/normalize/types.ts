import type { Point, Polygon } from 'geojson';

export interface LeanTo {
  id: number;
  name: string;
  facility: string;
  unit: string;
  region: number;
  office: string;
  accessible: boolean;
  asset_num: string | null;
  updated: string;
  geometry: Point;
}

export interface Campsite {
  id: number;
  name: string;
  facility: string;
  unit: string;
  region: number;
  office: string;
  accessible: boolean;
  asset_num: string | null;
  updated: string;
  geometry: Point;
}

export interface ParkingLot {
  id: number;
  name: string;
  facility: string;
  unit: string;
  region: number;
  asset: string;
  asset_num: string | null;
  geometry: Point;
}

export interface WaterFeature {
  id: number;
  name: string;
  feature_class: string;
  county: string;
  geometry: Point;
}

export interface ParkBoundary {
  geometry: Polygon;
}
