import type { Race } from '../types';
import { computeStrategyComparison, formatLapTime, getTyreColor } from '../utils/strategyEngine';

interface Props {
  race: Race;
  currentLap: number;
  focusedDriver: string | null;
}

export default function StrategyComparison({ race, currentLap, focusedDriver }: Props) {
  const driverCode = focusedDriver ?? race.drivers[0]?.code;
  const driver = race.drivers.find(d => d.code === driverCode);
  if (!driver) return null;

  const comparison = computeStrategyComparison(race, driverCode, currentLap);
  const diff = comparison.twoStop.totalTime - comparison.oneStop.totalTime;
  const oneStopWins = diff > 0;
  const remaining = race.totalLaps - currentLap;

  if (remaining < 10) {
    return (
      <div className="panel strategy-comparison">
        <div className="panel-header">
          <span className="panel-title">Strategy Compare</span>
          <span className="panel-sub">1-stop vs 2-stop</span>
        </div>
        <div className="strat-empty">Race almost over — no meaningful window</div>
      </div>
    );
  }

  return (
    <div className="panel strategy-comparison">
      <div className="panel-header">
        <span className="panel-title">Strategy Compare</span>
        <span className="panel-sub" style={{ color: driver.teamColor }}>{driverCode}</span>
      </div>
      <div className="strat-body">
        <div className={`strat-option ${oneStopWins ? 'winner' : ''}`}>
          <div className="strat-option-header">
            <span className="strat-label">1 Stop</span>
            {oneStopWins && <span className="strat-badge-win">FASTER</span>}
          </div>
          <div className="strat-time">{formatLapTime(comparison.oneStop.totalTime)}</div>
          <div className="strat-detail">
            <span className="strat-detail-label">Stop at</span>
            <span>L{comparison.oneStop.stops[0]}</span>
          </div>
          <div className="strat-compounds">
            {comparison.oneStop.compounds.map((c, i) => (
              <span key={i} className="compound-pill" style={{
                background: `${getTyreColor(c)}22`,
                color: getTyreColor(c),
                border: `1px solid ${getTyreColor(c)}`
              }}>{c[0]}</span>
            ))}
          </div>
        </div>

        <div className="strat-vs">
          <div className="strat-delta" style={{ color: Math.abs(diff) < 2 ? '#FF9800' : oneStopWins ? '#4CAF50' : '#f44336' }}>
            {oneStopWins ? '-' : '+'}{Math.abs(diff).toFixed(1)}s
          </div>
        </div>

        <div className={`strat-option ${!oneStopWins ? 'winner' : ''}`}>
          <div className="strat-option-header">
            <span className="strat-label">2 Stops</span>
            {!oneStopWins && <span className="strat-badge-win">FASTER</span>}
          </div>
          <div className="strat-time">{formatLapTime(comparison.twoStop.totalTime)}</div>
          <div className="strat-detail">
            <span className="strat-detail-label">Stops at</span>
            <span>L{comparison.twoStop.stops[0]} + L{comparison.twoStop.stops[1]}</span>
          </div>
          <div className="strat-compounds">
            {comparison.twoStop.compounds.map((c, i) => (
              <span key={i} className="compound-pill" style={{
                background: `${getTyreColor(c)}22`,
                color: getTyreColor(c),
                border: `1px solid ${getTyreColor(c)}`
              }}>{c[0]}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="strat-insight">
        {Math.abs(diff) < 1
          ? '⚖️ Strategies are within 1s — track position decides'
          : oneStopWins
          ? `✓ One-stop saves ${Math.abs(diff).toFixed(1)}s — avoid tyre deg`
          : `✓ Two-stop gains ${Math.abs(diff).toFixed(1)}s — push on fresh rubber`}
      </div>
    </div>
  );
}
