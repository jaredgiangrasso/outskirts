import { ensureCacheDir, writeCache, cacheExists } from './cache.js';
import { fetchArcGISLayer } from './arcgis.js';

const ARCGIS_BASE = 'https://gisservices.dec.ny.gov/arcgis/rest/services';

const WATER_TYPES = ['Stream', 'Lake', 'Reservoir', 'Spring', 'Swamp', 'Bay', 'Canal', 'Falls', 'Rapids'];
const WATER_WHERE = `ST_ALPHA='NY' AND FEATURE_CL IN ('${WATER_TYPES.join("','")}')`;

const CAMPSITE_TYPES = ['PRIMITIVE CAMPSITE', 'PRIMATIVE CAMPSITE', 'PRIMITIVE TENT SITE'];
const CAMPSITE_WHERE = `ASSET IN ('${CAMPSITE_TYPES.join("','")}')`;

const PARKING_TYPES = ['UNPAVED PARKING LOT', 'PAVED PARKING LOT'];
const PARKING_WHERE = `ASSET IN ('${PARKING_TYPES.join("','")}') AND PUBLICUSE='Y'`;

const LAYERS = {
  leanTos:      `${ARCGIS_BASE}/dil/dil_land_assets_lean_to/MapServer/0`,
  parkBoundary: `${ARCGIS_BASE}/dil_reference/MapServer/7`,
  waterFeatures:`${ARCGIS_BASE}/gnis/MapServer/0`,
  campsites:    `${ARCGIS_BASE}/dec_backcountry_features/MapServer/0`,
  parking:      `${ARCGIS_BASE}/dec_backcountry_features/MapServer/0`,
};

const CACHE_FILES = {
  leanTos:      'arcgis_lean_tos.json',
  parkBoundary: 'arcgis_park_boundary.json',
  waterFeatures:'arcgis_water_features.json',
  campsites:    'arcgis_campsites.json',
  parking:      'arcgis_parking.json',
};

async function fetchAndCache(
  name: string,
  cacheFile: string,
  fetcher: () => Promise<object>,
  source: string,
): Promise<void> {
  if (await cacheExists(cacheFile)) {
    console.log(`[skip] ${name} — already cached`);
    return;
  }
  console.log(`[fetch] ${name}`);
  const data = await fetcher();
  await writeCache(cacheFile, source, data);
  console.log(`[done] ${name} — written to cache/${cacheFile}`);
}

export async function runIngestion(): Promise<void> {
  await ensureCacheDir();

  await fetchAndCache(
    'Lean-tos (ArcGIS)',
    CACHE_FILES.leanTos,
    () => fetchArcGISLayer(LAYERS.leanTos),
    LAYERS.leanTos,
  );

  await fetchAndCache(
    'Park boundary (ArcGIS)',
    CACHE_FILES.parkBoundary,
    () => fetchArcGISLayer(LAYERS.parkBoundary),
    LAYERS.parkBoundary,
  );

  await fetchAndCache(
    'Water features (GNIS)',
    CACHE_FILES.waterFeatures,
    () => fetchArcGISLayer(LAYERS.waterFeatures, WATER_WHERE),
    LAYERS.waterFeatures,
  );

  await fetchAndCache(
    'Campsites (ArcGIS)',
    CACHE_FILES.campsites,
    () => fetchArcGISLayer(LAYERS.campsites, CAMPSITE_WHERE),
    LAYERS.campsites,
  );

  await fetchAndCache(
    'Parking (ArcGIS)',
    CACHE_FILES.parking,
    () => fetchArcGISLayer(LAYERS.parking, PARKING_WHERE),
    LAYERS.parking,
  );
}
