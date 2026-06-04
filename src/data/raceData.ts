import type { Race, Driver, LapData, Stint, Compound, SafetyCarEvent } from '../types';

export const TEAM_COLORS: Record<string, string> = {
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

// Per-circuit deg multipliers — Monaco ~0.2 (no deg), Spa ~1.8 (destroys softs)
const CIRCUIT_DEG: Record<string, { SOFT: number; MEDIUM: number; HARD: number; pitLane: number }> = {
  'bahrain':     { SOFT: 1.0,  MEDIUM: 1.0,  HARD: 1.0,  pitLane: 22 },
  'jeddah':      { SOFT: 0.9,  MEDIUM: 0.85, HARD: 0.8,  pitLane: 24 },
  'australia':   { SOFT: 1.1,  MEDIUM: 1.0,  HARD: 0.95, pitLane: 23 },
  'japan':       { SOFT: 1.3,  MEDIUM: 1.2,  HARD: 1.1,  pitLane: 26 },
  'china':       { SOFT: 1.0,  MEDIUM: 0.95, HARD: 0.9,  pitLane: 22 },
  'miami':       { SOFT: 1.15, MEDIUM: 1.05, HARD: 1.0,  pitLane: 21 },
  'imola':       { SOFT: 1.2,  MEDIUM: 1.1,  HARD: 1.0,  pitLane: 24 },
  'monaco':      { SOFT: 0.2,  MEDIUM: 0.15, HARD: 0.1,  pitLane: 28 },
  'canada':      { SOFT: 0.8,  MEDIUM: 0.75, HARD: 0.7,  pitLane: 20 },
  'spain':       { SOFT: 1.4,  MEDIUM: 1.3,  HARD: 1.1,  pitLane: 22 },
  'austria':     { SOFT: 1.0,  MEDIUM: 0.9,  HARD: 0.85, pitLane: 20 },
  'silverstone': { SOFT: 1.3,  MEDIUM: 1.2,  HARD: 1.0,  pitLane: 23 },
  'hungary':     { SOFT: 1.2,  MEDIUM: 1.1,  HARD: 1.0,  pitLane: 22 },
  'spa':         { SOFT: 1.8,  MEDIUM: 1.5,  HARD: 1.3,  pitLane: 27 },
  'netherlands': { SOFT: 1.1,  MEDIUM: 1.0,  HARD: 0.95, pitLane: 23 },
  'monza':       { SOFT: 0.7,  MEDIUM: 0.6,  HARD: 0.5,  pitLane: 25 },
  'baku':        { SOFT: 0.9,  MEDIUM: 0.8,  HARD: 0.75, pitLane: 22 },
  'singapore':   { SOFT: 0.6,  MEDIUM: 0.55, HARD: 0.5,  pitLane: 30 },
  'austin':      { SOFT: 1.2,  MEDIUM: 1.1,  HARD: 1.0,  pitLane: 22 },
  'mexico':      { SOFT: 0.8,  MEDIUM: 0.7,  HARD: 0.65, pitLane: 22 },
  'saopaulo':    { SOFT: 1.1,  MEDIUM: 1.0,  HARD: 0.9,  pitLane: 21 },
  'lasvegas':    { SOFT: 0.7,  MEDIUM: 0.65, HARD: 0.6,  pitLane: 23 },
  'qatar':       { SOFT: 1.6,  MEDIUM: 1.4,  HARD: 1.2,  pitLane: 23 },
  'abudhabi':    { SOFT: 0.9,  MEDIUM: 0.85, HARD: 0.8,  pitLane: 21 },
};

export const TYRE_DEG_MODELS: Record<Compound, { a: number; b: number; c: number; maxLife: number }> = {
  SOFT:         { a: 0.008,  b: 0.12, c: 0,    maxLife: 22 },
  MEDIUM:       { a: 0.004,  b: 0.06, c: 0.3,  maxLife: 35 },
  HARD:         { a: 0.0015, b: 0.03, c: 0.7,  maxLife: 50 },
  INTERMEDIATE: { a: 0.006,  b: 0.09, c: 0.5,  maxLife: 40 },
  WET:          { a: 0.003,  b: 0.04, c: 1.2,  maxLife: 60 },
};

function polyDeg(age: number, compound: Compound, circuitKey: string): number {
  const m = TYRE_DEG_MODELS[compound];
  const cd = CIRCUIT_DEG[circuitKey] ?? { SOFT: 1, MEDIUM: 1, HARD: 1 };
  const mult = compound === 'SOFT' ? cd.SOFT : compound === 'MEDIUM' ? cd.MEDIUM : compound === 'HARD' ? cd.HARD : 1;
  return (m.a * age * age + m.b * age + m.c) * mult;
}

function addNoise(val: number, sigma: number): number {
  const u = Math.random(), v = Math.random();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return val + n * sigma;
}

interface DriverConfig {
  code: string;
  name: string;
  team: string;
  number: number;
  basePace: number;
  strategy: Array<{ compound: Compound; length: number }>;
  startPosition: number;
}

function generateDriverLaps(
  cfg: DriverConfig,
  totalLaps: number,
  circuitKey: string,
  scEvents: SafetyCarEvent[]
): { laps: LapData[]; stints: Stint[] } {
  const laps: LapData[] = [];
  const stints: Stint[] = [];
  let currentLap = 1;
  let position = cfg.startPosition;
  let cumulativeGap = (cfg.startPosition - 1) * 0.3;

  for (const stint of cfg.strategy) {
    const stintLaps: LapData[] = [];
    const stintEnd = Math.min(currentLap + stint.length - 1, totalLaps);

    for (let l = currentLap; l <= stintEnd; l++) {
      const tyreAge = l - currentLap + 1;
      const deg = polyDeg(tyreAge, stint.compound, circuitKey);
      const rawTime = cfg.basePace + deg;

      // Safety car lap time boost
      const sc = scEvents.find(e => l >= e.startLap && l <= e.endLap);
      const scMultiplier = sc ? (sc.type === 'SC' ? 1.35 : 1.18) : 1;
      const lapTime = addNoise(rawTime * scMultiplier, sc ? 0.05 : 0.15);

      if (l > 3 && Math.random() < 0.04) {
        position = Math.max(1, Math.min(20, position + (Math.random() > 0.5 ? -1 : 1)));
      }
      cumulativeGap += addNoise(sc ? 0 : 0, 0.06);
      const gap = Math.max(0, cumulativeGap);
      const s1 = addNoise(lapTime * 0.28, 0.05);
      const s2 = addNoise(lapTime * 0.38, 0.05);
      const s3 = lapTime - s1 - s2;
      const isPitIn = l === stintEnd && l < totalLaps;
      const isPitOut = l === currentLap && stints.length > 0;
      const finalTime = Math.max(80, isPitIn ? lapTime + 1.5 : isPitOut ? lapTime + 22 : lapTime);

      stintLaps.push({ lap: l, lapTime: finalTime, tyreAge, compound: stint.compound, position, gap, sector1: s1, sector2: s2, sector3: s3, pitIn: isPitIn, pitOut: isPitOut });
    }

    stints.push({ compound: stint.compound, startLap: currentLap, endLap: stintEnd, tyreAge: stint.length, laps: stintLaps });
    laps.push(...stintLaps);
    currentLap = stintEnd + 1;
  }
  return { laps, stints };
}

function buildRace(
  id: string, name: string, circuit: string, country: string, flag: string, year: number,
  totalLaps: number, circuitKey: string, driverConfigs: DriverConfig[], scEvents: SafetyCarEvent[] = []
): Race {
  const cd = CIRCUIT_DEG[circuitKey] ?? { pitLane: 22, SOFT: 1, MEDIUM: 1, HARD: 1 };
  const drivers: Driver[] = driverConfigs.map(cfg => {
    const { laps, stints } = generateDriverLaps(cfg, totalLaps, circuitKey, scEvents);
    return { code: cfg.code, name: cfg.name, team: cfg.team, teamColor: TEAM_COLORS[cfg.team] ?? '#888', number: cfg.number, stints, laps };
  });
  return {
    id, name, circuit, country, flag, year, totalLaps, drivers, safetyCarEvents: scEvents,
    degMultiplier: { SOFT: cd.SOFT, MEDIUM: cd.MEDIUM, HARD: cd.HARD },
    pitLaneTime: cd.pitLane,
  };
}

// ─── Full 2024 F1 driver lineup ───────────────────────────────────────────────
const DRIVERS_2024 = {
  VER: { code:'VER', name:'Max Verstappen',      team:'Red Bull Racing', number:1  },
  PER: { code:'PER', name:'Sergio Perez',         team:'Red Bull Racing', number:11 },
  LEC: { code:'LEC', name:'Charles Leclerc',      team:'Ferrari',         number:16 },
  SAI: { code:'SAI', name:'Carlos Sainz',         team:'Ferrari',         number:55 },
  NOR: { code:'NOR', name:'Lando Norris',         team:'McLaren',         number:4  },
  PIA: { code:'PIA', name:'Oscar Piastri',        team:'McLaren',         number:81 },
  HAM: { code:'HAM', name:'Lewis Hamilton',       team:'Mercedes',        number:44 },
  RUS: { code:'RUS', name:'George Russell',       team:'Mercedes',        number:63 },
  ALO: { code:'ALO', name:'Fernando Alonso',      team:'Aston Martin',    number:14 },
  STR: { code:'STR', name:'Lance Stroll',         team:'Aston Martin',    number:18 },
  GAS: { code:'GAS', name:'Pierre Gasly',         team:'Alpine',          number:10 },
  OCO: { code:'OCO', name:'Esteban Ocon',         team:'Alpine',          number:31 },
  ALB: { code:'ALB', name:'Alexander Albon',      team:'Williams',        number:23 },
  SAR: { code:'SAR', name:'Logan Sargeant',       team:'Williams',        number:2  },
  MAG: { code:'MAG', name:'Kevin Magnussen',      team:'Haas',            number:20 },
  HUL: { code:'HUL', name:'Nico Hulkenberg',      team:'Haas',            number:27 },
  TSU: { code:'TSU', name:'Yuki Tsunoda',         team:'RB',              number:22 },
  RIC: { code:'RIC', name:'Daniel Ricciardo',     team:'RB',              number:3  },
  ZHO: { code:'ZHO', name:'Guanyu Zhou',          team:'Kick Sauber',     number:24 },
  BOT: { code:'BOT', name:'Valtteri Bottas',      team:'Kick Sauber',     number:77 },
};

type DKey = keyof typeof DRIVERS_2024;

function cfg(key: DKey, basePace: number, startPos: number, strategy: Array<{compound: Compound; length: number}>): DriverConfig {
  return { ...DRIVERS_2024[key], basePace, startPosition: startPos, strategy };
}

// ─── All 24 races ─────────────────────────────────────────────────────────────

export function getRaces(): Race[] {
  return [

    // 1. BAHRAIN
    buildRace('bahrain-2024','Bahrain Grand Prix','Bahrain International Circuit','Bahrain','🇧🇭',2024,57,'bahrain',[
      cfg('VER',91.8,1,[{compound:'MEDIUM',length:22},{compound:'HARD',length:35}]),
      cfg('LEC',92.1,2,[{compound:'SOFT',length:18},{compound:'HARD',length:39}]),
      cfg('SAI',92.2,3,[{compound:'MEDIUM',length:24},{compound:'MEDIUM',length:33}]),
      cfg('NOR',92.4,4,[{compound:'MEDIUM',length:20},{compound:'HARD',length:37}]),
      cfg('HAM',92.6,5,[{compound:'MEDIUM',length:19},{compound:'HARD',length:38}]),
      cfg('RUS',92.7,6,[{compound:'SOFT',length:15},{compound:'MEDIUM',length:42}]),
      cfg('ALO',92.9,7,[{compound:'MEDIUM',length:26},{compound:'HARD',length:31}]),
      cfg('PIA',92.5,8,[{compound:'SOFT',length:17},{compound:'HARD',length:40}]),
      cfg('PER',92.0,9,[{compound:'MEDIUM',length:21},{compound:'HARD',length:36}]),
      cfg('STR',93.4,10,[{compound:'MEDIUM',length:28},{compound:'HARD',length:29}]),
    ]),

    // 2. JEDDAH
    buildRace('jeddah-2024','Saudi Arabian Grand Prix','Jeddah Corniche Circuit','Saudi Arabia','🇸🇦',2024,50,'jeddah',[
      cfg('VER',88.5,1,[{compound:'MEDIUM',length:20},{compound:'SOFT',length:30}]),
      cfg('PER',88.7,2,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:33}]),
      cfg('LEC',88.9,3,[{compound:'MEDIUM',length:22},{compound:'SOFT',length:28}]),
      cfg('SAI',89.0,4,[{compound:'SOFT',length:15},{compound:'HARD',length:35}]),
      cfg('NOR',89.2,5,[{compound:'MEDIUM',length:20},{compound:'SOFT',length:30}]),
      cfg('RUS',89.4,6,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:32}]),
      cfg('HAM',89.5,7,[{compound:'MEDIUM',length:25},{compound:'SOFT',length:25}]),
      cfg('ALO',89.7,8,[{compound:'SOFT',length:16},{compound:'HARD',length:34}]),
      cfg('PIA',89.3,9,[{compound:'MEDIUM',length:23},{compound:'SOFT',length:27}]),
      cfg('STR',90.1,10,[{compound:'SOFT',length:20},{compound:'MEDIUM',length:30}]),
    ]),

    // 3. AUSTRALIA
    buildRace('australia-2024','Australian Grand Prix','Albert Park Circuit','Australia','🇦🇺',2024,58,'australia',[
      cfg('SAI',80.2,1,[{compound:'MEDIUM',length:22},{compound:'HARD',length:36}]),
      cfg('LEC',80.4,2,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:42}]),
      cfg('NOR',80.5,3,[{compound:'MEDIUM',length:24},{compound:'HARD',length:34}]),
      cfg('PIA',80.7,4,[{compound:'SOFT',length:18},{compound:'HARD',length:40}]),
      cfg('VER',80.3,5,[{compound:'MEDIUM',length:20},{compound:'HARD',length:38}]),
      cfg('HAM',81.0,6,[{compound:'MEDIUM',length:23},{compound:'HARD',length:35}]),
      cfg('ALO',81.2,7,[{compound:'SOFT',length:15},{compound:'MEDIUM',length:43}]),
      cfg('RUS',81.1,8,[{compound:'MEDIUM',length:25},{compound:'HARD',length:33}]),
      cfg('TSU',81.5,9,[{compound:'SOFT',length:17},{compound:'HARD',length:41}]),
      cfg('PER',80.8,10,[{compound:'MEDIUM',length:21},{compound:'HARD',length:37}]),
    ],[{type:'SC',startLap:22,endLap:26},{type:'VSC',startLap:44,endLap:46}]),

    // 4. JAPAN
    buildRace('japan-2024','Japanese Grand Prix','Suzuka International Racing Course','Japan','🇯🇵',2024,53,'japan',[
      cfg('VER',90.1,1,[{compound:'MEDIUM',length:18},{compound:'HARD',length:35}]),
      cfg('NOR',90.4,2,[{compound:'SOFT',length:14},{compound:'HARD',length:39}]),
      cfg('LEC',90.5,3,[{compound:'MEDIUM',length:20},{compound:'HARD',length:33}]),
      cfg('SAI',90.6,4,[{compound:'SOFT',length:15},{compound:'MEDIUM',length:38}]),
      cfg('PIA',90.7,5,[{compound:'MEDIUM',length:22},{compound:'HARD',length:31}]),
      cfg('HAM',90.9,6,[{compound:'SOFT',length:16},{compound:'HARD',length:37}]),
      cfg('RUS',91.0,7,[{compound:'MEDIUM',length:21},{compound:'HARD',length:32}]),
      cfg('ALO',91.2,8,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:36}]),
      cfg('PER',90.3,9,[{compound:'MEDIUM',length:19},{compound:'HARD',length:34}]),
      cfg('GAS',91.5,10,[{compound:'SOFT',length:18},{compound:'HARD',length:35}]),
    ]),

    // 5. CHINA
    buildRace('china-2024','Chinese Grand Prix','Shanghai International Circuit','China','🇨🇳',2024,56,'china',[
      cfg('VER',93.5,1,[{compound:'MEDIUM',length:21},{compound:'HARD',length:35}]),
      cfg('NOR',93.7,2,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:39}]),
      cfg('SAI',93.9,3,[{compound:'MEDIUM',length:23},{compound:'HARD',length:33}]),
      cfg('LEC',94.0,4,[{compound:'SOFT',length:15},{compound:'HARD',length:41}]),
      cfg('RUS',94.1,5,[{compound:'MEDIUM',length:22},{compound:'HARD',length:34}]),
      cfg('HAM',94.2,6,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:38}]),
      cfg('PER',93.6,7,[{compound:'MEDIUM',length:20},{compound:'HARD',length:36}]),
      cfg('ALO',94.5,8,[{compound:'MEDIUM',length:25},{compound:'HARD',length:31}]),
      cfg('PIA',93.8,9,[{compound:'SOFT',length:16},{compound:'HARD',length:40}]),
      cfg('STR',95.0,10,[{compound:'MEDIUM',length:28},{compound:'HARD',length:28}]),
    ],[{type:'VSC',startLap:30,endLap:33}]),

    // 6. MIAMI
    buildRace('miami-2024','Miami Grand Prix','Miami International Autodrome','USA','🇺🇸',2024,57,'miami',[
      cfg('NOR',89.8,1,[{compound:'MEDIUM',length:20},{compound:'HARD',length:37}]),
      cfg('VER',89.9,2,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:41}]),
      cfg('SAI',90.1,3,[{compound:'MEDIUM',length:22},{compound:'HARD',length:35}]),
      cfg('LEC',90.2,4,[{compound:'SOFT',length:15},{compound:'HARD',length:42}]),
      cfg('HAM',90.4,5,[{compound:'MEDIUM',length:24},{compound:'HARD',length:33}]),
      cfg('RUS',90.5,6,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:40}]),
      cfg('PIA',90.0,7,[{compound:'MEDIUM',length:21},{compound:'HARD',length:36}]),
      cfg('ALO',90.7,8,[{compound:'MEDIUM',length:26},{compound:'HARD',length:31}]),
      cfg('PER',90.3,9,[{compound:'SOFT',length:18},{compound:'HARD',length:39}]),
      cfg('TSU',91.2,10,[{compound:'MEDIUM',length:23},{compound:'HARD',length:34}]),
    ]),

    // 7. IMOLA
    buildRace('imola-2024','Emilia Romagna Grand Prix','Autodromo Enzo e Dino Ferrari','Italy','🇮🇹',2024,63,'imola',[
      cfg('VER',78.5,1,[{compound:'MEDIUM',length:22},{compound:'HARD',length:41}]),
      cfg('NOR',78.7,2,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:47}]),
      cfg('PIA',78.9,3,[{compound:'MEDIUM',length:24},{compound:'HARD',length:39}]),
      cfg('SAI',79.0,4,[{compound:'SOFT',length:15},{compound:'HARD',length:48}]),
      cfg('LEC',79.1,5,[{compound:'MEDIUM',length:21},{compound:'HARD',length:42}]),
      cfg('HAM',79.3,6,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:46}]),
      cfg('RUS',79.4,7,[{compound:'MEDIUM',length:25},{compound:'HARD',length:38}]),
      cfg('ALO',79.6,8,[{compound:'MEDIUM',length:28},{compound:'HARD',length:35}]),
      cfg('PER',78.8,9,[{compound:'SOFT',length:18},{compound:'HARD',length:45}]),
      cfg('GAS',80.0,10,[{compound:'MEDIUM',length:23},{compound:'HARD',length:40}]),
    ]),

    // 8. MONACO
    buildRace('monaco-2024','Monaco Grand Prix','Circuit de Monaco','Monaco','🇲🇨',2024,78,'monaco',[
      cfg('LEC',74.8,1,[{compound:'MEDIUM',length:40},{compound:'MEDIUM',length:38}]),
      cfg('SAI',75.0,2,[{compound:'SOFT',length:25},{compound:'MEDIUM',length:53}]),
      cfg('NOR',75.1,3,[{compound:'MEDIUM',length:42},{compound:'SOFT',length:36}]),
      cfg('PIA',75.2,4,[{compound:'MEDIUM',length:38},{compound:'HARD',length:40}]),
      cfg('VER',75.0,5,[{compound:'MEDIUM',length:41},{compound:'MEDIUM',length:37}]),
      cfg('HAM',75.4,6,[{compound:'SOFT',length:22},{compound:'MEDIUM',length:56}]),
      cfg('RUS',75.5,7,[{compound:'MEDIUM',length:44},{compound:'SOFT',length:34}]),
      cfg('ALO',75.7,8,[{compound:'MEDIUM',length:40},{compound:'HARD',length:38}]),
      cfg('PER',75.2,9,[{compound:'MEDIUM',length:39},{compound:'MEDIUM',length:39}]),
      cfg('STR',76.0,10,[{compound:'MEDIUM',length:45},{compound:'SOFT',length:33}]),
    ],[{type:'VSC',startLap:55,endLap:58}]),

    // 9. CANADA
    buildRace('canada-2024','Canadian Grand Prix','Circuit Gilles Villeneuve','Canada','🇨🇦',2024,70,'canada',[
      cfg('VER',73.8,1,[{compound:'MEDIUM',length:28},{compound:'HARD',length:42}]),
      cfg('NOR',74.0,2,[{compound:'SOFT',length:22},{compound:'MEDIUM',length:48}]),
      cfg('SAI',74.1,3,[{compound:'MEDIUM',length:30},{compound:'HARD',length:40}]),
      cfg('LEC',74.2,4,[{compound:'SOFT',length:20},{compound:'HARD',length:50}]),
      cfg('HAM',74.4,5,[{compound:'MEDIUM',length:32},{compound:'HARD',length:38}]),
      cfg('RUS',74.5,6,[{compound:'SOFT',length:24},{compound:'MEDIUM',length:46}]),
      cfg('ALO',74.7,7,[{compound:'MEDIUM',length:35},{compound:'HARD',length:35}]),
      cfg('PER',73.9,8,[{compound:'MEDIUM',length:27},{compound:'HARD',length:43}]),
      cfg('PIA',74.1,9,[{compound:'SOFT',length:21},{compound:'HARD',length:49}]),
      cfg('TSU',75.2,10,[{compound:'MEDIUM',length:33},{compound:'HARD',length:37}]),
    ],[{type:'SC',startLap:38,endLap:42}]),

    // 10. SPAIN
    buildRace('spain-2024','Spanish Grand Prix','Circuit de Barcelona-Catalunya','Spain','🇪🇸',2024,66,'spain',[
      cfg('VER',76.9,1,[{compound:'MEDIUM',length:20},{compound:'HARD',length:46}]),
      cfg('NOR',77.1,2,[{compound:'SOFT',length:15},{compound:'HARD',length:51}]),
      cfg('LEC',77.3,3,[{compound:'MEDIUM',length:22},{compound:'HARD',length:44}]),
      cfg('SAI',77.4,4,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:49}]),
      cfg('HAM',77.6,5,[{compound:'MEDIUM',length:24},{compound:'HARD',length:42}]),
      cfg('RUS',77.7,6,[{compound:'SOFT',length:16},{compound:'HARD',length:50}]),
      cfg('ALO',77.9,7,[{compound:'MEDIUM',length:26},{compound:'HARD',length:40}]),
      cfg('PER',77.2,8,[{compound:'MEDIUM',length:21},{compound:'HARD',length:45}]),
      cfg('PIA',77.2,9,[{compound:'SOFT',length:18},{compound:'HARD',length:48}]),
      cfg('STR',78.4,10,[{compound:'MEDIUM',length:28},{compound:'HARD',length:38}]),
    ]),

    // 11. AUSTRIA
    buildRace('austria-2024','Austrian Grand Prix','Red Bull Ring','Austria','🇦🇹',2024,71,'austria',[
      cfg('NOR',64.5,1,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:53}]),
      cfg('VER',64.6,2,[{compound:'MEDIUM',length:22},{compound:'HARD',length:49}]),
      cfg('SAI',64.8,3,[{compound:'SOFT',length:16},{compound:'HARD',length:55}]),
      cfg('LEC',64.9,4,[{compound:'MEDIUM',length:24},{compound:'HARD',length:47}]),
      cfg('PIA',65.0,5,[{compound:'SOFT',length:19},{compound:'MEDIUM',length:52}]),
      cfg('HAM',65.2,6,[{compound:'MEDIUM',length:25},{compound:'HARD',length:46}]),
      cfg('RUS',65.3,7,[{compound:'SOFT',length:17},{compound:'HARD',length:54}]),
      cfg('ALO',65.5,8,[{compound:'MEDIUM',length:27},{compound:'HARD',length:44}]),
      cfg('PER',64.7,9,[{compound:'SOFT',length:20},{compound:'MEDIUM',length:51}]),
      cfg('GAS',65.8,10,[{compound:'MEDIUM',length:26},{compound:'HARD',length:45}]),
    ],[{type:'SC',startLap:45,endLap:49}]),

    // 12. SILVERSTONE
    buildRace('silverstone-2024','British Grand Prix','Silverstone Circuit','United Kingdom','🇬🇧',2024,52,'silverstone',[
      cfg('HAM',88.2,1,[{compound:'MEDIUM',length:20},{compound:'HARD',length:32}]),
      cfg('NOR',88.0,2,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:36}]),
      cfg('VER',88.3,3,[{compound:'MEDIUM',length:22},{compound:'HARD',length:30}]),
      cfg('LEC',88.5,4,[{compound:'SOFT',length:15},{compound:'HARD',length:37}]),
      cfg('SAI',88.6,5,[{compound:'MEDIUM',length:24},{compound:'MEDIUM',length:28}]),
      cfg('PIA',88.4,6,[{compound:'MEDIUM',length:21},{compound:'SOFT',length:31}]),
      cfg('RUS',88.7,7,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:35}]),
      cfg('ALO',89.0,8,[{compound:'MEDIUM',length:26},{compound:'HARD',length:26}]),
      cfg('PER',88.8,9,[{compound:'MEDIUM',length:23},{compound:'HARD',length:29}]),
      cfg('STR',89.5,10,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:34}]),
    ]),

    // 13. HUNGARY
    buildRace('hungary-2024','Hungarian Grand Prix','Hungaroring','Hungary','🇭🇺',2024,70,'hungary',[
      cfg('NOR',76.6,1,[{compound:'MEDIUM',length:22},{compound:'HARD',length:48}]),
      cfg('PIA',76.8,2,[{compound:'SOFT',length:17},{compound:'HARD',length:53}]),
      cfg('LEC',77.0,3,[{compound:'MEDIUM',length:24},{compound:'HARD',length:46}]),
      cfg('SAI',77.1,4,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:52}]),
      cfg('HAM',77.3,5,[{compound:'MEDIUM',length:25},{compound:'HARD',length:45}]),
      cfg('VER',76.9,6,[{compound:'SOFT',length:16},{compound:'HARD',length:54}]),
      cfg('RUS',77.4,7,[{compound:'MEDIUM',length:27},{compound:'HARD',length:43}]),
      cfg('ALO',77.6,8,[{compound:'SOFT',length:20},{compound:'MEDIUM',length:50}]),
      cfg('PER',77.1,9,[{compound:'MEDIUM',length:23},{compound:'HARD',length:47}]),
      cfg('GAS',78.0,10,[{compound:'SOFT',length:19},{compound:'HARD',length:51}]),
    ]),

    // 14. SPA
    buildRace('spa-2024','Belgian Grand Prix','Circuit de Spa-Francorchamps','Belgium','🇧🇪',2024,44,'spa',[
      cfg('NOR',105.5,1,[{compound:'SOFT',length:12},{compound:'MEDIUM',length:32}]),
      cfg('VER',105.7,2,[{compound:'MEDIUM',length:16},{compound:'HARD',length:28}]),
      cfg('LEC',105.9,3,[{compound:'SOFT',length:11},{compound:'HARD',length:33}]),
      cfg('SAI',106.0,4,[{compound:'MEDIUM',length:18},{compound:'HARD',length:26}]),
      cfg('HAM',106.2,5,[{compound:'SOFT',length:13},{compound:'MEDIUM',length:31}]),
      cfg('RUS',106.3,6,[{compound:'MEDIUM',length:17},{compound:'HARD',length:27}]),
      cfg('PIA',105.8,7,[{compound:'SOFT',length:12},{compound:'HARD',length:32}]),
      cfg('ALO',106.5,8,[{compound:'MEDIUM',length:19},{compound:'HARD',length:25}]),
      cfg('PER',105.8,9,[{compound:'SOFT',length:14},{compound:'MEDIUM',length:30}]),
      cfg('TSU',107.0,10,[{compound:'MEDIUM',length:20},{compound:'HARD',length:24}]),
    ]),

    // 15. NETHERLANDS
    buildRace('netherlands-2024','Dutch Grand Prix','Circuit Zandvoort','Netherlands','🇳🇱',2024,72,'netherlands',[
      cfg('NOR',71.8,1,[{compound:'MEDIUM',length:22},{compound:'HARD',length:50}]),
      cfg('VER',71.9,2,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:55}]),
      cfg('LEC',72.1,3,[{compound:'MEDIUM',length:24},{compound:'HARD',length:48}]),
      cfg('SAI',72.2,4,[{compound:'SOFT',length:16},{compound:'HARD',length:56}]),
      cfg('HAM',72.4,5,[{compound:'MEDIUM',length:25},{compound:'HARD',length:47}]),
      cfg('RUS',72.5,6,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:54}]),
      cfg('PIA',72.0,7,[{compound:'MEDIUM',length:23},{compound:'HARD',length:49}]),
      cfg('ALO',72.7,8,[{compound:'MEDIUM',length:27},{compound:'HARD',length:45}]),
      cfg('PER',72.0,9,[{compound:'SOFT',length:19},{compound:'HARD',length:53}]),
      cfg('GAS',73.1,10,[{compound:'MEDIUM',length:26},{compound:'HARD',length:46}]),
    ],[{type:'VSC',startLap:40,endLap:43}]),

    // 16. MONZA
    buildRace('monza-2024','Italian Grand Prix','Autodromo Nazionale Monza','Italy','🇮🇹',2024,53,'monza',[
      cfg('LEC',82.4,1,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:37}]),
      cfg('PIA',82.6,2,[{compound:'SOFT',length:14},{compound:'MEDIUM',length:39}]),
      cfg('NOR',82.5,3,[{compound:'MEDIUM',length:22},{compound:'SOFT',length:31}]),
      cfg('SAI',82.7,4,[{compound:'SOFT',length:18},{compound:'HARD',length:35}]),
      cfg('HAM',83.0,5,[{compound:'MEDIUM',length:25},{compound:'SOFT',length:28}]),
      cfg('VER',82.8,6,[{compound:'MEDIUM',length:23},{compound:'SOFT',length:30}]),
      cfg('RUS',83.1,7,[{compound:'SOFT',length:12},{compound:'MEDIUM',length:41}]),
      cfg('PER',83.2,8,[{compound:'MEDIUM',length:20},{compound:'HARD',length:33}]),
      cfg('ALO',83.5,9,[{compound:'SOFT',length:19},{compound:'MEDIUM',length:34}]),
      cfg('STR',83.8,10,[{compound:'MEDIUM',length:30},{compound:'SOFT',length:23}]),
    ]),

    // 17. BAKU
    buildRace('baku-2024','Azerbaijan Grand Prix','Baku City Circuit','Azerbaijan','🇦🇿',2024,51,'baku',[
      cfg('NOR',102.5,1,[{compound:'MEDIUM',length:20},{compound:'SOFT',length:31}]),
      cfg('LEC',102.7,2,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:35}]),
      cfg('SAI',102.9,3,[{compound:'MEDIUM',length:22},{compound:'HARD',length:29}]),
      cfg('PIA',103.0,4,[{compound:'SOFT',length:15},{compound:'HARD',length:36}]),
      cfg('VER',102.6,5,[{compound:'MEDIUM',length:21},{compound:'SOFT',length:30}]),
      cfg('HAM',103.2,6,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:34}]),
      cfg('RUS',103.3,7,[{compound:'MEDIUM',length:23},{compound:'HARD',length:28}]),
      cfg('ALO',103.5,8,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:33}]),
      cfg('PER',102.8,9,[{compound:'MEDIUM',length:20},{compound:'SOFT',length:31}]),
      cfg('TSU',104.0,10,[{compound:'SOFT',length:19},{compound:'HARD',length:32}]),
    ],[{type:'SC',startLap:28,endLap:32}]),

    // 18. SINGAPORE
    buildRace('singapore-2024','Singapore Grand Prix','Marina Bay Street Circuit','Singapore','🇸🇬',2024,62,'singapore',[
      cfg('NOR',95.8,1,[{compound:'MEDIUM',length:28},{compound:'HARD',length:34}]),
      cfg('LEC',96.0,2,[{compound:'SOFT',length:22},{compound:'MEDIUM',length:40}]),
      cfg('SAI',96.2,3,[{compound:'MEDIUM',length:30},{compound:'HARD',length:32}]),
      cfg('PIA',96.3,4,[{compound:'SOFT',length:20},{compound:'HARD',length:42}]),
      cfg('VER',96.1,5,[{compound:'MEDIUM',length:25},{compound:'HARD',length:37}]),
      cfg('HAM',96.5,6,[{compound:'SOFT',length:24},{compound:'MEDIUM',length:38}]),
      cfg('RUS',96.6,7,[{compound:'MEDIUM',length:32},{compound:'HARD',length:30}]),
      cfg('ALO',96.8,8,[{compound:'SOFT',length:21},{compound:'HARD',length:41}]),
      cfg('PER',96.2,9,[{compound:'MEDIUM',length:27},{compound:'HARD',length:35}]),
      cfg('TSU',97.2,10,[{compound:'SOFT',length:23},{compound:'MEDIUM',length:39}]),
    ],[{type:'SC',startLap:18,endLap:23},{type:'VSC',startLap:48,endLap:51}]),

    // 19. AUSTIN
    buildRace('austin-2024','United States Grand Prix','Circuit of the Americas','USA','🇺🇸',2024,56,'austin',[
      cfg('VER',96.2,1,[{compound:'MEDIUM',length:20},{compound:'HARD',length:36}]),
      cfg('NOR',96.4,2,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:40}]),
      cfg('LEC',96.6,3,[{compound:'MEDIUM',length:22},{compound:'HARD',length:34}]),
      cfg('SAI',96.7,4,[{compound:'SOFT',length:15},{compound:'HARD',length:41}]),
      cfg('HAM',96.9,5,[{compound:'MEDIUM',length:24},{compound:'HARD',length:32}]),
      cfg('RUS',97.0,6,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:39}]),
      cfg('PIA',96.5,7,[{compound:'MEDIUM',length:21},{compound:'HARD',length:35}]),
      cfg('ALO',97.2,8,[{compound:'MEDIUM',length:26},{compound:'HARD',length:30}]),
      cfg('PER',96.3,9,[{compound:'SOFT',length:18},{compound:'HARD',length:38}]),
      cfg('STR',97.7,10,[{compound:'MEDIUM',length:28},{compound:'HARD',length:28}]),
    ]),

    // 20. MEXICO
    buildRace('mexico-2024','Mexico City Grand Prix','Autodromo Hermanos Rodriguez','Mexico','🇲🇽',2024,71,'mexico',[
      cfg('VER',78.2,1,[{compound:'MEDIUM',length:25},{compound:'HARD',length:46}]),
      cfg('NOR',78.5,2,[{compound:'SOFT',length:20},{compound:'MEDIUM',length:51}]),
      cfg('LEC',78.7,3,[{compound:'MEDIUM',length:27},{compound:'HARD',length:44}]),
      cfg('SAI',78.8,4,[{compound:'SOFT',length:18},{compound:'HARD',length:53}]),
      cfg('HAM',79.0,5,[{compound:'MEDIUM',length:28},{compound:'HARD',length:43}]),
      cfg('RUS',79.1,6,[{compound:'SOFT',length:22},{compound:'MEDIUM',length:49}]),
      cfg('PER',78.4,7,[{compound:'MEDIUM',length:26},{compound:'HARD',length:45}]),
      cfg('ALO',79.3,8,[{compound:'MEDIUM',length:30},{compound:'HARD',length:41}]),
      cfg('PIA',78.6,9,[{compound:'SOFT',length:19},{compound:'HARD',length:52}]),
      cfg('TSU',79.8,10,[{compound:'MEDIUM',length:32},{compound:'HARD',length:39}]),
    ]),

    // 21. SAO PAULO
    buildRace('saopaulo-2024','São Paulo Grand Prix','Autodromo Jose Carlos Pace','Brazil','🇧🇷',2024,71,'saopaulo',[
      cfg('NOR',70.5,1,[{compound:'MEDIUM',length:22},{compound:'HARD',length:49}]),
      cfg('VER',70.7,2,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:54}]),
      cfg('LEC',70.9,3,[{compound:'MEDIUM',length:24},{compound:'HARD',length:47}]),
      cfg('SAI',71.0,4,[{compound:'SOFT',length:16},{compound:'HARD',length:55}]),
      cfg('HAM',71.2,5,[{compound:'MEDIUM',length:25},{compound:'HARD',length:46}]),
      cfg('RUS',71.3,6,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:53}]),
      cfg('PIA',70.8,7,[{compound:'MEDIUM',length:23},{compound:'HARD',length:48}]),
      cfg('ALO',71.5,8,[{compound:'MEDIUM',length:27},{compound:'HARD',length:44}]),
      cfg('PER',70.8,9,[{compound:'SOFT',length:19},{compound:'HARD',length:52}]),
      cfg('TSU',71.9,10,[{compound:'MEDIUM',length:26},{compound:'HARD',length:45}]),
    ],[{type:'SC',startLap:32,endLap:37}]),

    // 22. LAS VEGAS
    buildRace('lasvegas-2024','Las Vegas Grand Prix','Las Vegas Strip Circuit','USA','🇺🇸',2024,50,'lasvegas',[
      cfg('VER',95.8,1,[{compound:'MEDIUM',length:20},{compound:'SOFT',length:30}]),
      cfg('NOR',96.0,2,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:34}]),
      cfg('LEC',96.2,3,[{compound:'MEDIUM',length:22},{compound:'HARD',length:28}]),
      cfg('SAI',96.3,4,[{compound:'SOFT',length:15},{compound:'MEDIUM',length:35}]),
      cfg('HAM',96.5,5,[{compound:'MEDIUM',length:24},{compound:'SOFT',length:26}]),
      cfg('RUS',96.6,6,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:33}]),
      cfg('PIA',96.1,7,[{compound:'MEDIUM',length:21},{compound:'SOFT',length:29}]),
      cfg('ALO',96.8,8,[{compound:'SOFT',length:19},{compound:'HARD',length:31}]),
      cfg('PER',95.9,9,[{compound:'MEDIUM',length:20},{compound:'SOFT',length:30}]),
      cfg('TSU',97.3,10,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:32}]),
    ]),

    // 23. QATAR
    buildRace('qatar-2024','Qatar Grand Prix','Lusail International Circuit','Qatar','🇶🇦',2024,57,'qatar',[
      cfg('NOR',82.8,1,[{compound:'MEDIUM',length:18},{compound:'HARD',length:39}]),
      cfg('PIA',83.0,2,[{compound:'SOFT',length:14},{compound:'HARD',length:43}]),
      cfg('VER',82.9,3,[{compound:'MEDIUM',length:20},{compound:'HARD',length:37}]),
      cfg('LEC',83.1,4,[{compound:'SOFT',length:13},{compound:'MEDIUM',length:44}]),
      cfg('SAI',83.3,5,[{compound:'MEDIUM',length:22},{compound:'HARD',length:35}]),
      cfg('HAM',83.5,6,[{compound:'SOFT',length:15},{compound:'HARD',length:42}]),
      cfg('RUS',83.6,7,[{compound:'MEDIUM',length:21},{compound:'HARD',length:36}]),
      cfg('ALO',83.8,8,[{compound:'SOFT',length:16},{compound:'MEDIUM',length:41}]),
      cfg('PER',83.0,9,[{compound:'MEDIUM',length:19},{compound:'HARD',length:38}]),
      cfg('GAS',84.2,10,[{compound:'SOFT',length:17},{compound:'HARD',length:40}]),
    ]),

    // 24. ABU DHABI
    buildRace('abudhabi-2024','Abu Dhabi Grand Prix','Yas Marina Circuit','UAE','🇦🇪',2024,58,'abudhabi',[
      cfg('VER',83.5,1,[{compound:'MEDIUM',length:22},{compound:'HARD',length:36}]),
      cfg('NOR',83.7,2,[{compound:'SOFT',length:17},{compound:'MEDIUM',length:41}]),
      cfg('LEC',83.9,3,[{compound:'MEDIUM',length:24},{compound:'HARD',length:34}]),
      cfg('SAI',84.0,4,[{compound:'SOFT',length:16},{compound:'HARD',length:42}]),
      cfg('HAM',84.2,5,[{compound:'MEDIUM',length:25},{compound:'HARD',length:33}]),
      cfg('RUS',84.3,6,[{compound:'SOFT',length:18},{compound:'MEDIUM',length:40}]),
      cfg('PIA',83.8,7,[{compound:'MEDIUM',length:23},{compound:'HARD',length:35}]),
      cfg('ALO',84.5,8,[{compound:'MEDIUM',length:27},{compound:'HARD',length:31}]),
      cfg('PER',83.6,9,[{compound:'SOFT',length:19},{compound:'HARD',length:39}]),
      cfg('TSU',85.0,10,[{compound:'MEDIUM',length:26},{compound:'HARD',length:32}]),
    ]),
  ];
}

export function getTyreDegModels(race: Race) {
  const compounds: Compound[] = ['SOFT','MEDIUM','HARD'];
  return compounds.map(compound => {
    const m = TYRE_DEG_MODELS[compound];
    return { compound, coefficients: [m.a, m.b, m.c] as [number,number,number], basePace: race.drivers[0]?.laps[0]?.lapTime ?? 90, degradationRate: m.b };
  });
}
