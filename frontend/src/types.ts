export type GeoJSONLineString = {
  type: 'LineString';
  coordinates: [number, number][];
};

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
