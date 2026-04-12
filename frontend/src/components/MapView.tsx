import { Marker } from 'react-map-gl/mapbox';
import type { ShelterFeature, SheltersData } from '../types';
import SpatialLayers from './SpatialLayers';

interface MapViewProps {
  data: SheltersData;
  selectedShelter: ShelterFeature | null;
  onSelectShelter: (shelter: ShelterFeature | null) => void;
}

function LeanToMarker({ selected }: { selected: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="9,1 17,17 1,17"
        fill="#2d6a4f"
        stroke={selected ? '#fff' : '#fff'}
        strokeWidth={selected ? 2.5 : 1.5}
        opacity={selected ? 1 : 0.85}
      />
    </svg>
  );
}

function CampsiteMarker({ selected }: { selected: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="8" cy="8" r="7"
        fill="#e07b39"
        stroke="#fff"
        strokeWidth={selected ? 2.5 : 1.5}
        opacity={selected ? 1 : 0.85}
      />
    </svg>
  );
}

export default function MapView({ data, selectedShelter, onSelectShelter }: MapViewProps) {
  return (
    <>
      {data.lean_tos.map((shelter) => (
        <Marker
          key={`lean-to-${shelter.id}`}
          longitude={shelter.lng}
          latitude={shelter.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSelectShelter(shelter);
          }}
          style={{ cursor: 'pointer', zIndex: selectedShelter?.id === shelter.id ? 2 : 1 }}
        >
          <LeanToMarker selected={selectedShelter?.id === shelter.id} />
        </Marker>
      ))}

      {data.campsites.map((shelter) => (
        <Marker
          key={`campsite-${shelter.id}`}
          longitude={shelter.lng}
          latitude={shelter.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSelectShelter(shelter);
          }}
          style={{ cursor: 'pointer', zIndex: selectedShelter?.id === shelter.id ? 2 : 1 }}
        >
          <CampsiteMarker selected={selectedShelter?.id === shelter.id} />
        </Marker>
      ))}

      {selectedShelter && (
        <SpatialLayers shelter={selectedShelter} data={data} />
      )}
    </>
  );
}
