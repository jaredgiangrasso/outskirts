/**
 * Probe script — verifies that the Mapbox Directions API returns a plausible
 * walking route between a known lean-to and its nearest parking lot.
 *
 * Usage:
 *   MAPBOX_TOKEN=<token> tsx scripts/probe-mapbox.ts
 *
 * Or with .env loaded:
 *   tsx --env-file .env scripts/probe-mapbox.ts
 */

const token = process.env['MAPBOX_TOKEN'];
if (!token) {
  console.error('Error: MAPBOX_TOKEN environment variable is not set.');
  process.exit(1);
}

// Saginaw Bay Lean-To
const leanTo = { name: 'Saginaw Bay Lean-To', lng: -74.30263545150858, lat: 44.30289559828392 };
// Follensby Clear (North) Fishing Access Parking — nearest by straight-line
const parking = { name: 'Follensby Clear (North) Fishing Access Parking', lng: -74.335504970915, lat: 44.3195904178847 };

const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${leanTo.lng},${leanTo.lat};${parking.lng},${parking.lat}?geometries=geojson&overview=full&access_token=${token}`;

console.log(`\nRouting: "${leanTo.name}" → "${parking.name}"`);
console.log(`From: [${leanTo.lng}, ${leanTo.lat}]`);
console.log(`To:   [${parking.lng}, ${parking.lat}]\n`);

const res = await fetch(url);
const json = await res.json() as {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { type: string; coordinates: number[][] };
  }>;
  message?: string;
};

if (json.code !== 'Ok' || !json.routes?.length) {
  console.error('Mapbox returned no route:', json.code, json.message ?? '');
  process.exit(1);
}

const route = json.routes[0]!;
const distanceKm = (route.distance / 1000).toFixed(2);
const durationMin = (route.duration / 60).toFixed(0);
const coordCount = route.geometry.coordinates.length;

console.log(`Status:        ${json.code}`);
console.log(`Distance:      ${distanceKm} km (${route.distance} m)`);
console.log(`Duration:      ${durationMin} min`);
console.log(`Route points:  ${coordCount} coordinates`);
console.log(`Geometry type: ${route.geometry.type}`);
console.log(`\nFirst 3 route coords: ${JSON.stringify(route.geometry.coordinates.slice(0, 3))}`);
console.log(`Last  3 route coords: ${JSON.stringify(route.geometry.coordinates.slice(-3))}`);
const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: route.geometry, properties: { label: 'route' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [leanTo.lng, leanTo.lat] }, properties: { label: leanTo.name } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [parking.lng, parking.lat] }, properties: { label: parking.name } },
  ],
};
console.log('\n--- Paste into geojson.io ---');
console.log(JSON.stringify(geojson));
