import type { SafetyCarType, Race } from '../types';

interface Props {
  activeSafetyCar: SafetyCarType;
  currentLap: number;
  race: Race;
}

export default function SafetyCarBanner({ activeSafetyCar, currentLap, race }: Props) {
  const upcoming = race.safetyCarEvents.find(e => e.startLap > currentLap && e.startLap <= currentLap + 3);
  if (!activeSafetyCar && !upcoming) return null;

  const isSC = activeSafetyCar === 'SC';
  const isVSC = activeSafetyCar === 'VSC';
  const event = race.safetyCarEvents.find(e => currentLap >= e.startLap && currentLap <= e.endLap);

  return (
    <div className={`sc-banner ${isSC ? 'sc-full' : isVSC ? 'sc-vsc' : 'sc-upcoming'}`}>
      <div className="sc-icon">{isSC ? '🟡' : isVSC ? '🟠' : '⚠️'}</div>
      <div className="sc-text">
        {isSC && <><strong>SAFETY CAR</strong> — Laps {event?.startLap}–{event?.endLap} · Pit windows OPEN</>}
        {isVSC && <><strong>VIRTUAL SC</strong> — Laps {event?.startLap}–{event?.endLap} · Δ pit window narrows</>}
        {!activeSafetyCar && upcoming && <><strong>SC IN {upcoming.startLap - currentLap} LAPS</strong> — {upcoming.type} predicted L{upcoming.startLap}</>}
      </div>
      {activeSafetyCar && (
        <div className="sc-strategy-tip">
          {isSC ? '✓ Pit now — free stop opportunity' : '⚡ Consider pitting next lap'}
        </div>
      )}
    </div>
  );
}
