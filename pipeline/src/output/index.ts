import fs from 'fs/promises';
import path from 'path';
import type { FeatureCollection, Point } from 'geojson';
import { assembleShelter, assembleParking, assembleWater, assembleSheltersFile } from './assemble.js';

const ENRICHED_DIR = path.resolve('enriched');
const NORMALIZED_DIR = path.resolve('normalized');
const OUT_FILE = path.resolve('..', 'frontend', 'public', 'shelters.json');

async function loadFeatureCollection(filePath: string): Promise<FeatureCollection> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as FeatureCollection;
}

export async function runOutput(): Promise<void> {
  const leanTosFC = await loadFeatureCollection(path.join(ENRICHED_DIR, 'lean_tos.geojson'));
  const campsitesFC = await loadFeatureCollection(path.join(ENRICHED_DIR, 'campsites.geojson'));
  const parkingFC = await loadFeatureCollection(path.join(NORMALIZED_DIR, 'parking.geojson'));
  const waterFC = await loadFeatureCollection(path.join(NORMALIZED_DIR, 'water_features.geojson'));

  const leanTos = leanTosFC.features.map(f =>
    assembleShelter(
      f.properties as Record<string, unknown>,
      (f.geometry as Point).coordinates as [number, number],
      'lean-to',
    ),
  );

  const campsites = campsitesFC.features.map(f =>
    assembleShelter(
      f.properties as Record<string, unknown>,
      (f.geometry as Point).coordinates as [number, number],
      'campsite',
    ),
  );

  const parking = parkingFC.features.map(f =>
    assembleParking(
      f.properties as Record<string, unknown>,
      (f.geometry as Point).coordinates as [number, number],
    ),
  );

  const water = waterFC.features.map(f =>
    assembleWater(
      f.properties as Record<string, unknown>,
      (f.geometry as Point).coordinates as [number, number],
    ),
  );

  const output = assembleSheltersFile(leanTos, campsites, parking, water);

  await fs.writeFile(OUT_FILE, JSON.stringify(output));

  const sizeKB = Math.round((await fs.stat(OUT_FILE)).size / 1024);
  console.log(`  shelters.json written to frontend/public/ (${sizeKB} KB)`);
  console.log(`  ${leanTos.length} lean-tos, ${campsites.length} campsites, ${parking.length} parking lots, ${water.length} water features`);
}
