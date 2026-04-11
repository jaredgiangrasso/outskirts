import type { LineString } from 'geojson';

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
  nearest_parking_route: LineString | null;
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

export interface SheltersFile {
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

export function assembleShelter(
  properties: Record<string, unknown>,
  coordinates: [number, number],
  type: 'lean-to' | 'campsite',
): ShelterFeature {
  return {
    id: properties['id'] as number,
    type,
    name: properties['name'] as string,
    facility: properties['facility'] as string,
    unit: properties['unit'] as string,
    region: properties['region'] as number,
    office: properties['office'] as string,
    accessible: properties['accessible'] as boolean,
    asset_num: (properties['asset_num'] as string | null) ?? null,
    updated: properties['updated'] as string,
    lng: coordinates[0],
    lat: coordinates[1],
    nearest_parking_straight_m: properties['nearest_parking_straight_m'] as number,
    nearest_parking_m: (properties['nearest_parking_m'] as number | null) ?? null,
    nearest_parking_id: (properties['nearest_parking_id'] as number | null) ?? null,
    nearest_parking_route: (properties['nearest_parking_route'] as LineString | null) ?? null,
    nearest_water_m: properties['nearest_water_m'] as number,
    nearest_water_id: properties['nearest_water_id'] as number,
    nearest_shelter_m: (properties['nearest_shelter_m'] as number | null) ?? null,
    nearest_shelter_id: (properties['nearest_shelter_id'] as number | null) ?? null,
    nearest_shelter_type: (properties['nearest_shelter_type'] as 'lean-to' | 'campsite' | null) ?? null,
  };
}

export function assembleParking(
  properties: Record<string, unknown>,
  coordinates: [number, number],
): ParkingFeature {
  return {
    id: properties['id'] as number,
    name: properties['name'] as string,
    facility: properties['facility'] as string,
    lng: coordinates[0],
    lat: coordinates[1],
  };
}

export function assembleWater(
  properties: Record<string, unknown>,
  coordinates: [number, number],
): WaterFeature {
  return {
    id: properties['id'] as number,
    name: properties['name'] as string,
    feature_class: properties['feature_class'] as string,
    lng: coordinates[0],
    lat: coordinates[1],
  };
}

export function assembleSheltersFile(
  leanTos: ShelterFeature[],
  campsites: ShelterFeature[],
  parking: ParkingFeature[],
  water: WaterFeature[],
): SheltersFile {
  return {
    meta: {
      generated_at: new Date().toISOString(),
      lean_to_count: leanTos.length,
      campsite_count: campsites.length,
      parking_count: parking.length,
      water_count: water.length,
    },
    lean_tos: leanTos,
    campsites,
    parking,
    water,
  };
}
