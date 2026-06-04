import { useState } from 'react';
import type { Race } from '../types';

interface Props {
  races: Race[];
  selected: Race | null;
  onSelect: (race: Race) => void;
}

export default function RaceSelector({ races, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (race: Race) => {
    onSelect(race);
    setOpen(false);
  };

  return (
    <div className="race-selector-dropdown">
      <button className="race-dropdown-btn" onClick={() => setOpen(o => !o)}>
        <span className="race-flag">{selected?.flag ?? '🏁'}</span>
        <span className="race-selected-info">
          <span className="race-name">{selected?.name ?? 'Select Race'}</span>
          <span className="race-circuit">{selected?.circuit ?? ''}</span>
        </span>
        <span className="race-laps">{selected ? `${selected.totalLaps} laps` : ''}</span>
        <svg className={`dropdown-chevron ${open ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="race-dropdown-menu">
          <div className="race-dropdown-header">2024 FIA Formula One World Championship</div>
          <div className="race-grid">
            {races.map((race, i) => (
              <button
                key={race.id}
                className={`race-grid-item ${selected?.id === race.id ? 'active' : ''}`}
                onClick={() => handleSelect(race)}
              >
                <span className="race-num">{i + 1}</span>
                <span className="race-flag-sm">{race.flag}</span>
                <span className="race-grid-name">{race.country}</span>
                {race.safetyCarEvents.length > 0 && (
                  <span className="race-sc-dot" title={`${race.safetyCarEvents.length} SC/VSC event(s)`}>🟡</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {open && <div className="dropdown-backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}
