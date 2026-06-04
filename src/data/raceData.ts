import type { Race, Driver, LapData, Stint, Compound, TyreDegModel } from '../types';

// Team colors matching actual F1 2024 colors
const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2',
  'McLaren': '#FF8000',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Williams': '#64C4FF',
  'Haas': '#B6BABD',
  'RB': '#6692FF',
  'Kick Sauber': '#52E252',
};

// Tyre deg coefficients: [a (quadratic), b (linear), c (base)] in seconds
// These approximate real F1 pace curves
const TYRE_DEG_MODELS: Record<Compound, { a: number; b: number; c: number; maxLife: number }> = {
  SOFT:         { a: 0.008,  b: 0.12, c: 0,    maxLife: 22 },
  MEDIUM:       { a: 0.004,  b: 0.06, c: 0.3,  maxLife: 35 },
  HARD:         { a: 0.0015, b: 0.03, c: 0.7,  maxLife: 50 },
  INTERMEDIATE: { a: 0.006,  b: 0.09, c: 0.5,  maxLife: 40 },
  WET:          { a: 0.003,  b: 0.04, c: 1.2,  maxLife: 60 },
};

function polyDeg(age: number, model: typeof TYRE_DEG_MODELS[Compound]): number {
  return model.a * age * age + model.b * age + model.c;
}

function addNoise(val: number, sigma: number): number {
  // Box-Muller for Gaussian noise
  const u = Math.random(), v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return val + n * sigma;
}

interface DriverConfig {
  code: string;
  name: string;
  team: string;
  number: number;
  basePace: number; // base lap time at lap 1 on fresh softs
  strategy: Array<{ compound: Compound; length: number }>;
  startPosition: number;
}

function generateDriverLaps(cfg: DriverConfig, totalLaps: number): { laps: LapData[]; stints: Stint[] } {
  const laps: LapData[] = [];
  const stints: Stint[] = [];

  let currentLap = 1;
  let position = cfg.startPosition;
  let cumulativeGap = (cfg.startPosition - 1) * 0.3; // rough initial spread

  for (const stint of cfg.strategy) {
    const stintLaps: LapData[] = [];
    const stintEnd = Math.min(currentLap + stint.length - 1, totalLaps);
    const model = TYRE_DEG_MODELS[stint.compound];

    for (let l = currentLap; l <= stintEnd; l++) {
      const tyreAge = l - currentLap + 1;
      const deg = polyDeg(tyreAge, model);
      const rawTime = cfg.basePace + deg;
      const lapTime = addNoise(rawTime, 0.15);

      // position drift: rough simulation
      if (l > 3 && Math.random() < 0.05) {
        position = Math.max(1, Math.min(20, position + (Math.random() > 0.5 ? -1 : 1)));
      }

      cumulativeGap += addNoise(0, 0.08);
      const gap = Math.max(0, cumulativeGap);

      const s1 = addNoise(lapTime * 0.28, 0.05);
      const s2 = addNoise(lapTime * 0.38, 0.05);
      const s3 = lapTime - s1 - s2;

      const isPitIn = l === stintEnd && l < totalLaps;
      const isPitOut = l === currentLap && stints.length > 0;
      const pitLap = isPitOut ? lapTime + 22 : (isPitIn ? lapTime + 1.5 : lapTime);

      stintLaps.push({
        lap: l,
        lapTime: Math.max(85, isPitIn ? pitLap : isPitOut ? pitLap : lapTime),
        tyreAge,
        compound: stint.compound,
        position,
        gap,
        sector1: s1,
        sector2: s2,
        sector3: s3,
        pitIn: isPitIn,
        pitOut: isPitOut,
      });
    }

    stints.push({
      compound: stint.compound,
      startLap: currentLap,
      endLap: stintEnd,
      tyreAge: stint.length,
      laps: stintLaps,
    });

    laps.push(...stintLaps);
    currentLap = stintEnd + 1;
  }

  return { laps, stints };
}

// Pre-built race configs
const BAHRAIN_2024_DRIVERS: DriverConfig[] = [
  { code: 'VER', name: 'Max Verstappen',    team: 'Red Bull Racing', number: 1,  basePace: 91.8, startPosition: 1,  strategy: [{ compound: 'MEDIUM', length: 22 }, { compound: 'HARD', length: 35 }] },
  { code: 'LEC', name: 'Charles Leclerc',   team: 'Ferrari',         number: 16, basePace: 92.1, startPosition: 2,  strategy: [{ compound: 'SOFT',   length: 18 }, { compound: 'HARD', length: 39 }] },
  { code: 'SAI', name: 'Carlos Sainz',      team: 'Ferrari',         number: 55, basePace: 92.2, startPosition: 3,  strategy: [{ compound: 'MEDIUM', length: 24 }, { compound: 'MEDIUM', length: 33 }] },
  { code: 'NOR', name: 'Lando Norris',      team: 'McLaren',         number: 4,  basePace: 92.4, startPosition: 4,  strategy: [{ compound: 'MEDIUM', length: 20 }, { compound: 'HARD',   length: 37 }] },
  { code: 'HAM', name: 'Lewis Hamilton',    team: 'Mercedes',        number: 44, basePace: 92.6, startPosition: 5,  strategy: [{ compound: 'MEDIUM', length: 19 }, { compound: 'HARD',   length: 38 }] },
  { code: 'RUS', name: 'George Russell',    team: 'Mercedes',        number: 63, basePace: 92.7, startPosition: 6,  strategy: [{ compound: 'SOFT',   length: 15 }, { compound: 'MEDIUM', length: 42 }] },
  { code: 'ALO', name: 'Fernando Alonso',   team: 'Aston Martin',    number: 14, basePace: 92.9, startPosition: 7,  strategy: [{ compound: 'MEDIUM', length: 26 }, { compound: 'HARD',   length: 31 }] },
  { code: 'PIA', name: 'Oscar Piastri',     team: 'McLaren',         number: 81, basePace: 92.5, startPosition: 8,  strategy: [{ compound: 'SOFT',   length: 17 }, { compound: 'HARD',   length: 40 }] },
  { code: 'PER', name: 'Sergio Perez',      team: 'Red Bull Racing', number: 11, basePace: 92.0, startPosition: 9,  strategy: [{ compound: 'MEDIUM', length: 21 }, { compound: 'HARD',   length: 36 }] },
  { code: 'STR', name: 'Lance Stroll',      team: 'Aston Martin',    number: 18, basePace: 93.4, startPosition: 10, strategy: [{ compound: 'MEDIUM', length: 28 }, { compound: 'HARD',   length: 29 }] },
];

const MONZA_2024_DRIVERS: DriverConfig[] = [
  { code: 'LEC', name: 'Charles Leclerc',   team: 'Ferrari',         number: 16, basePace: 82.4, startPosition: 1,  strategy: [{ compound: 'SOFT',   length: 16 }, { compound: 'MEDIUM', length: 37 }] },
  { code: 'PIA', name: 'Oscar Piastri',     team: 'McLaren',         number: 81, basePace: 82.6, startPosition: 2,  strategy: [{ compound: 'SOFT',   length: 14 }, { compound: 'MEDIUM', length: 39 }] },
  { code: 'NOR', name: 'Lando Norris',      team: 'McLaren',         number: 4,  basePace: 82.5, startPosition: 3,  strategy: [{ compound: 'MEDIUM', length: 22 }, { compound: 'SOFT',   length: 31 }] },
  { code: 'SAI', name: 'Carlos Sainz',      team: 'Ferrari',         number: 55, basePace: 82.7, startPosition: 4,  strategy: [{ compound: 'SOFT',   length: 18 }, { compound: 'HARD',   length: 35 }] },
  { code: 'HAM', name: 'Lewis Hamilton',    team: 'Mercedes',        number: 44, basePace: 83.0, startPosition: 5,  strategy: [{ compound: 'MEDIUM', length: 25 }, { compound: 'SOFT',   length: 28 }] },
  { code: 'VER', name: 'Max Verstappen',    team: 'Red Bull Racing', number: 1,  basePace: 82.8, startPosition: 6,  strategy: [{ compound: 'MEDIUM', length: 23 }, { compound: 'SOFT',   length: 30 }] },
  { code: 'RUS', name: 'George Russell',    team: 'Mercedes',        number: 63, basePace: 83.1, startPosition: 7,  strategy: [{ compound: 'SOFT',   length: 12 }, { compound: 'MEDIUM', length: 41 }] },
  { code: 'PER', name: 'Sergio Perez',      team: 'Red Bull Racing', number: 11, basePace: 83.2, startPosition: 8,  strategy: [{ compound: 'MEDIUM', length: 20 }, { compound: 'HARD',   length: 33 }] },
  { code: 'ALO', name: 'Fernando Alonso',   team: 'Aston Martin',    number: 14, basePace: 83.5, startPosition: 9,  strategy: [{ compound: 'SOFT',   length: 19 }, { compound: 'MEDIUM', length: 34 }] },
  { code: 'STR', name: 'Lance Stroll',      team: 'Aston Martin',    number: 18, basePace: 83.8, startPosition: 10, strategy: [{ compound: 'MEDIUM', length: 30 }, { compound: 'SOFT',   length: 23 }] },
];

const SILVERSTONE_2024_DRIVERS: DriverConfig[] = [
  { code: 'HAM', name: 'Lewis Hamilton',    team: 'Mercedes',        number: 44, basePace: 88.2, startPosition: 1,  strategy: [{ compound: 'MEDIUM', length: 20 }, { compound: 'HARD',   length: 32 }] },
  { code: 'NOR', name: 'Lando Norris',      team: 'McLaren',         number: 4,  basePace: 88.0, startPosition: 2,  strategy: [{ compound: 'SOFT',   length: 16 }, { compound: 'MEDIUM', length: 36 }] },
  { code: 'VER', name: 'Max Verstappen',    team: 'Red Bull Racing', number: 1,  basePace: 88.3, startPosition: 3,  strategy: [{ compound: 'MEDIUM', length: 22 }, { compound: 'HARD',   length: 30 }] },
  { code: 'LEC', name: 'Charles Leclerc',   team: 'Ferrari',         number: 16, basePace: 88.5, startPosition: 4,  strategy: [{ compound: 'SOFT',   length: 15 }, { compound: 'HARD',   length: 37 }] },
  { code: 'SAI', name: 'Carlos Sainz',      team: 'Ferrari',         number: 55, basePace: 88.6, startPosition: 5,  strategy: [{ compound: 'MEDIUM', length: 24 }, { compound: 'MEDIUM', length: 28 }] },
  { code: 'PIA', name: 'Oscar Piastri',     team: 'McLaren',         number: 81, basePace: 88.4, startPosition: 6,  strategy: [{ compound: 'MEDIUM', length: 21 }, { compound: 'SOFT',   length: 31 }] },
  { code: 'RUS', name: 'George Russell',    team: 'Mercedes',        number: 63, basePace: 88.7, startPosition: 7,  strategy: [{ compound: 'SOFT',   length: 17 }, { compound: 'MEDIUM', length: 35 }] },
  { code: 'ALO', name: 'Fernando Alonso',   team: 'Aston Martin',    number: 14, basePace: 89.0, startPosition: 8,  strategy: [{ compound: 'MEDIUM', length: 26 }, { compound: 'HARD',   length: 26 }] },
  { code: 'PER', name: 'Sergio Perez',      team: 'Red Bull Racing', number: 11, basePace: 88.8, startPosition: 9,  strategy: [{ compound: 'MEDIUM', length: 23 }, { compound: 'HARD',   length: 29 }] },
  { code: 'STR', name: 'Lance Stroll',      team: 'Aston Martin',    number: 18, basePace: 89.5, startPosition: 10, strategy: [{ compound: 'SOFT',   length: 18 }, { compound: 'MEDIUM', length: 34 }] },
];

function buildRace(
  id: string, name: string, circuit: string, country: string, year: number,
  totalLaps: number, driverConfigs: DriverConfig[]
): Race {
  const drivers: Driver[] = driverConfigs.map(cfg => {
    const { laps, stints } = generateDriverLaps(cfg, totalLaps);
    return {
      code: cfg.code,
      name: cfg.name,
      team: cfg.team,
      teamColor: TEAM_COLORS[cfg.team] ?? '#888888',
      number: cfg.number,
      stints,
      laps,
    };
  });
  return { id, name, circuit, country, year, totalLaps, drivers };
}

export function getRaces(): Race[] {
  return [
    buildRace('bahrain-2024', 'Bahrain Grand Prix', 'Bahrain International Circuit', 'Bahrain', 2024, 57, BAHRAIN_2024_DRIVERS),
    buildRace('monza-2024', 'Italian Grand Prix', 'Autodromo Nazionale Monza', 'Italy', 2024, 53, MONZA_2024_DRIVERS),
    buildRace('silverstone-2024', 'British Grand Prix', 'Silverstone Circuit', 'United Kingdom', 2024, 52, SILVERSTONE_2024_DRIVERS),
  ];
}

export function getTyreDegModels(race: Race): TyreDegModel[] {
  const compounds: Compound[] = ['SOFT', 'MEDIUM', 'HARD'];
  return compounds.map(compound => {
    const model = TYRE_DEG_MODELS[compound];
    const driverLaps = race.drivers[0]?.laps.filter(l => l.compound === compound) ?? [];
    const basePace = driverLaps.length > 0
      ? Math.min(...driverLaps.map(l => l.lapTime))
      : race.drivers[0]?.laps[0]?.lapTime ?? 92;
    return {
      compound,
      coefficients: [model.a, model.b, model.c],
      basePace,
      degradationRate: model.b,
    };
  });
}

export { TEAM_COLORS, TYRE_DEG_MODELS };
