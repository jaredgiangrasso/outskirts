import Flatbush from 'flatbush';

export interface IndexedFeature {
  id: number;
  lng: number;
  lat: number;
  type?: string;
}

export interface SpatialIndex {
  tree: Flatbush;
  features: IndexedFeature[];
}

export function buildIndex(features: IndexedFeature[]): SpatialIndex {
  const tree = new Flatbush(features.length);
  for (const f of features) {
    tree.add(f.lng, f.lat, f.lng, f.lat);
  }
  tree.finish();
  return { tree, features };
}

export function kNearest(index: SpatialIndex, lng: number, lat: number, k: number): IndexedFeature[] {
  const indices = index.tree.neighbors(lng, lat, k);
  return indices.map(i => index.features[i]!);
}

export function straightLineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6_371_000; // Earth radius in meters
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const dLat = lat2Rad - lat1Rad;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
