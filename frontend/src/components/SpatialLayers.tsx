import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import type { LayerProps } from 'react-map-gl/mapbox';
import type { FeatureCollection } from 'geojson';
import type { ShelterFeature, SheltersData } from '../types';

function formatMiles(meters: number, suffix?: string): string {
  const mi = (meters / 1609.34).toFixed(1) + ' mi';
  return suffix ? `${mi} ${suffix}` : mi;
}

function lineGeoJSON(coords: [number, number][]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }],
  };
}

function midpoint(coords: [number, number][]): [number, number] {
  if (coords.length === 2) {
    return [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
  }
  return coords[Math.floor(coords.length / 2)];
}

const solidLine = (id: string, color: string, width: number): LayerProps => ({
  id,
  type: 'line',
  paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0.9 },
});

const dashedLine = (id: string, color: string, width: number): LayerProps => ({
  id,
  type: 'line',
  paint: { 'line-color': color, 'line-width': width, 'line-opacity': 0.85, 'line-dasharray': [4, 3] },
});

const neighborLine: LayerProps = {
  id: 'neighbor-line',
  type: 'line',
  paint: { 'line-color': '#a78bfa', 'line-width': 2, 'line-opacity': 0.8, 'line-dasharray': [6, 4] },
};

interface LabelProps {
  lng: number;
  lat: number;
  text: string;
  color: string;
}

function DistanceLabel({ lng, lat, text, color }: LabelProps) {
  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <div style={{
        background: '#fff',
        border: `1.5px solid ${color}`,
        borderRadius: 4,
        padding: '2px 6px',
        fontSize: 11,
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 600,
        color: '#333',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}>
        {text}
      </div>
    </Marker>
  );
}

interface Props {
  shelter: ShelterFeature;
  data: SheltersData;
}

export default function SpatialLayers({ shelter, data }: Props) {
  const shelterPt: [number, number] = [shelter.lng, shelter.lat];

  // --- Parking ---
  const parkingFeature = shelter.nearest_parking_id != null
    ? data.parking.find(p => p.id === shelter.nearest_parking_id) ?? null
    : null;

  let parkingGeoJSON: FeatureCollection | null = null;
  let parkingMid: [number, number] | null = null;
  let parkingLabel: string | null = null;
  let parkingIsRoute = false;

  if (shelter.nearest_parking_route) {
    const coords = shelter.nearest_parking_route.coordinates as [number, number][];
    parkingGeoJSON = lineGeoJSON(coords);
    parkingMid = midpoint(coords);
    parkingLabel = formatMiles(shelter.nearest_parking_m!, 'trail');
    parkingIsRoute = true;
  } else if (parkingFeature) {
    const coords: [number, number][] = [shelterPt, [parkingFeature.lng, parkingFeature.lat]];
    parkingGeoJSON = lineGeoJSON(coords);
    parkingMid = midpoint(coords);
    parkingLabel = formatMiles(shelter.nearest_parking_straight_m, 'est');
  }

  // --- Water ---
  const waterFeature = data.water.find(w => w.id === shelter.nearest_water_id) ?? null;
  let waterGeoJSON: FeatureCollection | null = null;
  let waterMid: [number, number] | null = null;

  if (waterFeature) {
    const coords: [number, number][] = [shelterPt, [waterFeature.lng, waterFeature.lat]];
    waterGeoJSON = lineGeoJSON(coords);
    waterMid = midpoint(coords);
  }

  // --- Neighbor ---
  const allShelters = [...data.lean_tos, ...data.campsites];
  const neighborFeature = shelter.nearest_shelter_id != null
    ? allShelters.find(s => s.id === shelter.nearest_shelter_id) ?? null
    : null;

  let neighborGeoJSON: FeatureCollection | null = null;
  let neighborMid: [number, number] | null = null;

  if (neighborFeature) {
    const coords: [number, number][] = [shelterPt, [neighborFeature.lng, neighborFeature.lat]];
    neighborGeoJSON = lineGeoJSON(coords);
    neighborMid = midpoint(coords);
  }

  return (
    <>
      {parkingGeoJSON && (
        <Source id="parking-line" type="geojson" data={parkingGeoJSON}>
          <Layer {...(parkingIsRoute
            ? solidLine('parking-line-layer', '#f59e0b', 3)
            : dashedLine('parking-line-layer', '#f59e0b', 3)
          )} />
        </Source>
      )}
      {waterGeoJSON && (
        <Source id="water-line" type="geojson" data={waterGeoJSON}>
          <Layer {...solidLine('water-line-layer', '#3b82f6', 2.5)} />
        </Source>
      )}
      {neighborGeoJSON && (
        <Source id="neighbor-line" type="geojson" data={neighborGeoJSON}>
          <Layer {...neighborLine} />
        </Source>
      )}

      {parkingMid && parkingLabel && (
        <DistanceLabel lng={parkingMid[0]} lat={parkingMid[1]} text={parkingLabel} color="#f59e0b" />
      )}
      {waterMid && waterFeature && (
        <DistanceLabel
          lng={waterMid[0]} lat={waterMid[1]}
          text={formatMiles(shelter.nearest_water_m)}
          color="#3b82f6"
        />
      )}
      {neighborMid && shelter.nearest_shelter_m != null && (
        <DistanceLabel
          lng={neighborMid[0]} lat={neighborMid[1]}
          text={formatMiles(shelter.nearest_shelter_m)}
          color="#a78bfa"
        />
      )}
    </>
  );
}
