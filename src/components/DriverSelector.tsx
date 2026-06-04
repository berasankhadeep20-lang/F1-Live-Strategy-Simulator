import type { Race } from '../types';
import { getTyreColor, formatLapTime } from '../utils/strategyEngine';

interface Props {
  race: Race;
  currentLap: number;
  selectedDrivers: string[];
  focusedDriver: string | null;
  onToggle: (code: string) => void;
  onFocus: (code: string) => void;
}

export default function DriverSelector({ race, currentLap, selectedDrivers, focusedDriver, onToggle, onFocus }: Props) {
  const sorted = [...race.drivers].sort((a, b) => {
    const aLap = a.laps.find(l => l.lap === currentLap);
    const bLap = b.laps.find(l => l.lap === currentLap);
    return (aLap?.position ?? 99) - (bLap?.position ?? 99);
  });

  return (
    <div className="panel driver-selector">
      <div className="panel-header">
        <span className="panel-title">Drivers</span>
        <span className="panel-sub">Click to focus · ± to compare</span>
      </div>
      <div className="driver-list">
        {sorted.map(driver => {
          const lapData = driver.laps.find(l => l.lap === currentLap);
          const prevLap = driver.laps.find(l => l.lap === currentLap - 1);
          const isSelected = selectedDrivers.includes(driver.code);
          const isFocused = focusedDriver === driver.code;
          const compound = lapData?.compound;
          const tColor = compound ? getTyreColor(compound) : '#888';
          const posChange = prevLap && lapData ? prevLap.position - lapData.position : 0;
          // Gap to leader
          const leader = sorted[0];
          const leaderLap = leader?.laps.find(l => l.lap === currentLap);
          const gap = lapData && leaderLap ? Math.abs(lapData.gap - leaderLap.gap) : 0;

          return (
            <div
              key={driver.code}
              className={`driver-item ${isSelected ? 'selected' : 'dimmed'} ${isFocused ? 'focused' : ''}`}
              style={{ borderLeft: `3px solid ${isSelected ? driver.teamColor : 'transparent'}` }}
            >
              <button className="driver-main" onClick={() => onFocus(driver.code)}>
                <div className="driver-pos-col">
                  <span className="driver-pos">P{lapData?.position ?? '—'}</span>
                  {posChange !== 0 && (
                    <span className={`pos-arrow ${posChange > 0 ? 'up' : 'down'}`}>
                      {posChange > 0 ? '▲' : '▼'}
                    </span>
                  )}
                </div>
                <div className="driver-details">
                  <span className="driver-code-big" style={{ color: driver.teamColor }}>{driver.code}</span>
                  <span className="driver-team-name">{driver.team.split(' ')[0]}</span>
                </div>
                {compound && (
                  <div className="driver-tyre" title={`${compound} — ${lapData?.tyreAge} laps old`}>
                    <div
                      className="tyre-dot animated-tyre"
                      style={{
                        background: tColor,
                        boxShadow: `0 0 ${Math.min(12, (lapData?.tyreAge ?? 0) / 2)}px ${tColor}88`,
                        opacity: Math.max(0.5, 1 - (lapData?.tyreAge ?? 0) / 60),
                      }}
                    />
                    <span className="tyre-age" style={{ color: tColor }}>{lapData?.tyreAge}L</span>
                  </div>
                )}
                <div className="driver-right">
                  <span className="driver-laptime">{formatLapTime(lapData?.lapTime ?? 0)}</span>
                  {lapData?.position !== 1 && gap > 0 && (
                    <span className="driver-gap">+{gap.toFixed(2)}s</span>
                  )}
                </div>
              </button>
              <button
                className={`driver-toggle ${isSelected ? 'on' : 'off'}`}
                onClick={() => onToggle(driver.code)}
                title={isSelected ? 'Remove from charts' : 'Add to charts'}
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
