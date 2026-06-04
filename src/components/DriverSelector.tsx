import type { Race } from '../types';
import { getTyreColor } from '../utils/strategyEngine';
import { formatLapTime } from '../utils/strategyEngine';

interface Props {
  race: Race;
  currentLap: number;
  selectedDrivers: string[];
  focusedDriver: string | null;
  onToggle: (code: string) => void;
  onFocus: (code: string) => void;
}

export default function DriverSelector({ race, currentLap, selectedDrivers, focusedDriver, onToggle, onFocus }: Props) {
  // Sort drivers by current position
  const sorted = [...race.drivers].sort((a, b) => {
    const aLap = a.laps.find(l => l.lap === currentLap);
    const bLap = b.laps.find(l => l.lap === currentLap);
    return (aLap?.position ?? 99) - (bLap?.position ?? 99);
  });

  return (
    <div className="panel driver-selector">
      <div className="panel-header">
        <span className="panel-title">Drivers</span>
        <span className="panel-sub">Click to focus · Toggle to compare</span>
      </div>
      <div className="driver-list">
        {sorted.map(driver => {
          const lapData = driver.laps.find(l => l.lap === currentLap);
          const isSelected = selectedDrivers.includes(driver.code);
          const isFocused = focusedDriver === driver.code;
          const compound = lapData?.compound;
          const tColor = compound ? getTyreColor(compound) : '#888';

          return (
            <div
              key={driver.code}
              className={`driver-item ${isSelected ? 'selected' : 'dimmed'} ${isFocused ? 'focused' : ''}`}
              style={{ borderLeft: `3px solid ${isSelected ? driver.teamColor : '#333'}` }}
            >
              <button
                className="driver-main"
                onClick={() => onFocus(driver.code)}
              >
                <span className="driver-pos">P{lapData?.position ?? '—'}</span>
                <div className="driver-details">
                  <span className="driver-code-big" style={{ color: driver.teamColor }}>{driver.code}</span>
                  <span className="driver-team-name">{driver.team}</span>
                </div>
                {compound && (
                  <div className="driver-tyre">
                    <div
                      className="tyre-dot"
                      style={{ background: tColor, boxShadow: `0 0 6px ${tColor}66` }}
                      title={compound}
                    />
                    <span className="tyre-age" style={{ color: tColor }}>
                      {lapData?.tyreAge}L
                    </span>
                  </div>
                )}
                <span className="driver-laptime">{formatLapTime(lapData?.lapTime ?? 0)}</span>
              </button>
              <button
                className={`driver-toggle ${isSelected ? 'on' : 'off'}`}
                onClick={() => onToggle(driver.code)}
                title={isSelected ? 'Remove from view' : 'Add to view'}
              >
                {isSelected ? '−' : '+'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
