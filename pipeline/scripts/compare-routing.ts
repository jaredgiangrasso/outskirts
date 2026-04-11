/**
 * Routing comparison script — tests Mapbox Directions vs OpenRouteService
 * for 4 lean-to → parking pairs spread across the Adirondack Park.
 *
 * Usage:
 *   npx tsx --env-file .env scripts/compare-routing.ts
 *
 * Output:
 *   - A comparison table printed to the console
 *   - A GeoJSON file written to scripts/compare-routing-output.geojson
 *     Paste into geojson.io to visually compare the routes.
 */

const mapboxToken = process.env['MAPBOX_TOKEN'];
const orsToken = process.env['ORS_TOKEN'];

if (!mapboxToken) { console.error('Error: MAPBOX_TOKEN not set'); process.exit(1); }
if (!orsToken) { console.error('Error: ORS_TOKEN not set'); process.exit(1); }

interface Coord { name: string; lng: number; lat: number; }
interface Pair { leanTo: Coord; parking: Coord; straightLineM: number; }

const pairs: Pair[] = [
  {
    leanTo:   { name: 'Saginaw Bay Lean-To',   lng: -74.30263545150858, lat: 44.30289559828392 },
    parking:  { name: 'Follensby Clear (North) Fishing Access Parking', lng: -74.335504970915, lat: 44.3195904178847 },
    straightLineM: 4092,
  },
  {
    leanTo:   { name: 'Pharaoh Lake #4 Lean-To', lng: -73.62965047688773, lat: 43.81384303060584 },
    parking:  { name: 'Berrymill Pond Parking',   lng: -73.57167627148603, lat: 43.837374043873574 },
    straightLineM: 6945,
  },
  {
    leanTo:   { name: 'Puffer Pond #1 Lean-To', lng: -74.19207855519194, lat: 43.67767272911455 },
    parking:  { name: 'John Pond Parking Lot',   lng: -74.22056115873863, lat: 43.731711104391444 },
    straightLineM: 6780,
  },
  {
    leanTo:   { name: 'Spruce Lake #2 Lean-To', lng: -74.60808763478578, lat: 43.53463940017261 },
    parking:  { name: 'Trail Parking',           lng: -74.56237010691979, lat: 43.52325630968553 },
    straightLineM: 5230,
  },
];

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function routeMapbox(from: Coord, to: Coord): Promise<{ distanceM: number; geometry: object } | null> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${mapboxToken}`;
  const res = await fetch(url);
  const json = await res.json() as { code: string; routes?: Array<{ distance: number; geometry: object }> };
  if (json.code !== 'Ok' || !json.routes?.length) return null;
  return { distanceM: Math.round(json.routes[0]!.distance), geometry: json.routes[0]!.geometry };
}

async function routeORS(from: Coord, to: Coord): Promise<{ distanceM: number; geometry: object } | null> {
  const url = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': orsToken!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
  });
  const json = await res.json() as {
    features?: Array<{ properties: { summary: { distance: number } }; geometry: object }>;
    error?: { message: string };
  };
  if (!json.features?.length) {
    console.error('  ORS error:', json.error?.message ?? JSON.stringify(json));
    return null;
  }
  return {
    distanceM: Math.round(json.features[0]!.properties.summary.distance),
    geometry: json.features[0]!.geometry,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const geoFeatures: object[] = [];

console.log('\n=== Routing Comparison: Mapbox Walking vs ORS foot-hiking ===\n');
console.log(`${'Pair'.padEnd(30)} ${'Straight-line'.padStart(13)} ${'Mapbox'.padStart(10)} ${'ORS'.padStart(10)} ${'Ratio MB'.padStart(10)} ${'Ratio ORS'.padStart(10)}`);
console.log('─'.repeat(88));

for (const pair of pairs) {
  const label = pair.leanTo.name.slice(0, 28);
  process.stdout.write(`${label.padEnd(30)} ${(pair.straightLineM + 'm').padStart(13)}`);

  const [mapbox, ors] = await Promise.all([
    routeMapbox(pair.leanTo, pair.parking),
    routeORS(pair.leanTo, pair.parking),
  ]);

  const mbStr = mapbox ? `${mapbox.distanceM}m` : 'no route';
  const orsStr = ors ? `${ors.distanceM}m` : 'no route';
  const mbRatio = mapbox ? (mapbox.distanceM / pair.straightLineM).toFixed(1) + 'x' : '—';
  const orsRatio = ors ? (ors.distanceM / pair.straightLineM).toFixed(1) + 'x' : '—';

  console.log(` ${mbStr.padStart(10)} ${orsStr.padStart(10)} ${mbRatio.padStart(10)} ${orsRatio.padStart(10)}`);

  // Add points to GeoJSON output
  geoFeatures.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [pair.leanTo.lng, pair.leanTo.lat] },
    properties: { label: pair.leanTo.name, type: 'lean-to' },
  });
  geoFeatures.push({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [pair.parking.lng, pair.parking.lat] },
    properties: { label: pair.parking.name, type: 'parking' },
  });
  if (mapbox) {
    geoFeatures.push({
      type: 'Feature',
      geometry: mapbox.geometry,
      properties: { label: `Mapbox: ${pair.leanTo.name}`, service: 'mapbox', distanceM: mapbox.distanceM },
    });
  }
  if (ors) {
    geoFeatures.push({
      type: 'Feature',
      geometry: ors.geometry,
      properties: { label: `ORS: ${pair.leanTo.name}`, service: 'ors', distanceM: ors.distanceM },
    });
  }
}

const outputPath = 'scripts/compare-routing-output.geojson';
const fs = await import('fs/promises');
await fs.writeFile(outputPath, JSON.stringify({ type: 'FeatureCollection', features: geoFeatures }, null, 2));

console.log(`\nGeoJSON written to ${outputPath}`);
console.log('Paste the file contents into geojson.io to compare routes visually.');
console.log('Mapbox routes and ORS routes are labelled separately — toggle layers to compare.\n');
