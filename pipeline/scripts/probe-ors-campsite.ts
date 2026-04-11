const token = process.env['ORS_TOKEN'];
if (!token) { console.error('ORS_TOKEN not set'); process.exit(1); }

// Designated South Lake Campsite 1 → South Lake Parking Lot (0.2km apart)
const from = { name: 'Designated South Lake Campsite 1', lng: -74.9092811540432, lat: 43.51671101430926 };
const to   = { name: 'South Lake Parking Lot',           lng: -74.90931211081903, lat: 43.5186443914863 };

console.log(`\nRouting: "${from.name}" → "${to.name}"`);
console.log(`From: [${from.lng}, ${from.lat}]`);
console.log(`To:   [${to.lng}, ${to.lat}]`);
console.log(`Straight-line: ~0.2 km\n`);

const res = await fetch('https://api.openrouteservice.org/v2/directions/foot-hiking/geojson', {
  method: 'POST',
  headers: { Authorization: token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
});

const json = await res.json();
console.log(JSON.stringify(json.error ?? { distance: json.features?.[0]?.properties?.summary?.distance + 'm' }, null, 2));
