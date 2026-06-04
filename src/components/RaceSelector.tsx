import type { Race } from '../types';

interface Props {
  races: Race[];
  selected: Race | null;
  onSelect: (race: Race) => void;
}

const FLAG_EMOJI: Record<string, string> = {
  Bahrain: '🇧🇭',
  Italy: '🇮🇹',
  'United Kingdom': '🇬🇧',
};

export default function RaceSelector({ races, selected, onSelect }: Props) {
  return (
    <div className="race-selector">
      {races.map(race => (
        <button
          key={race.id}
          className={`race-btn ${selected?.id === race.id ? 'active' : ''}`}
          onClick={() => onSelect(race)}
        >
          <span className="race-flag">{FLAG_EMOJI[race.country] ?? '🏁'}</span>
          <span className="race-info">
            <span className="race-name">{race.name}</span>
            <span className="race-circuit">{race.circuit}</span>
          </span>
          <span className="race-laps">{race.totalLaps} laps</span>
        </button>
      ))}
    </div>
  );
}
