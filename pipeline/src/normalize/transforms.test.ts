import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Feature, Point, Polygon } from 'geojson';
import {
  normalizeLeanTo,
  normalizeCampsite,
  normalizeParkingLot,
  normalizeWaterFeature,
  normalizeParkBoundary,
  trimOrNull,
  msToIso,
  toBoolean,
} from './transforms.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePoint(lng: number, lat: number): Point {
  return { type: 'Point', coordinates: [lng, lat] };
}

function leanToFeature(overrides: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    geometry: makePoint(-74.2, 44.1),
    properties: {
      ASSET_UID: 765,
      NAME: 'Saginaw Bay Lean-To ',
      FACILITY: 'Saranac Lakes Wild Forest',
      UNIT: 'AFP',
      REGION: 5,
      OFFICE: 'RAY BROOK',
      ACCESSIBLE: 'N',
      ASSET_NUM: '1615-301',
      UPDATED: 1746576000000,
      ...overrides,
    },
  };
}

function campsiteFeature(overrides: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    geometry: makePoint(-74.5, 44.3),
    properties: {
      ASSET_UID: 227854,
      NAME: 'Clear Pond Campsite 3 ',
      FACILITY: 'Black River Wild Forest',
      UNIT: 'AFP',
      REGION: 6,
      OFFICE: 'HERKIMER',
      ACCESSIBLE: 'Y',
      ASSET_NUM: null,
      UPDATED: 1725494400000,
      PUBLICUSE: 'Y',
      ...overrides,
    },
  };
}

function parkingFeature(overrides: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    geometry: makePoint(-73.9, 43.8),
    properties: {
      ASSET_UID: 18154,
      NAME: "Vroman's Nose Parking Lot #2",
      FACILITY: "Vroman's Nose Unique Area",
      UNIT: 'Schoharie 73',
      REGION: 4,
      ASSET: 'UNPAVED PARKING LOT',
      ASSET_NUM: '1349-332',
      ...overrides,
    },
  };
}

function waterFeature(overrides: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    geometry: makePoint(-73.5, 41.2),
    properties: {
      FEATURE_ID: 210714,
      NAME: 'Scotts Brook',
      FEATURE_CL: 'Stream',
      COUNTY: 'Westchester',
      PRIM_LAT_D: 41.230373,
      PRIM_LONG1: -73.502346,
      ...overrides,
    },
  };
}

function boundaryFeature(): Feature {
  const polygon: Polygon = {
    type: 'Polygon',
    coordinates: [
      [[-75.32, 43.05], [-73.29, 43.05], [-73.29, 44.88], [-75.32, 44.88], [-75.32, 43.05]],
    ],
  };
  return { type: 'Feature', geometry: polygon, properties: {} };
}

// ---------------------------------------------------------------------------
// trimOrNull
// ---------------------------------------------------------------------------

describe('trimOrNull', () => {
  it('trims a string with leading/trailing whitespace', () => {
    assert.equal(trimOrNull('  hello  '), 'hello');
  });

  it('returns null for a whitespace-only string', () => {
    assert.equal(trimOrNull('   '), null);
  });

  it('returns null for null', () => {
    assert.equal(trimOrNull(null), null);
  });

  it('returns null for undefined', () => {
    assert.equal(trimOrNull(undefined), null);
  });

  it('returns the string unchanged when no whitespace to trim', () => {
    assert.equal(trimOrNull('hello'), 'hello');
  });
});

// ---------------------------------------------------------------------------
// msToIso
// ---------------------------------------------------------------------------

describe('msToIso', () => {
  it('converts a millisecond timestamp to an ISO date string', () => {
    // 1746576000000 → 2025-05-07T00:00:00.000Z
    assert.equal(msToIso(1746576000000), '2025-05-07T00:00:00.000Z');
  });

  it('handles timestamp as a number', () => {
    // 0 → epoch
    assert.equal(msToIso(0), '1970-01-01T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// toBoolean
// ---------------------------------------------------------------------------

describe('toBoolean', () => {
  it('returns true when value matches trueValue', () => {
    assert.equal(toBoolean('Y', 'Y'), true);
  });

  it('returns false when value does not match', () => {
    assert.equal(toBoolean('N', 'Y'), false);
  });

  it('returns false for null', () => {
    assert.equal(toBoolean(null, 'Y'), false);
  });
});

// ---------------------------------------------------------------------------
// normalizeLeanTo
// ---------------------------------------------------------------------------

describe('normalizeLeanTo', () => {
  it('maps all fields correctly', () => {
    const result = normalizeLeanTo(leanToFeature());
    assert.ok(result);
    assert.equal(result.id, 765);
    assert.equal(result.name, 'Saginaw Bay Lean-To');   // trimmed
    assert.equal(result.facility, 'Saranac Lakes Wild Forest');
    assert.equal(result.unit, 'AFP');
    assert.equal(result.region, 5);
    assert.equal(result.office, 'RAY BROOK');
    assert.equal(result.accessible, false);
    assert.equal(result.asset_num, '1615-301');
    assert.equal(result.updated, '2025-05-07T00:00:00.000Z');
    assert.deepEqual(result.geometry, makePoint(-74.2, 44.1));
  });

  it('returns null for null geometry', () => {
    const f = leanToFeature();
    f.geometry = null as unknown as Point;
    assert.equal(normalizeLeanTo(f), null);
  });

  it('sets accessible=true when ACCESSIBLE is Y', () => {
    const result = normalizeLeanTo(leanToFeature({ ACCESSIBLE: 'Y' }));
    assert.ok(result);
    assert.equal(result.accessible, true);
  });

  it('sets asset_num to null when blank', () => {
    const result = normalizeLeanTo(leanToFeature({ ASSET_NUM: ' ' }));
    assert.ok(result);
    assert.equal(result.asset_num, null);
  });

  it('sets asset_num to null when null', () => {
    const result = normalizeLeanTo(leanToFeature({ ASSET_NUM: null }));
    assert.ok(result);
    assert.equal(result.asset_num, null);
  });
});

// ---------------------------------------------------------------------------
// normalizeCampsite
// ---------------------------------------------------------------------------

describe('normalizeCampsite', () => {
  it('maps all fields correctly', () => {
    const result = normalizeCampsite(campsiteFeature());
    assert.ok(result);
    assert.equal(result.id, 227854);
    assert.equal(result.name, 'Clear Pond Campsite 3');  // trimmed
    assert.equal(result.accessible, true);
    assert.equal(result.asset_num, null);
    assert.equal(result.updated, '2024-09-05T00:00:00.000Z');
  });

  it('returns null for null geometry', () => {
    const f = campsiteFeature();
    f.geometry = null as unknown as Point;
    assert.equal(normalizeCampsite(f), null);
  });

  it('returns null when PUBLICUSE is N', () => {
    assert.equal(normalizeCampsite(campsiteFeature({ PUBLICUSE: 'N' })), null);
  });

  it('returns null when PUBLICUSE is missing', () => {
    const f = campsiteFeature();
    delete (f.properties as Record<string, unknown>)['PUBLICUSE'];
    assert.equal(normalizeCampsite(f), null);
  });
});

// ---------------------------------------------------------------------------
// normalizeParkingLot
// ---------------------------------------------------------------------------

describe('normalizeParkingLot', () => {
  it('maps all fields correctly', () => {
    const result = normalizeParkingLot(parkingFeature());
    assert.ok(result);
    assert.equal(result.id, 18154);
    assert.equal(result.name, "Vroman's Nose Parking Lot #2");
    assert.equal(result.facility, "Vroman's Nose Unique Area");
    assert.equal(result.unit, 'Schoharie 73');
    assert.equal(result.region, 4);
    assert.equal(result.asset, 'UNPAVED PARKING LOT');
    assert.equal(result.asset_num, '1349-332');
    assert.deepEqual(result.geometry, makePoint(-73.9, 43.8));
  });

  it('returns null for null geometry', () => {
    const f = parkingFeature();
    f.geometry = null as unknown as Point;
    assert.equal(normalizeParkingLot(f), null);
  });

  it('sets asset_num to null when blank', () => {
    const result = normalizeParkingLot(parkingFeature({ ASSET_NUM: '  ' }));
    assert.ok(result);
    assert.equal(result.asset_num, null);
  });
});

// ---------------------------------------------------------------------------
// normalizeWaterFeature
// ---------------------------------------------------------------------------

describe('normalizeWaterFeature', () => {
  it('maps all fields correctly', () => {
    const result = normalizeWaterFeature(waterFeature());
    assert.ok(result);
    assert.equal(result.id, 210714);
    assert.equal(result.name, 'Scotts Brook');
    assert.equal(result.feature_class, 'Stream');
    assert.equal(result.county, 'Westchester');
    // geometry built from PRIM_LAT_D / PRIM_LONG1
    assert.deepEqual(result.geometry, makePoint(-73.502346, 41.230373));
  });

  it('returns null for null geometry and no PRIM_LAT_D/PRIM_LONG1', () => {
    const f = waterFeature({ PRIM_LAT_D: null, PRIM_LONG1: null });
    f.geometry = null as unknown as Point;
    assert.equal(normalizeWaterFeature(f), null);
  });
});

// ---------------------------------------------------------------------------
// normalizeParkBoundary
// ---------------------------------------------------------------------------

describe('normalizeParkBoundary', () => {
  it('extracts the polygon geometry', () => {
    const result = normalizeParkBoundary(boundaryFeature());
    assert.ok(result);
    assert.equal(result.geometry.type, 'Polygon');
  });

  it('returns null when geometry is null', () => {
    const f = boundaryFeature();
    f.geometry = null as unknown as Polygon;
    assert.equal(normalizeParkBoundary(f), null);
  });
});
