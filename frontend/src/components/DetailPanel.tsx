import type { ShelterFeature, SheltersData } from '../types';

function formatMiles(meters: number): string {
  return (meters / 1609.34).toFixed(1) + ' mi';
}

interface Props {
  shelter: ShelterFeature | null;
  data: SheltersData | null;
  onClose: () => void;
}

export default function DetailPanel({ shelter, data, onClose }: Props) {
  const visible = shelter !== null && data !== null;

  const parkingName = shelter && data && shelter.nearest_parking_id != null
    ? (data.parking.find(p => p.id === shelter.nearest_parking_id)?.name ?? null)
    : null;

  const waterName = shelter && data
    ? (data.water.find(w => w.id === shelter.nearest_water_id)?.name ?? null)
    : null;

  const allShelters = data ? [...data.lean_tos, ...data.campsites] : [];
  const neighborFeature = shelter && shelter.nearest_shelter_id != null
    ? allShelters.find(s => s.id === shelter.nearest_shelter_id) ?? null
    : null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      width: 300,
      background: '#fff',
      borderRadius: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
      fontFamily: 'system-ui, sans-serif',
      zIndex: 10,
      overflow: 'hidden',
      transform: visible ? 'translateY(0)' : 'translateY(calc(100% + 24px))',
      transition: 'transform 200ms ease-out',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {shelter && (
        <>
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    background: shelter.type === 'lean-to' ? '#2d6a4f' : '#e07b39',
                    color: '#fff',
                    textTransform: 'uppercase',
                  }}>
                    {shelter.type === 'lean-to' ? 'Lean-To' : 'Campsite'}
                  </span>
                  {shelter.accessible && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.03em',
                      background: '#1565c0',
                      color: '#fff',
                      textTransform: 'uppercase',
                    }}>
                      Accessible
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>
                  {shelter.name}
                </div>
                <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
                  {shelter.facility}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: 18,
                  color: '#999',
                  lineHeight: 1,
                  flexShrink: 0,
                  marginLeft: 8,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ padding: '10px 16px 14px' }}>
            {/* Parking */}
            <MetricRow
              icon="🅿"
              label="Nearest Parking"
              primary={
                shelter.nearest_parking_id == null
                  ? 'No data'
                  : shelter.nearest_parking_m != null
                    ? `${formatMiles(shelter.nearest_parking_m)} trail`
                    : `${formatMiles(shelter.nearest_parking_straight_m)} est`
              }
              secondary={parkingName}
              color="#f59e0b"
              muted={shelter.nearest_parking_id == null}
            />

            {/* Water */}
            <MetricRow
              icon="💧"
              label="Nearest Water"
              primary={formatMiles(shelter.nearest_water_m)}
              secondary={waterName}
              color="#3b82f6"
            />

            {/* Neighbor */}
            <MetricRow
              icon={shelter.nearest_shelter_type === 'lean-to' ? '🏕' : '⛺'}
              label="Nearest Shelter"
              primary={
                shelter.nearest_shelter_m != null
                  ? formatMiles(shelter.nearest_shelter_m)
                  : 'None nearby'
              }
              secondary={
                neighborFeature
                  ? `${neighborFeature.type === 'lean-to' ? 'Lean-To' : 'Campsite'} · ${neighborFeature.name}`
                  : null
              }
              color="#a78bfa"
              muted={shelter.nearest_shelter_m == null}
              last
            />
          </div>
        </>
      )}
    </div>
  );
}

interface MetricRowProps {
  icon: string;
  label: string;
  primary: string;
  secondary: string | null;
  color: string;
  muted?: boolean;
  last?: boolean;
}

function MetricRow({ icon, label, primary, secondary, color, muted, last }: MetricRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      paddingTop: 9,
      paddingBottom: last ? 0 : 9,
      borderBottom: last ? 'none' : '1px solid #f0f0f0',
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: muted ? '#f5f5f5' : `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#999', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: muted ? '#bbb' : '#111', marginTop: 1 }}>
          {primary}
        </div>
        {secondary && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}
