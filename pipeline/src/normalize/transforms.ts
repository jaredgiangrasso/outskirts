import type { Feature, Point, Polygon } from 'geojson';
import type { LeanTo, Campsite, ParkingLot, WaterFeature, ParkBoundary } from './types.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function trimOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

export function msToIso(ms: unknown): string {
  return new Date(Number(ms)).toISOString();
}

export function toBoolean(value: unknown, trueValue: string): boolean {
  return value === trueValue;
}

function requirePoint(feature: Feature): Point | null {
  if (!feature.geometry || feature.geometry.type !== 'Point') return null;
  return feature.geometry as Point;
}

function requirePolygon(feature: Feature): Polygon | null {
  if (!feature.geometry || feature.geometry.type !== 'Polygon') return null;
  return feature.geometry as Polygon;
}

function props(feature: Feature): Record<string, unknown> {
  return (feature.properties ?? {}) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Per-layer normalizers
// ---------------------------------------------------------------------------

export function normalizeLeanTo(feature: Feature): LeanTo | null {
  const geometry = requirePoint(feature);
  if (!geometry) return null;

  const p = props(feature);
  const name = trimOrNull(p['NAME']);
  if (name === null) return null;

  return {
    id: p['ASSET_UID'] as number,
    name,
    facility: trimOrNull(p['FACILITY']) ?? '',
    unit: trimOrNull(p['UNIT']) ?? '',
    region: p['REGION'] as number,
    office: trimOrNull(p['OFFICE']) ?? '',
    accessible: toBoolean(p['ACCESSIBLE'], 'Y'),
    asset_num: trimOrNull(p['ASSET_NUM']),
    updated: msToIso(p['UPDATED']),
    geometry,
  };
}

export function normalizeCampsite(feature: Feature): Campsite | null {
  const geometry = requirePoint(feature);
  if (!geometry) return null;

  const p = props(feature);
  if (p['PUBLICUSE'] !== 'Y') return null;

  const name = trimOrNull(p['NAME']);
  if (name === null) return null;

  return {
    id: p['ASSET_UID'] as number,
    name,
    facility: trimOrNull(p['FACILITY']) ?? '',
    unit: trimOrNull(p['UNIT']) ?? '',
    region: p['REGION'] as number,
    office: trimOrNull(p['OFFICE']) ?? '',
    accessible: toBoolean(p['ACCESSIBLE'], 'Y'),
    asset_num: trimOrNull(p['ASSET_NUM']),
    updated: msToIso(p['UPDATED']),
    geometry,
  };
}

export function normalizeParkingLot(feature: Feature): ParkingLot | null {
  const geometry = requirePoint(feature);
  if (!geometry) return null;

  const p = props(feature);
  const name = trimOrNull(p['NAME']);
  if (name === null) return null;

  return {
    id: p['ASSET_UID'] as number,
    name,
    facility: trimOrNull(p['FACILITY']) ?? '',
    unit: trimOrNull(p['UNIT']) ?? '',
    region: p['REGION'] as number,
    asset: trimOrNull(p['ASSET']) ?? '',
    asset_num: trimOrNull(p['ASSET_NUM']),
    geometry,
  };
}

export function normalizeWaterFeature(feature: Feature): WaterFeature | null {
  const p = props(feature);

  const lat = p['PRIM_LAT_D'] as number | null;
  const lng = p['PRIM_LONG1'] as number | null;
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;

  const geometry: Point = { type: 'Point', coordinates: [lng, lat] };

  const name = trimOrNull(p['NAME']);
  if (name === null) return null;

  return {
    id: p['FEATURE_ID'] as number,
    name,
    feature_class: (p['FEATURE_CL'] as string) ?? '',
    county: (p['COUNTY'] as string) ?? '',
    geometry,
  };
}

export function normalizeParkBoundary(feature: Feature): ParkBoundary | null {
  const geometry = requirePolygon(feature);
  if (!geometry) return null;
  return { geometry };
}
