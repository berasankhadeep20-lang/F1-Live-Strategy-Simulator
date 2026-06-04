import type { Race } from '../types';
import { getTyreColor } from '../utils/strategyEngine';

interface Props {
  race: Race;
  currentLap: number;
  selectedDrivers: string[];
  focusedDriver: string | null;
  onDriverClick: (code: string) => void;
}

export default function StrategyTimeline({
  race, currentLap, selectedDrivers, focusedDriver, onDriverClick,
}: Props) {
  const drivers = race.drivers.filter(d => selectedDrivers.includes(d.code));

  return (
    <div className="panel strategy-timeline">
      <div className="panel-header">
        <span className="panel-title">Strategy Timeline</span>
        <span className="panel-sub">Tyre stints per driver</span>
      </div>
      <div className="timeline-grid">
        {/* Lap axis */}
        <div className="timeline-axis">
          <div className="driver-label" />
          <div className="lap-axis">
            {[1, 10, 20, 30, 40, 50, race.totalLaps].filter(l => l <= race.totalLaps).map(l => (
              <span key={l} style={{ left: `${((l - 1) / (race.totalLaps - 1)) * 100}%` }}>{l}</span>
            ))}
          </div>
        </div>

        {drivers.map(driver => {
          const isFocused = focusedDriver === driver.code;
          return (
            <div
              key={driver.code}
              className={`timeline-row ${isFocused ? 'focused' : ''}`}
              onClick={() => onDriverClick(driver.code)}
            >
              <div className="driver-label" style={{ borderLeft: `3px solid ${driver.teamColor}` }}>
                <span className="driver-code">{driver.code}</span>
                <span className="driver-team" style={{ color: driver.teamColor }}>
                  {driver.team.split(' ')[0]}
                </span>
              </div>
              <div className="stint-bar-wrap">
                {/* Current lap needle */}
                <div
                  className="lap-needle"
                  style={{ left: `${((currentLap - 1) / (race.totalLaps - 1)) * 100}%` }}
                />
                {driver.stints.map((stint, i) => {
                  const left = ((stint.startLap - 1) / (race.totalLaps - 1)) * 100;
                  const width = ((stint.endLap - stint.startLap + 1) / (race.totalLaps - 1)) * 100;
                  const isActive = currentLap >= stint.startLap && currentLap <= stint.endLap;
                  const tColor = getTyreColor(stint.compound);
                  return (
                    <div
                      key={i}
                      className={`stint-block ${isActive ? 'active' : ''}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: `${tColor}22`,
                        borderColor: tColor,
                        opacity: isActive ? 1 : 0.55,
                      }}
                      title={`${stint.compound} | Laps ${stint.startLap}–${stint.endLap}`}
                    >
                      <span className="stint-label" style={{ color: tColor }}>
                        {stint.compound[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
