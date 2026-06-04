import type { Race, PitWindow, UndercutAnalysis, Compound } from '../types';
import { TYRE_DEG_MODELS } from '../data/raceData';

const PIT_LOSS_TIME = 22; // seconds lost in pit lane vs staying out

function polyDeg(age: number, compound: Compound): number {
  const m = TYRE_DEG_MODELS[compound];
  return m.a * age * age + m.b * age + m.c;
}


function bestAlternativeCompound(current: Compound): Compound {
  const order: Compound[] = ['SOFT', 'MEDIUM', 'HARD'];
  const idx = order.indexOf(current);
  if (idx === -1) return 'MEDIUM';
  return order[(idx + 1) % order.length];
}

export function computePitWindows(race: Race, currentLap: number): PitWindow[] {
  return race.drivers.map(driver => {
    const currentLapData = driver.laps.find(l => l.lap === currentLap);
    if (!currentLapData) return null;

    const currentStint = driver.stints.find(
      s => s.startLap <= currentLap && s.endLap >= currentLap
    );
    if (!currentStint) return null;

    const compound = currentLapData.compound;
    const tyreAge = currentLapData.tyreAge;
    const remainingLaps = race.totalLaps - currentLap;
    const targetCompound = bestAlternativeCompound(compound);
    const targetModel = TYRE_DEG_MODELS[targetCompound];
    const maxFreshLaps = targetModel.maxLife;

    // Can fresh tyres cover remaining laps?
    const canOneStop = remainingLaps <= maxFreshLaps;

    // Deg delta: how much slower current tyres vs fresh tyres by end
    const currentDeg = polyDeg(tyreAge + remainingLaps, compound);
    const freshDeg = polyDeg(remainingLaps, targetCompound);
    const degGain = currentDeg - freshDeg;

    // Pit is worth it if deg gain > pit loss time spread over remaining laps
    const windowOpen = currentLap;
    const windowClose = Math.min(
      race.totalLaps - 5,
      currentLap + Math.floor(degGain / (TYRE_DEG_MODELS[compound].b + 0.001))
    );
    const recommendedLap = Math.min(
      windowClose,
      Math.max(currentLap + 1, Math.floor((windowOpen + windowClose) / 2))
    );

    // Undercut probability based on deg advantage
    const undercutProb = canOneStop
      ? Math.min(0.95, Math.max(0.05, degGain / (PIT_LOSS_TIME * 0.6)))
      : 0.2;
    const overcutProb = 1 - undercutProb;

    return {
      driverCode: driver.code,
      currentLap,
      recommendedLap,
      windowOpen,
      windowClose: Math.max(windowClose, currentLap + 2),
      undercutProb,
      overcutProb,
      targetCompound,
      timeGain: Math.max(0, degGain - PIT_LOSS_TIME / remainingLaps),
    } as PitWindow;
  }).filter(Boolean) as PitWindow[];
}

export function computeUndercutAnalysis(
  race: Race,
  attackerCode: string,
  defenderCode: string,
  currentLap: number
): UndercutAnalysis | null {
  const attacker = race.drivers.find(d => d.code === attackerCode);
  const defender = race.drivers.find(d => d.code === defenderCode);
  if (!attacker || !defender) return null;

  const aLap = attacker.laps.find(l => l.lap === currentLap);
  const dLap = defender.laps.find(l => l.lap === currentLap);
  if (!aLap || !dLap) return null;

  const currentGap = Math.abs(aLap.gap - dLap.gap);
  const remainingLaps = race.totalLaps - currentLap;

  // Attacker pits now, defender stays out
  const attackerFreshCompound = bestAlternativeCompound(aLap.compound);
  const defenderCurrentCompound = dLap.compound;

  // Per-lap pace advantage of attacker on fresh tyres vs defender on worn tyres
  const attackerFreshPace = polyDeg(1, attackerFreshCompound);
  const defenderWornPace = polyDeg(dLap.tyreAge + 1, defenderCurrentCompound);
  const gainPerLap = defenderWornPace - attackerFreshPace;

  // How many laps to make up gap + pit loss
  const lapsToMakeUp = gainPerLap > 0 ? (currentGap + PIT_LOSS_TIME) / gainPerLap : Infinity;
  const recommendedLap = gainPerLap > 0.1
    ? currentLap + Math.max(1, Math.floor(lapsToMakeUp * 0.7))
    : currentLap + 2;

  // Probability: if lapsToMakeUp << remainingLaps, high probability
  const successProbability = gainPerLap <= 0
    ? 0.05
    : Math.min(0.95, Math.max(0.05, 1 - lapsToMakeUp / Math.max(1, remainingLaps)));

  return {
    attacker: attackerCode,
    defender: defenderCode,
    currentGap,
    pitLossTime: PIT_LOSS_TIME,
    degDelta: gainPerLap,
    successProbability,
    recommendedLap,
    estimatedGainPerLap: gainPerLap,
  };
}

export function getTyreColor(compound: Compound): string {
  const colors: Record<Compound, string> = {
    SOFT: '#FF3333',
    MEDIUM: '#FFD700',
    HARD: '#FFFFFF',
    INTERMEDIATE: '#43B649',
    WET: '#4FC3F7',
  };
  return colors[compound] ?? '#888';
}

export function formatLapTime(seconds: number): string {
  if (!seconds || seconds > 300) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function computeDegCurve(
  compound: Compound,
  maxLaps: number
): Array<{ age: number; delta: number }> {
  return Array.from({ length: maxLaps }, (_, i) => ({
    age: i + 1,
    delta: parseFloat(polyDeg(i + 1, compound).toFixed(3)),
  }));
}
