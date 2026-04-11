import fs from 'fs/promises';
import path from 'path';
import type { FeatureCollection } from 'geojson';
import type { LeanTo, Campsite, ParkingLot, WaterFeature } from '../normalize/types.js';
import type { EnrichedLeanTo, EnrichedCampsite } from './types.js';
import type { IndexedFeature } from './index-builder.js';
import { buildIndex } from './index-builder.js';
import { computeMetrics } from './compute.js';
import { makeORSClient } from './ors.js';

const NORMALIZED_DIR = path.resolve('normalized');
const ENRICHED_DIR = path.resolve('enriched');
const CACHE_DIR = path.join(ENRICHED_DIR, 'cache');

type Props<T> = Omit<T, 'geometry'>;

async function loadNormalized<T>(filename: string): Promise<Array<T & { lng: number; lat: number }>> {
  const raw = await fs.readFile(path.join(NORMALIZED_DIR, filename), 'utf-8');
  const fc = JSON.parse(raw) as FeatureCollection;
  return fc.features.map(f => ({
    ...(f.properties as Props<T>),
    geometry: f.geometry,
    lng: (f.geometry as { coordinates: number[] }).coordinates[0]!,
    lat: (f.geometry as { coordinates: number[] }).coordinates[1]!,
  })) as unknown as Array<T & { lng: number; lat: number }>;
}

// Returns the cached enriched feature for a shelter, or null if not yet computed.
async function loadCached<T>(type: string, id: number): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, type, `${id}.json`), 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Persists an enriched feature immediately so partial runs can be resumed.
async function saveCached<T>(type: string, id: number, feature: T): Promise<void> {
  await fs.writeFile(
    path.join(CACHE_DIR, type, `${id}.json`),
    JSON.stringify(feature),
  );
}

async function writeEnriched<T extends object & { geometry: object }>(
  filename: string,
  features: T[],
): Promise<void> {
  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      geometry: (f as { geometry: object }).geometry as FeatureCollection['features'][0]['geometry'],
      properties: Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'geometry')),
    })),
  };
  await fs.writeFile(path.join(ENRICHED_DIR, filename), JSON.stringify(collection, null, 2));
}

async function processShelters<T extends { id: number; lng: number; lat: number; geometry: object }>(
  type: string,
  shelters: T[],
  parkingIndex: ReturnType<typeof buildIndex>,
  waterIndex: ReturnType<typeof buildIndex>,
  shelterIndex: ReturnType<typeof buildIndex>,
  orsClient: Awaited<ReturnType<typeof makeORSClient>>,
  limit: number,
): Promise<(T & (EnrichedLeanTo | EnrichedCampsite))[]> {
  await fs.mkdir(path.join(CACHE_DIR, type), { recursive: true });

  const results: (T & (EnrichedLeanTo | EnrichedCampsite))[] = [];
  let newCount = 0;
  let skippedCount = 0;
  let noRouteCount = 0;

  for (const shelter of shelters) {
    const cached = await loadCached<T & (EnrichedLeanTo | EnrichedCampsite)>(type, shelter.id);
    if (cached) {
      results.push(cached);
      skippedCount++;
      continue;
    }

    if (newCount >= limit) continue; // limit reached — skip but don't compute

    const metrics = await computeMetrics(
      shelter.lng, shelter.lat, shelter.id,
      parkingIndex, waterIndex, shelterIndex, orsClient,
    );
    if (metrics.nearest_parking_m === null) noRouteCount++;

    const { lng: _lng, lat: _lat, ...rest } = shelter as T & { lng: number; lat: number };
    const enriched = { ...rest, ...metrics } as T & (EnrichedLeanTo | EnrichedCampsite);

    await saveCached(type, shelter.id, enriched);
    results.push(enriched);
    newCount++;

    process.stdout.write(`\r  ${type}: ${skippedCount + newCount} done (${skippedCount} cached, ${newCount} new, ${noRouteCount} no trail)`);
  }

  console.log(`\r  ${type}: ${results.length} done (${skippedCount} cached, ${newCount} new, ${noRouteCount} no trail)${newCount < shelters.length - skippedCount ? ` — ${shelters.length - skippedCount - newCount} remaining` : ''}`);
  return results;
}

export async function runSpatialComputation(): Promise<void> {
  const token = process.env['ORS_TOKEN'];
  if (!token) throw new Error('ORS_TOKEN environment variable is not set');

  const limit = process.env['SPATIAL_LIMIT'] ? parseInt(process.env['SPATIAL_LIMIT'], 10) : Infinity;
  if (limit !== Infinity) console.log(`  Limit: ${limit} new shelters per type`);

  await fs.mkdir(ENRICHED_DIR, { recursive: true });

  const orsClient = makeORSClient(token);

  const leanTos = await loadNormalized<LeanTo>('lean_tos.geojson');
  const campsites = await loadNormalized<Campsite>('campsites.geojson');
  const parking = await loadNormalized<ParkingLot>('parking.geojson');
  const water = await loadNormalized<WaterFeature>('water_features.geojson');

  console.log(`  Loaded: ${leanTos.length} lean-tos, ${campsites.length} campsites, ${parking.length} parking lots, ${water.length} water features`);

  const parkingIndex = buildIndex(parking.map(f => ({ id: f.id, lng: f.lng, lat: f.lat })));
  const waterIndex = buildIndex(water.map(f => ({ id: f.id, lng: f.lng, lat: f.lat })));
  const shelterIndex = buildIndex([
    ...leanTos.map(f => ({ id: f.id, lng: f.lng, lat: f.lat, type: 'lean-to' as const })),
    ...campsites.map(f => ({ id: f.id, lng: f.lng, lat: f.lat, type: 'campsite' as const })),
  ] as IndexedFeature[]);

  const enrichedLeanTos = await processShelters(
    'lean_tos', leanTos, parkingIndex, waterIndex, shelterIndex, orsClient, limit,
  );
  const enrichedCampsites = await processShelters(
    'campsites', campsites, parkingIndex, waterIndex, shelterIndex, orsClient, limit,
  );

  // Only write the assembled GeoJSON files for shelters that have been computed.
  // Shelters not yet processed are omitted until a future run completes them.
  await writeEnriched('lean_tos.geojson', enrichedLeanTos);
  await writeEnriched('campsites.geojson', enrichedCampsites);

  console.log(`  Enriched files written to enriched/`);
}
