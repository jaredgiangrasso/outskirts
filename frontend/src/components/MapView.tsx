import { Marker, Popup } from 'react-map-gl/mapbox';
import type { ShelterFeature, SheltersData } from '../types';

interface MapViewProps {
  data: SheltersData;
  selectedShelter: ShelterFeature | null;
  onSelectShelter: (shelter: ShelterFeature | null) => void;
}

function LeanToMarker() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="9,1 17,17 1,17" fill="#2d6a4f" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

function CampsiteMarker() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#e07b39" stroke="#fff" strokeWidth="1.5" />
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
          style={{ cursor: 'pointer' }}
        >
          <LeanToMarker />
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
          style={{ cursor: 'pointer' }}
        >
          <CampsiteMarker />
        </Marker>
      ))}

      {selectedShelter && (
        <Popup
          longitude={selectedShelter.lng}
          latitude={selectedShelter.lat}
          anchor="bottom"
          onClose={() => onSelectShelter(null)}
          closeOnClick={false}
          maxWidth="280px"
        >
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
              {selectedShelter.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                background: selectedShelter.type === 'lean-to' ? '#2d6a4f' : '#e07b39',
                color: '#fff',
              }}>
                {selectedShelter.type === 'lean-to' ? 'Lean-To' : 'Campsite'}
              </span>
              {selectedShelter.accessible && (
                <span style={{
                  display: 'inline-block',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#1565c0',
                  color: '#fff',
                }}>
                  Accessible
                </span>
              )}
            </div>
            <div style={{ color: '#555' }}>{selectedShelter.facility}</div>
          </div>
        </Popup>
      )}
    </>
  );
}
