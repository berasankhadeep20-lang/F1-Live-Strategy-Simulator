import type { Race } from '../types';
import { computePitWindows } from '../utils/strategyEngine';
import { getTyreColor } from '../utils/strategyEngine';

interface Props {
  race: Race;
  currentLap: number;
  selectedDrivers: string[];
  focusedDriver: string | null;
  onDriverClick: (code: string) => void;
}

export default function PitWindowPanel({ race, currentLap, selectedDrivers, focusedDriver, onDriverClick }: Props) {
  const windows = computePitWindows(race, currentLap)
    .filter(w => selectedDrivers.includes(w.driverCode));

  return (
    <div className="panel pit-window-panel">
      <div className="panel-header">
        <span className="panel-title">Pit Windows</span>
        <span className="panel-sub">Undercut / Overcut probability</span>
      </div>
      <div className="pit-list">
        {windows.map(w => {
          const driver = race.drivers.find(d => d.code === w.driverCode);
          if (!driver) return null;
          const isFocused = focusedDriver === w.driverCode;
          const curLap = driver.laps.find(l => l.lap === currentLap);
          const compound = curLap?.compound ?? 'MEDIUM';
          const tColor = getTyreColor(compound);
          const inWindow = currentLap >= w.windowOpen && currentLap <= w.windowClose;
          const recommended = currentLap === w.recommendedLap;

          return (
            <div
              key={w.driverCode}
              className={`pit-row ${isFocused ? 'focused' : ''} ${recommended ? 'recommended' : ''}`}
              onClick={() => onDriverClick(w.driverCode)}
            >
              <div className="pit-driver-info">
                <div className="pit-driver-dot" style={{ background: driver.teamColor }} />
                <span className="pit-code">{w.driverCode}</span>
                <span className="pit-compound" style={{ color: tColor, borderColor: tColor }}>
                  {compound[0]}
                </span>
                {recommended && <span className="pit-badge">PIT NOW</span>}
                {!inWindow && currentLap > w.windowClose && (
                  <span className="pit-badge late">OVERDUE</span>
                )}
              </div>

              <div className="pit-window-range">
                <span className="pit-window-label">Window L{w.windowOpen}–{w.windowClose}</span>
                <span className="pit-rec-label">Rec: L{w.recommendedLap}</span>
              </div>

              <div className="prob-bars">
                <div className="prob-bar-row">
                  <span className="prob-label" style={{ color: '#4CAF50' }}>Undercut</span>
                  <div className="prob-bar-bg">
                    <div
                      className="prob-bar-fill undercut"
                      style={{ width: `${(w.undercutProb * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="prob-pct">{(w.undercutProb * 100).toFixed(0)}%</span>
                </div>
                <div className="prob-bar-row">
                  <span className="prob-label" style={{ color: '#FF9800' }}>Overcut</span>
                  <div className="prob-bar-bg">
                    <div
                      className="prob-bar-fill overcut"
                      style={{ width: `${(w.overcutProb * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="prob-pct">{(w.overcutProb * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
