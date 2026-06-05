import type { Race, Compound, CustomStint, CustomStrategy } from '../types';
import { TYRE_DEG_MODELS } from '../data/raceData';

const PIT_LOSS = 22; // seconds added on pit-out lap

function polyDeg(age: number, compound: Compound, mult = 1): number {
  const m = TYRE_DEG_MODELS[compound];
  return (m.a * age * age + m.b * age + m.c) * mult;
}

/** Build a valid stint list from stop laps + compounds, always covering 1..totalLaps */
export function buildStintsFromStops(
  stopLaps: number[],
  compounds: Compound[],
  totalLaps: number
): CustomStint[] {
  const sorted = [...stopLaps].sort((a, b) => a - b);
  const stints: CustomStint[] = [];
  let cursor = 1;

  for (let i = 0; i <= sorted.length; i++) {
    const endLap = i < sorted.length ? sorted[i] - 1 : totalLaps;
    const compound = compounds[i] ?? 'HARD';
    if (endLap >= cursor) {
      stints.push({ id: `s${i}`, compound, startLap: cursor, endLap });
      cursor = endLap + 1;
    }
  }
  return stints;
}

/** Compute projected lap times for a custom strategy and compare vs original */
export function computeCustomStrategy(
  race: Race,
  driverCode: string,
  stints: CustomStint[]
): CustomStrategy {
  const driver = race.drivers.find(d => d.code === driverCode);
  if (!driver || stints.length === 0) {
    return {
      driverCode,
      stints: [],
      projectedTime: 0,
      originalTime: 0,
      lapTimeCurve: [],
      timeDelta: 0,
    };
  }

  const mult = race.degMultiplier?.SOFT ?? 1;
  const basePace = Math.min(...driver.laps.map(l => l.lapTime));

  // Build custom lap-by-lap times
  const customLapTimes: number[] = [];
  for (const stint of stints) {
    for (let l = stint.startLap; l <= stint.endLap; l++) {
      const tyreAge = l - stint.startLap + 1;
      const compMult = stint.compound === 'SOFT' ? mult
        : stint.compound === 'MEDIUM' ? race.degMultiplier?.MEDIUM ?? 1
        : race.degMultiplier?.HARD ?? 1;
      const deg = polyDeg(tyreAge, stint.compound, compMult);
      const isPitOut = l === stint.startLap && stints.indexOf(stint) > 0;
      const lapTime = basePace + deg + (isPitOut ? PIT_LOSS : 0);
      customLapTimes.push(lapTime);
    }
  }

  // Original lap times from race data
  const originalLapTimes = driver.laps.map(l => l.lapTime);

  // Build comparison curve
  const lapTimeCurve = Array.from({ length: race.totalLaps }, (_, i) => ({
    lap: i + 1,
    custom: customLapTimes[i] ?? 0,
    original: originalLapTimes[i] ?? 0,
  }));

  const projectedTime = customLapTimes.reduce((a, b) => a + b, 0);
  const originalTime = originalLapTimes.reduce((a, b) => a + b, 0);

  return {
    driverCode,
    stints,
    projectedTime,
    originalTime,
    lapTimeCurve,
    timeDelta: projectedTime - originalTime,
  };
}

/** Snap a stop lap to valid range (not lap 1, not last 5) */
export function clampStopLap(lap: number, totalLaps: number, minLap = 5): number {
  return Math.max(minLap, Math.min(totalLaps - 5, Math.round(lap)));
}

/** Default strategy: extract stop laps + compounds from race data for a driver */
export function extractDefaultStrategy(race: Race, driverCode: string): { stops: number[]; compounds: Compound[] } {
  const driver = race.drivers.find(d => d.code === driverCode);
  if (!driver) return { stops: [], compounds: ['MEDIUM'] };
  const stops = driver.stints.slice(1).map(s => s.startLap);
  const compounds = driver.stints.map(s => s.compound);
  return { stops, compounds };
}
