import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, kNearest, straightLineMeters } from './index-builder.js';
import type { IndexedFeature } from './index-builder.js';
import { computeMetrics } from './compute.js';
import type { ORSClient } from './compute.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// A small grid of parking features for index tests
const parkingFeatures: IndexedFeature[] = [
  { id: 1, lng: -74.0, lat: 44.0 },
  { id: 2, lng: -74.1, lat: 44.1 },
  { id: 3, lng: -74.5, lat: 44.5 },
  { id: 4, lng: -73.5, lat: 43.5 },
  { id: 5, lng: -74.01, lat: 44.01 }, // very close to id:1
];

const waterFeatures: IndexedFeature[] = [
  { id: 10, lng: -74.05, lat: 44.05 },
  { id: 11, lng: -74.3,  lat: 44.3  },
];

// Shelter at the center, plus a neighbor
const shelterFeatures: IndexedFeature[] = [
  { id: 100, lng: -74.0, lat: 44.0, type: 'lean-to' },
  { id: 101, lng: -74.05, lat: 44.05, type: 'campsite' },
  { id: 102, lng: -74.5, lat: 44.5, type: 'lean-to' },
];

// Simple ORS stub that always succeeds — returns distance proportional to straight-line
const successClient: ORSClient = async (fromLng, fromLat, toLng, toLat) => ({
  distanceM: Math.round(straightLineMeters(fromLng, fromLat, toLng, toLat) * 1.5),
  geometry: { type: 'LineString', coordinates: [[fromLng, fromLat], [toLng, toLat]] },
});

// ORS stub that always returns null (no route found)
const failClient: ORSClient = async () => null;

// ---------------------------------------------------------------------------
// straightLineMeters
// ---------------------------------------------------------------------------

describe('straightLineMeters', () => {
  it('returns 0 for the same point', () => {
    assert.equal(straightLineMeters(-74.0, 44.0, -74.0, 44.0), 0);
  });

  it('returns a positive distance for different points', () => {
    const d = straightLineMeters(-74.0, 44.0, -74.1, 44.1);
    assert.ok(d > 0);
  });

  it('is roughly symmetric', () => {
    const d1 = straightLineMeters(-74.0, 44.0, -74.1, 44.1);
    const d2 = straightLineMeters(-74.1, 44.1, -74.0, 44.0);
    assert.ok(Math.abs(d1 - d2) < 1); // within 1 meter
  });

  it('is approximately correct for a known distance', () => {
    // ~1 degree of latitude ≈ 111,000 m
    const d = straightLineMeters(-74.0, 44.0, -74.0, 45.0);
    assert.ok(d > 110_000 && d < 112_000, `expected ~111000m, got ${d}`);
  });
});

// ---------------------------------------------------------------------------
// buildIndex / kNearest
// ---------------------------------------------------------------------------

describe('buildIndex', () => {
  it('builds without throwing', () => {
    assert.doesNotThrow(() => buildIndex(parkingFeatures));
  });

  it('returns an index with the same number of features', () => {
    const idx = buildIndex(parkingFeatures);
    assert.equal(idx.features.length, parkingFeatures.length);
  });
});

describe('kNearest', () => {
  it('returns k results', () => {
    const idx = buildIndex(parkingFeatures);
    const results = kNearest(idx, -74.0, 44.0, 3);
    assert.equal(results.length, 3);
  });

  it('returns fewer than k when the index has fewer features', () => {
    const idx = buildIndex([{ id: 1, lng: -74.0, lat: 44.0 }]);
    const results = kNearest(idx, -74.0, 44.0, 5);
    assert.equal(results.length, 1);
  });

  it('returns the closest feature first', () => {
    const idx = buildIndex(parkingFeatures);
    // query from exactly id:1's position — id:1 or id:5 (very close) should be first
    const results = kNearest(idx, -74.0, 44.0, 1);
    assert.ok(results[0]!.id === 1 || results[0]!.id === 5);
  });

  it('nearest candidate is closer than non-candidates', () => {
    const idx = buildIndex(parkingFeatures);
    const results = kNearest(idx, -74.0, 44.0, 2);
    const returnedIds = new Set(results.map(f => f.id));
    // id:3 (-74.5, 44.5) and id:4 (-73.5, 43.5) are far — should not be in top 2
    assert.ok(!returnedIds.has(3));
    assert.ok(!returnedIds.has(4));
  });
});

// ---------------------------------------------------------------------------
// computeMetrics
// ---------------------------------------------------------------------------

describe('computeMetrics — parking', () => {
  it('nearest_parking_straight_m is always populated', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, failClient);
    assert.ok(typeof result.nearest_parking_straight_m === 'number');
    assert.ok(result.nearest_parking_straight_m >= 0);
  });

  it('nearest_parking_* are null when ORS cannot find a route', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, failClient);
    assert.equal(result.nearest_parking_m, null);
    assert.equal(result.nearest_parking_id, null);
    assert.equal(result.nearest_parking_route, null);
  });

  it('nearest_parking_m is populated when ORS succeeds', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, successClient);
    assert.ok(result.nearest_parking_m !== null);
    assert.ok(result.nearest_parking_m! >= 0);
    assert.ok(result.nearest_parking_id !== null);
    assert.ok(result.nearest_parking_route !== null);
  });

  it('nearest_parking_m is a rounded integer', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, successClient);
    assert.equal(result.nearest_parking_m, Math.round(result.nearest_parking_m!));
  });

  it('selects the parking lot with the shortest routed distance', async () => {
    // ORS client returns distance based on which lot is queried — id:5 is closest
    // so it should be selected
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, successClient);
    // The nearest parking to [-74.0, 44.0] should be id:1 or id:5
    assert.ok(result.nearest_parking_id === 1 || result.nearest_parking_id === 5);
  });
});

describe('computeMetrics — water', () => {
  it('nearest_water_m is always populated', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, failClient);
    assert.ok(typeof result.nearest_water_m === 'number');
    assert.ok(result.nearest_water_m > 0);
  });

  it('nearest_water_m is a rounded integer', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, failClient);
    assert.equal(result.nearest_water_m, Math.round(result.nearest_water_m));
  });

  it('selects the closer water feature', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    // id:10 is at [-74.05, 44.05], id:11 at [-74.3, 44.3]
    // querying from [-74.0, 44.0] — id:10 is closer
    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, failClient);
    assert.equal(result.nearest_water_id, 10);
  });
});

describe('computeMetrics — neighbor', () => {
  it('excludes the shelter itself from neighbor results', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    // shelter id:100 is at [-74.0, 44.0], same as the query point
    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, failClient);
    assert.notEqual(result.nearest_shelter_id, 100);
  });

  it('returns the nearest neighbor by straight-line distance', async () => {
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(shelterFeatures);

    // id:101 at [-74.05, 44.05] is closer than id:102 at [-74.5, 44.5]
    const result = await computeMetrics(-74.0, 44.0, 100, parkIdx, waterIdx, shelterIdx, failClient);
    assert.equal(result.nearest_shelter_id, 101);
    assert.equal(result.nearest_shelter_type, 'campsite');
  });

  it('nearest_shelter_m is null when no neighbor exists within 50 km', async () => {
    // Single isolated shelter — no neighbors
    const isolatedShelter: IndexedFeature[] = [{ id: 999, lng: -74.0, lat: 44.0, type: 'lean-to' }];
    const parkIdx = buildIndex(parkingFeatures);
    const waterIdx = buildIndex(waterFeatures);
    const shelterIdx = buildIndex(isolatedShelter);

    const result = await computeMetrics(-74.0, 44.0, 999, parkIdx, waterIdx, shelterIdx, failClient);
    assert.equal(result.nearest_shelter_m, null);
    assert.equal(result.nearest_shelter_id, null);
    assert.equal(result.nearest_shelter_type, null);
  });
});
