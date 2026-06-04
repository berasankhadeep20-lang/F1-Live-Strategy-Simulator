import type { Race, PitWindow, UndercutAnalysis, Compound, StrategyComparison } from '../types';
import { TYRE_DEG_MODELS } from '../data/raceData';

const DEFAULT_PIT_LOSS = 22;

function polyDeg(age: number, compound: Compound, mult = 1): number {
  const m = TYRE_DEG_MODELS[compound];
  return (m.a * age * age + m.b * age + m.c) * mult;
}

function bestAlternativeCompound(current: Compound): Compound {
  const order: Compound[] = ['SOFT', 'MEDIUM', 'HARD'];
  const idx = order.indexOf(current);
  if (idx === -1) return 'MEDIUM';
  return order[(idx + 1) % order.length];
}

export function computePitWindows(race: Race, currentLap: number): PitWindow[] {
  const pitLoss = race.pitLaneTime ?? DEFAULT_PIT_LOSS;
  return race.drivers.map(driver => {
    const currentLapData = driver.laps.find(l => l.lap === currentLap);
    if (!currentLapData) return null;
    const currentStint = driver.stints.find(s => s.startLap <= currentLap && s.endLap >= currentLap);
    if (!currentStint) return null;

    const compound = currentLapData.compound;
    const tyreAge = currentLapData.tyreAge;
    const remainingLaps = race.totalLaps - currentLap;
    const targetCompound = bestAlternativeCompound(compound);
    const targetModel = TYRE_DEG_MODELS[targetCompound];
    const maxFreshLaps = targetModel.maxLife;
    const canOneStop = remainingLaps <= maxFreshLaps;
    const currentDeg = polyDeg(tyreAge + remainingLaps, compound);
    const freshDeg = polyDeg(remainingLaps, targetCompound);
    const degGain = currentDeg - freshDeg;
    const windowOpen = currentLap;
    const windowClose = Math.min(
      race.totalLaps - 5,
      currentLap + Math.floor(degGain / (TYRE_DEG_MODELS[compound].b + 0.001))
    );
    const recommendedLap = Math.min(windowClose, Math.max(currentLap + 1, Math.floor((windowOpen + windowClose) / 2)));
    const undercutProb = canOneStop ? Math.min(0.95, Math.max(0.05, degGain / (pitLoss * 0.6))) : 0.2;

    return {
      driverCode: driver.code,
      currentLap,
      recommendedLap,
      windowOpen,
      windowClose: Math.max(windowClose, currentLap + 2),
      undercutProb,
      overcutProb: 1 - undercutProb,
      targetCompound,
      timeGain: Math.max(0, degGain - pitLoss / Math.max(1, remainingLaps)),
    } as PitWindow;
  }).filter(Boolean) as PitWindow[];
}

export function computeUndercutAnalysis(
  race: Race, attackerCode: string, defenderCode: string, currentLap: number
): UndercutAnalysis | null {
  const attacker = race.drivers.find(d => d.code === attackerCode);
  const defender = race.drivers.find(d => d.code === defenderCode);
  if (!attacker || !defender) return null;

  const aLap = attacker.laps.find(l => l.lap === currentLap);
  const dLap = defender.laps.find(l => l.lap === currentLap);
  if (!aLap || !dLap) return null;

  const pitLoss = race.pitLaneTime ?? DEFAULT_PIT_LOSS;
  const currentGap = Math.abs(aLap.gap - dLap.gap);
  const remainingLaps = race.totalLaps - currentLap;
  const attackerFreshCompound = bestAlternativeCompound(aLap.compound);
  const attackerFreshPace = polyDeg(1, attackerFreshCompound);
  const defenderWornPace = polyDeg(dLap.tyreAge + 1, dLap.compound);
  const gainPerLap = defenderWornPace - attackerFreshPace;
  const lapsToMakeUp = gainPerLap > 0 ? (currentGap + pitLoss) / gainPerLap : Infinity;
  const recommendedLap = gainPerLap > 0.1
    ? currentLap + Math.max(1, Math.floor(lapsToMakeUp * 0.7))
    : currentLap + 2;
  const successProbability = gainPerLap <= 0
    ? 0.05
    : Math.min(0.95, Math.max(0.05, 1 - lapsToMakeUp / Math.max(1, remainingLaps)));

  return { attacker: attackerCode, defender: defenderCode, currentGap, pitLossTime: pitLoss, degDelta: gainPerLap, successProbability, recommendedLap, estimatedGainPerLap: gainPerLap };
}

export function computeStrategyComparison(race: Race, driverCode: string, currentLap: number): StrategyComparison {
  const driver = race.drivers.find(d => d.code === driverCode);
  const pitLoss = race.pitLaneTime ?? DEFAULT_PIT_LOSS;
  const remaining = race.totalLaps - currentLap;
  const baseLapTime = driver?.laps.find(l => l.lap === currentLap)?.lapTime ?? 92;
  const curCompound = driver?.laps.find(l => l.lap === currentLap)?.compound ?? 'MEDIUM';

  // One-stop: pit at recommended lap, run to end on HARD
  const oneStopLap = Math.floor(currentLap + remaining * 0.5);
  const oneStopPreTime = Array.from({ length: oneStopLap - currentLap }, (_, i) =>
    baseLapTime + polyDeg(i + 1, curCompound)).reduce((a, b) => a + b, 0);
  const oneStopPostTime = Array.from({ length: race.totalLaps - oneStopLap }, (_, i) =>
    baseLapTime - 0.5 + polyDeg(i + 1, 'HARD')).reduce((a, b) => a + b, 0);

  // Two-stop: split into thirds
  const twoStop1 = Math.floor(currentLap + remaining * 0.33);
  const twoStop2 = Math.floor(currentLap + remaining * 0.66);
  const twoStopP1 = Array.from({ length: twoStop1 - currentLap }, (_, i) =>
    baseLapTime + polyDeg(i + 1, curCompound)).reduce((a, b) => a + b, 0);
  const twoStopP2 = Array.from({ length: twoStop2 - twoStop1 }, (_, i) =>
    baseLapTime - 0.3 + polyDeg(i + 1, 'MEDIUM')).reduce((a, b) => a + b, 0);
  const twoStopP3 = Array.from({ length: race.totalLaps - twoStop2 }, (_, i) =>
    baseLapTime - 0.8 + polyDeg(i + 1, 'SOFT')).reduce((a, b) => a + b, 0);

  return {
    oneStop: {
      totalTime: oneStopPreTime + pitLoss + oneStopPostTime,
      stops: [oneStopLap],
      compounds: [curCompound, 'HARD'],
    },
    twoStop: {
      totalTime: twoStopP1 + pitLoss + twoStopP2 + pitLoss + twoStopP3,
      stops: [twoStop1, twoStop2],
      compounds: [curCompound, 'MEDIUM', 'SOFT'],
    },
  };
}

export function getTyreColor(compound: Compound): string {
  const colors: Record<Compound, string> = {
    SOFT: '#FF3333', MEDIUM: '#FFD700', HARD: '#FFFFFF',
    INTERMEDIATE: '#43B649', WET: '#4FC3F7',
  };
  return colors[compound] ?? '#888';
}

export function formatLapTime(seconds: number): string {
  if (!seconds || seconds > 300) return '--:--.---';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function computeDegCurve(compound: Compound, maxLaps: number, mult = 1): Array<{ age: number; delta: number }> {
  return Array.from({ length: maxLaps }, (_, i) => ({
    age: i + 1,
    delta: parseFloat(polyDeg(i + 1, compound, mult).toFixed(3)),
  }));
}
