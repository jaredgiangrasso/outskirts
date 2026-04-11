import type { LineString } from 'geojson';
import type { ORSClient, ORSRoute } from './compute.js';

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson';
const DELAY_MS = 1600; // ORS free tier: 40 req/min → 1500ms min, 1600ms with margin

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function makeORSClient(token: string): ORSClient {
  let lastCallAt = 0;

  return async (fromLng, fromLat, toLng, toLat): Promise<ORSRoute | null> => {
    // Throttle requests
    const now = Date.now();
    const wait = DELAY_MS - (now - lastCallAt);
    if (wait > 0) await delay(wait);
    lastCallAt = Date.now();

    try {
      const res = await fetch(ORS_URL, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: [[fromLng, fromLat], [toLng, toLat]] }),
      });

      const json = await res.json() as {
        features?: Array<{
          properties: { summary: { distance: number } };
          geometry: { type: string; coordinates: number[][] };
        }>;
        error?: { message: string };
      };

      if (!json.features?.length) return null;

      const feature = json.features[0]!;
      return {
        distanceM: Math.round(feature.properties.summary.distance),
        geometry: feature.geometry as LineString,
      };
    } catch {
      return null;
    }
  };
}
