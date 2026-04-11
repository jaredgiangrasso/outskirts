import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LineString } from 'geojson';
import {
  assembleShelter,
  assembleParking,
  assembleWater,
  assembleSheltersFile,
} from './assemble.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const route: LineString = {
  type: 'LineString',
  coordinates: [[-74.3, 44.3], [-74.31, 44.31]],
};

const leanToProps: Record<string, unknown> = {
  id: 765,
  name: 'Saginaw Bay Lean-To',
  facility: 'Saranac Lakes Wild Forest',
  unit: 'AFP',
  region: 5,
  office: 'RAY BROOK',
  accessible: false,
  asset_num: '1615-301',
  updated: '2025-05-07T00:00:00.000Z',
  nearest_parking_straight_m: 3200,
  nearest_parking_m: 4800,
  nearest_parking_id: 18154,
  nearest_parking_route: route,
  nearest_water_m: 210,
  nearest_water_id: 10,
  nearest_shelter_m: 1500,
  nearest_shelter_id: 101,
  nearest_shelter_type: 'campsite',
};

const campsiteProps: Record<string, unknown> = {
  id: 227854,
  name: 'Clear Pond Campsite 3',
  facility: 'Black River Wild Forest',
  unit: 'AFP',
  region: 6,
  office: 'HERKIMER',
  accessible: true,
  asset_num: null,
  updated: '2024-09-05T00:00:00.000Z',
  nearest_parking_straight_m: 500,
  nearest_parking_m: null,
  nearest_parking_id: null,
  nearest_parking_route: null,
  nearest_water_m: 80,
  nearest_water_id: 11,
  nearest_shelter_m: null,
  nearest_shelter_id: null,
  nearest_shelter_type: null,
};

const parkingProps: Record<string, unknown> = {
  id: 18154,
  name: "Vroman's Nose Parking Lot #2",
  facility: "Vroman's Nose Unique Area",
  unit: 'Schoharie 73',
  region: 4,
  asset: 'UNPAVED PARKING LOT',
  asset_num: '1349-332',
};

const waterProps: Record<string, unknown> = {
  id: 10,
  name: 'Scotts Brook',
  feature_class: 'Stream',
  county: 'Essex',
};

const coords: [number, number] = [-74.3, 44.3];

// ---------------------------------------------------------------------------
// assembleShelter
// ---------------------------------------------------------------------------

describe('assembleShelter — lean-to', () => {
  it('sets type to lean-to', () => {
    const result = assembleShelter(leanToProps, coords, 'lean-to');
    assert.equal(result.type, 'lean-to');
  });

  it('flattens coordinates into lng/lat', () => {
    const result = assembleShelter(leanToProps, coords, 'lean-to');
    assert.equal(result.lng, -74.3);
    assert.equal(result.lat, 44.3);
  });

  it('maps all scalar fields correctly', () => {
    const result = assembleShelter(leanToProps, coords, 'lean-to');
    assert.equal(result.id, 765);
    assert.equal(result.name, 'Saginaw Bay Lean-To');
    assert.equal(result.facility, 'Saranac Lakes Wild Forest');
    assert.equal(result.unit, 'AFP');
    assert.equal(result.region, 5);
    assert.equal(result.office, 'RAY BROOK');
    assert.equal(result.accessible, false);
    assert.equal(result.asset_num, '1615-301');
    assert.equal(result.updated, '2025-05-07T00:00:00.000Z');
  });

  it('maps all metric fields correctly', () => {
    const result = assembleShelter(leanToProps, coords, 'lean-to');
    assert.equal(result.nearest_parking_straight_m, 3200);
    assert.equal(result.nearest_parking_m, 4800);
    assert.equal(result.nearest_parking_id, 18154);
    assert.deepEqual(result.nearest_parking_route, route);
    assert.equal(result.nearest_water_m, 210);
    assert.equal(result.nearest_water_id, 10);
    assert.equal(result.nearest_shelter_m, 1500);
    assert.equal(result.nearest_shelter_id, 101);
    assert.equal(result.nearest_shelter_type, 'campsite');
  });

  it('preserves null metric fields', () => {
    const result = assembleShelter(campsiteProps, coords, 'campsite');
    assert.equal(result.nearest_parking_m, null);
    assert.equal(result.nearest_parking_id, null);
    assert.equal(result.nearest_parking_route, null);
    assert.equal(result.nearest_shelter_m, null);
    assert.equal(result.nearest_shelter_id, null);
    assert.equal(result.nearest_shelter_type, null);
  });

  it('does not include geometry or raw coordinate fields', () => {
    const result = assembleShelter(leanToProps, coords, 'lean-to') as unknown as Record<string, unknown>;
    assert.equal(result['geometry'], undefined);
    assert.equal(result['coordinates'], undefined);
  });
});

// ---------------------------------------------------------------------------
// assembleParking
// ---------------------------------------------------------------------------

describe('assembleParking', () => {
  it('maps id, name, facility, lng, lat', () => {
    const result = assembleParking(parkingProps, coords);
    assert.equal(result.id, 18154);
    assert.equal(result.name, "Vroman's Nose Parking Lot #2");
    assert.equal(result.facility, "Vroman's Nose Unique Area");
    assert.equal(result.lng, -74.3);
    assert.equal(result.lat, 44.3);
  });

  it('does not include fields not in ParkingFeature', () => {
    const result = assembleParking(parkingProps, coords) as unknown as Record<string, unknown>;
    assert.equal(result['unit'], undefined);
    assert.equal(result['asset'], undefined);
    assert.equal(result['asset_num'], undefined);
    assert.equal(result['region'], undefined);
  });
});

// ---------------------------------------------------------------------------
// assembleWater
// ---------------------------------------------------------------------------

describe('assembleWater', () => {
  it('maps id, name, feature_class, lng, lat', () => {
    const result = assembleWater(waterProps, coords);
    assert.equal(result.id, 10);
    assert.equal(result.name, 'Scotts Brook');
    assert.equal(result.feature_class, 'Stream');
    assert.equal(result.lng, -74.3);
    assert.equal(result.lat, 44.3);
  });

  it('does not include fields not in WaterFeature', () => {
    const result = assembleWater(waterProps, coords) as unknown as Record<string, unknown>;
    assert.equal(result['county'], undefined);
  });
});

// ---------------------------------------------------------------------------
// assembleSheltersFile
// ---------------------------------------------------------------------------

describe('assembleSheltersFile', () => {
  const lt = assembleShelter(leanToProps, coords, 'lean-to');
  // Note: using stubs here since assembleShelter throws — this describe block
  // will only run correctly once all functions are implemented.

  it('meta counts match array lengths', () => {
    const leanTos = [lt];
    const campsites = [assembleShelter(campsiteProps, coords, 'campsite')];
    const parking = [assembleParking(parkingProps, coords)];
    const water = [assembleWater(waterProps, coords)];

    const result = assembleSheltersFile(leanTos, campsites, parking, water);
    assert.equal(result.meta.lean_to_count, 1);
    assert.equal(result.meta.campsite_count, 1);
    assert.equal(result.meta.parking_count, 1);
    assert.equal(result.meta.water_count, 1);
  });

  it('meta.generated_at is a valid ISO string', () => {
    const leanTos = [lt];
    const result = assembleSheltersFile(leanTos, [], [], []);
    assert.doesNotThrow(() => new Date(result.meta.generated_at));
    assert.ok(result.meta.generated_at.endsWith('Z'));
  });

  it('arrays are passed through unchanged', () => {
    const leanTos = [lt];
    const result = assembleSheltersFile(leanTos, [], [], []);
    assert.equal(result.lean_tos.length, 1);
    assert.equal(result.lean_tos[0], lt);
  });
});
