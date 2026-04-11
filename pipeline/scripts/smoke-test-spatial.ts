/**
 * Smoke test — runs spatial computation against the first 15 lean-tos only.
 *
 * Usage:
 *   npx tsx --env-file .env scripts/smoke-test-spatial.ts
 */

import fs from 'fs/promises';
import path from 'path';
import type { FeatureCollection } from 'geojson';
import type { LeanTo, ParkingLot, WaterFeature, Campsite } from '../src/normalize/types.js';
import type { IndexedFeature } from '../src/spatial/index-builder.js';
import { buildIndex } from '../src/spatial/index-builder.js';
import { computeMetrics } from '../src/spatial/compute.js';
import { makeORSClient } from '../src/spatial/ors.js';

const token = process.env['ORS_TOKEN'];
if (!token) { console.error('ORS_TOKEN not set'); process.exit(1); }

const NORMALIZED = path.resolve('normalized');
const LIMIT = 15;

function load<T>(filename: string): Promise<Array<T & { lng: number; lat: number }>> {
  return fs.readFile(path.join(NORMALIZED, filename), 'utf-8').then(raw => {
    const fc = JSON.parse(raw) as FeatureCollection;
    return fc.features.map(f => ({
      ...(f.properties as object),
      geometry: f.geometry,
      lng: (f.geometry as { coordinates: number[] }).coordinates[0]!,
      lat: (f.geometry as { coordinates: number[] }).coordinates[1]!,
    })) as Array<T & { lng: number; lat: number }>;
  });
}

const leanTos = (await load<LeanTo>('lean_tos.geojson')).slice(0, LIMIT);
const campsites = await load<Campsite>('campsites.geojson');
const parking = await load<ParkingLot>('parking.geojson');
const water = await load<WaterFeature>('water_features.geojson');

const parkingIndex = buildIndex(parking.map(f => ({ id: f.id, lng: f.lng, lat: f.lat })));
const waterIndex = buildIndex(water.map(f => ({ id: f.id, lng: f.lng, lat: f.lat })));
const shelterIndex = buildIndex([
  ...leanTos.map(f => ({ id: f.id, lng: f.lng, lat: f.lat, type: 'lean-to' })),
  ...campsites.map(f => ({ id: f.id, lng: f.lng, lat: f.lat, type: 'campsite' })),
] as IndexedFeature[]);

const orsClient = makeORSClient(token);

console.log(`\nRunning spatial computation for ${LIMIT} lean-tos...\n`);
console.log(`${'Name'.padEnd(35)} ${'→ Parking (straight)'.padStart(20)} ${'→ Parking (routed)'.padStart(20)} ${'→ Water'.padStart(10)} ${'→ Neighbor'.padStart(12)}`);
console.log('─'.repeat(100));

let noRouteCount = 0;

for (const lt of leanTos) {
  const metrics = await computeMetrics(lt.lng, lt.lat, lt.id, parkingIndex, waterIndex, shelterIndex, orsClient);
  if (metrics.nearest_parking_m === null) noRouteCount++;

  const straight = `${(metrics.nearest_parking_straight_m / 1000).toFixed(1)} km`;
  const routed = metrics.nearest_parking_m !== null ? `${(metrics.nearest_parking_m / 1000).toFixed(1)} km` : 'no trail';
  const water = `${(metrics.nearest_water_m / 1000).toFixed(1)} km`;
  const neighbor = metrics.nearest_shelter_m !== null ? `${(metrics.nearest_shelter_m / 1000).toFixed(1)} km` : 'none';

  console.log(`${lt.name.slice(0, 33).padEnd(35)} ${straight.padStart(20)} ${routed.padStart(20)} ${water.padStart(10)} ${neighbor.padStart(12)}`);
}

console.log(`\n${LIMIT} lean-tos processed. ${noRouteCount} with no trail access.`);
