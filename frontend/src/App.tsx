import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const ADIRONDACKS_CENTER = { longitude: -74.2, latitude: 44.1 };

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Map
        initialViewState={{
          ...ADIRONDACKS_CENTER,
          zoom: 8,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/outdoors-v12"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      />
    </div>
  );
}
