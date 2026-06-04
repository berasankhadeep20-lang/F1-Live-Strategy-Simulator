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
  lapTime: number;
  tyreAge: number;
  compound: Compound;
  position: number;
  gap: number;
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
  coefficients: [number, number, number];
  basePace: number;
  degradationRate: number;
}

export interface PitWindow {
  driverCode: string;
  currentLap: number;
  recommendedLap: number;
  windowOpen: number;
  windowClose: number;
  undercutProb: number;
  overcutProb: number;
  targetCompound: Compound;
  timeGain: number;
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

export type SafetyCarType = 'SC' | 'VSC' | null;

export interface SafetyCarEvent {
  type: 'SC' | 'VSC';
  startLap: number;
  endLap: number;
}

export interface CircuitDegMultiplier {
  SOFT: number;
  MEDIUM: number;
  HARD: number;
}

export interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  flag: string;
  year: number;
  totalLaps: number;
  drivers: Driver[];
  safetyCarEvents: SafetyCarEvent[];
  degMultiplier: CircuitDegMultiplier;
  pitLaneTime: number;
}

export interface SimulationState {
  currentLap: number;
  isPlaying: boolean;
  speed: number;
  selectedRace: Race | null;
  selectedDrivers: string[];
  focusedDriver: string | null;
  theme: 'dark' | 'light';
  activeSafetyCar: SafetyCarType;
  rainProbability: number;
  shareURL: string | null;
}

export interface StrategyComparison {
  oneStop: { totalTime: number; stops: number[]; compounds: Compound[] };
  twoStop: { totalTime: number; stops: number[]; compounds: Compound[] };
}
