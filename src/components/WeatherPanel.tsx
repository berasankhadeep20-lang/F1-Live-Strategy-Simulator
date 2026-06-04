import type { Race } from '../types';
import { getTyreColor } from '../utils/strategyEngine';

interface Props {
  rainProbability: number;
  onRainChange: (v: number) => void;
  race: Race;
  currentLap: number;
}

export default function WeatherPanel({ rainProbability, onRainChange, race, currentLap }: Props) {
  const remainingLaps = race.totalLaps - currentLap;
  const tyreSuggestion = rainProbability >= 0.7 ? 'INTERMEDIATE' : rainProbability >= 0.9 ? 'WET' : null;
  const rainChance = Math.round(rainProbability * 100);

  const weatherIcon = rainProbability < 0.2 ? '☀️' : rainProbability < 0.5 ? '🌤️' : rainProbability < 0.75 ? '🌧️' : '⛈️';
  const weatherLabel = rainProbability < 0.2 ? 'Dry' : rainProbability < 0.5 ? 'Partly cloudy' : rainProbability < 0.75 ? 'Rain likely' : 'Heavy rain';

  return (
    <div className="panel weather-panel">
      <div className="panel-header">
        <span className="panel-title">Weather</span>
        <span className="panel-sub">{race.circuit.split(' ')[0]} conditions</span>
      </div>
      <div className="weather-body">
        <div className="weather-icon-row">
          <span className="weather-main-icon">{weatherIcon}</span>
          <div className="weather-info">
            <span className="weather-label">{weatherLabel}</span>
            <span className="weather-chance">{rainChance}% rain chance</span>
          </div>
        </div>

        <div className="rain-slider-wrap">
          <label className="rain-label">Rain probability</label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={rainProbability}
            onChange={e => onRainChange(Number(e.target.value))}
            className="rain-slider"
            style={{ '--rain-progress': `${rainChance}%` } as React.CSSProperties}
          />
          <div className="rain-ticks">
            <span>Dry</span><span>Light</span><span>Heavy</span>
          </div>
        </div>

        {tyreSuggestion && (
          <div className="weather-tyre-rec">
            <span className="weather-rec-label">Recommended:</span>
            <span className="compound-pill" style={{
              background: `${getTyreColor(tyreSuggestion as any)}22`,
              color: getTyreColor(tyreSuggestion as any),
              border: `1px solid ${getTyreColor(tyreSuggestion as any)}`
            }}>
              {tyreSuggestion}
            </span>
            <span className="weather-deg-note">
              {tyreSuggestion === 'INTERMEDIATE' ? 'Deg ×0.8 on wets' : 'Full wet — deg minimal'}
            </span>
          </div>
        )}

        <div className="weather-stats">
          <div className="w-stat">
            <span className="w-stat-label">Remaining laps</span>
            <span className="w-stat-val">{remainingLaps}</span>
          </div>
          <div className="w-stat">
            <span className="w-stat-label">Pit lane loss</span>
            <span className="w-stat-val">{race.pitLaneTime}s</span>
          </div>
          <div className="w-stat">
            <span className="w-stat-label">Circuit deg</span>
            <span className="w-stat-val" style={{ color: race.degMultiplier.SOFT > 1.2 ? '#f44336' : '#4CAF50' }}>
              {race.degMultiplier.SOFT > 1.2 ? 'High' : race.degMultiplier.SOFT < 0.7 ? 'Low' : 'Medium'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
