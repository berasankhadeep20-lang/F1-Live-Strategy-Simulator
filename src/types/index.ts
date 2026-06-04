export type Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';

export interface Stint {
  compound: Compound;
  startLap: number;
  endLap: number;
  tyreAge: number;
  laps: LapData[];
}

export interface LapData {
  lap: number;
  lapTime: number; // seconds
  tyreAge: number;
  compound: Compound;
  position: number;
  gap: number; // gap to leader in seconds
  sector1: number;
  sector2: number;
  sector3: number;
  pitIn: boolean;
  pitOut: boolean;
}

export interface Driver {
  code: string;
  name: string;
  team: string;
  teamColor: string;
  number: number;
  stints: Stint[];
  laps: LapData[];
}

export interface TyreDegModel {
  compound: Compound;
  coefficients: [number, number, number]; // [a, b, c] for ax² + bx + c
  basePace: number; // base lap time at tyre age 0
  degradationRate: number; // seconds per lap
}

export interface PitWindow {
  driverCode: string;
  currentLap: number;
  recommendedLap: number;
  windowOpen: number;
  windowClose: number;
  undercutProb: number; // 0-1
  overcutProb: number;  // 0-1
  targetCompound: Compound;
  timeGain: number; // estimated seconds gained
}

export interface UndercutAnalysis {
  attacker: string;
  defender: string;
  currentGap: number;
  pitLossTime: number;
  degDelta: number;
  successProbability: number;
  recommendedLap: number;
  estimatedGainPerLap: number;
}

export interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  year: number;
  totalLaps: number;
  drivers: Driver[];
}

export interface SimulationState {
  currentLap: number;
  isPlaying: boolean;
  speed: number; // 1x, 2x, 4x
  selectedRace: Race | null;
  selectedDrivers: string[];
  focusedDriver: string | null;
}
