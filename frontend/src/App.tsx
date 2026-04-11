import { useState, useEffect } from 'react';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapView from './components/MapView';
import type { SheltersData, ShelterFeature } from './types';

const ADIRONDACKS_CENTER = { longitude: -74.2, latitude: 44.1 };

export default function App() {
  const [data, setData] = useState<SheltersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<ShelterFeature | null>(null);

  useEffect(() => {
    fetch('/shelters.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load shelters.json: ${res.status}`);
        return res.json() as Promise<SheltersData>;
      })
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown error loading data');
      });
  }, []);

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100vw', height: '100vh',
        fontFamily: 'system-ui, sans-serif', color: '#c0392b',
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Failed to load shelter data</div>
          <div style={{ fontSize: '14px', color: '#666' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100vw', height: '100vh',
        fontFamily: 'system-ui, sans-serif', color: '#555',
      }}>
        Loading shelters…
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        initialViewState={{ ...ADIRONDACKS_CENTER, zoom: 8 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        onClick={() => setSelectedShelter(null)}
      >
        <MapView
          data={data}
          selectedShelter={selectedShelter}
          onSelectShelter={setSelectedShelter}
        />
      </Map>
    </div>
  );
}
