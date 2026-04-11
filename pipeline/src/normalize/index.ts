import fs from 'fs/promises';
import path from 'path';
import { booleanPointInPolygon } from '@turf/turf';
import type { FeatureCollection, Feature, Point } from 'geojson';
import type { CacheFile } from '../ingest/cache.js';
import type { LeanTo, Campsite, ParkingLot, WaterFeature, ParkBoundary } from './types.js';
import {
  normalizeLeanTo,
  normalizeCampsite,
  normalizeParkingLot,
  normalizeWaterFeature,
  normalizeParkBoundary,
} from './transforms.js';

const CACHE_DIR = path.resolve('cache');
const OUT_DIR = path.resolve('normalized');

async function loadCache(filename: string): Promise<Feature[]> {
  const raw = await fs.readFile(path.join(CACHE_DIR, filename), 'utf-8');
  const cache = JSON.parse(raw) as CacheFile<FeatureCollection>;
  return cache.data.features;
}

function withinBoundary(geometry: Point, boundary: ParkBoundary): boolean {
  return booleanPointInPolygon(geometry, boundary.geometry);
}

function logCounts(layer: string, total: number, nullGeom: number, outsideBoundary: number, publicUseDropped: number, out: number): void {
  console.log(`  ${layer}: ${total} in → ${nullGeom} null geom, ${outsideBoundary} outside boundary${publicUseDropped > 0 ? `, ${publicUseDropped} PUBLICUSE=N` : ''} → ${out} out`);
}

async function writeGeoJSON<T extends { geometry: Point | import('geojson').Polygon }>(
  filename: string,
  features: T[],
): Promise<void> {
  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: Object.fromEntries(
        Object.entries(f).filter(([k]) => k !== 'geometry'),
      ),
    })),
  };
  await fs.writeFile(path.join(OUT_DIR, filename), JSON.stringify(collection, null, 2));
}

async function writeParkBoundary(boundary: ParkBoundary): Promise<void> {
  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: boundary.geometry, properties: {} }],
  };
  await fs.writeFile(path.join(OUT_DIR, 'park_boundary.geojson'), JSON.stringify(collection, null, 2));
}

export async function runNormalization(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Park boundary first — needed for spatial filtering
  const boundaryFeatures = await loadCache('arcgis_park_boundary.json');
  if (boundaryFeatures.length === 0) throw new Error('Park boundary cache is empty');
  const boundary = normalizeParkBoundary(boundaryFeatures[0]!);
  if (!boundary) throw new Error('Failed to extract park boundary geometry');
  await writeParkBoundary(boundary);
  console.log('  Park boundary: loaded');

  // Lean-tos
  {
    const raw = await loadCache('arcgis_lean_tos.json');
    let nullGeom = 0, outsideBoundary = 0;
    const out: LeanTo[] = [];
    for (const f of raw) {
      const result = normalizeLeanTo(f);
      if (!result) { nullGeom++; continue; }
      if (!withinBoundary(result.geometry, boundary)) { outsideBoundary++; continue; }
      out.push(result);
    }
    await writeGeoJSON('lean_tos.geojson', out);
    logCounts('Lean-tos', raw.length, nullGeom, outsideBoundary, 0, out.length);
  }

  // Campsites
  {
    const raw = await loadCache('arcgis_campsites.json');
    let nullGeom = 0, outsideBoundary = 0, publicUseDropped = 0;
    const out: Campsite[] = [];
    for (const f of raw) {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      if (p['PUBLICUSE'] !== 'Y') { publicUseDropped++; continue; }
      const result = normalizeCampsite(f);
      if (!result) { nullGeom++; continue; }
      if (!withinBoundary(result.geometry, boundary)) { outsideBoundary++; continue; }
      out.push(result);
    }
    await writeGeoJSON('campsites.geojson', out);
    logCounts('Campsites', raw.length, nullGeom, outsideBoundary, publicUseDropped, out.length);
  }

  // Parking
  {
    const raw = await loadCache('arcgis_parking.json');
    let nullGeom = 0, outsideBoundary = 0;
    const out: ParkingLot[] = [];
    for (const f of raw) {
      const result = normalizeParkingLot(f);
      if (!result) { nullGeom++; continue; }
      if (!withinBoundary(result.geometry, boundary)) { outsideBoundary++; continue; }
      out.push(result);
    }
    await writeGeoJSON('parking.geojson', out);
    logCounts('Parking', raw.length, nullGeom, outsideBoundary, 0, out.length);
  }

  // Water features
  {
    const raw = await loadCache('arcgis_water_features.json');
    let nullGeom = 0, outsideBoundary = 0;
    const out: WaterFeature[] = [];
    for (const f of raw) {
      const result = normalizeWaterFeature(f);
      if (!result) { nullGeom++; continue; }
      if (!withinBoundary(result.geometry, boundary)) { outsideBoundary++; continue; }
      out.push(result);
    }
    await writeGeoJSON('water_features.geojson', out);
    logCounts('Water features', raw.length, nullGeom, outsideBoundary, 0, out.length);
  }

  console.log(`  Normalized files written to normalized/`);
}
