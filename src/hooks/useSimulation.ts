import { useState, useEffect, useRef, useCallback } from 'react';
import type { Race, SimulationState } from '../types';

function encodeURL(raceId: string, lap: number, drivers: string[]): string {
  const params = new URLSearchParams({ r: raceId, l: String(lap), d: drivers.join(',') });
  return `${window.location.origin}${window.location.pathname}#${params.toString()}`;
}

function decodeURL(): { raceId?: string; lap?: number; drivers?: string[] } {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return {};
    const params = new URLSearchParams(hash);
    return {
      raceId: params.get('r') ?? undefined,
      lap: params.get('l') ? Number(params.get('l')) : undefined,
      drivers: params.get('d') ? params.get('d')!.split(',') : undefined,
    };
  } catch { return {}; }
}

export function useSimulation(race: Race | null) {
  const savedTheme = (localStorage.getItem('f1-theme') ?? 'dark') as 'dark' | 'light';
  const urlState = decodeURL();

  const [state, setState] = useState<SimulationState>({
    currentLap: urlState.lap ?? 1,
    isPlaying: false,
    speed: 1,
    selectedRace: race,
    selectedDrivers: urlState.drivers ?? [],
    focusedDriver: null,
    theme: savedTheme,
    activeSafetyCar: null,
    rainProbability: 0,
    shareURL: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalLaps = race?.totalLaps ?? 57;

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('f1-theme', state.theme);
  }, [state.theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') { e.preventDefault(); setState(p => ({ ...p, isPlaying: !p.isPlaying })); }
      if (e.code === 'ArrowRight') setState(p => ({ ...p, currentLap: Math.min(totalLaps, p.currentLap + (e.shiftKey ? 5 : 1)) }));
      if (e.code === 'ArrowLeft') setState(p => ({ ...p, currentLap: Math.max(1, p.currentLap - (e.shiftKey ? 5 : 1)) }));
      if (e.key === 'r' || e.key === 'R') setState(p => ({ ...p, currentLap: 1, isPlaying: false }));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [totalLaps]);

  const tick = useCallback(() => {
    setState(prev => {
      if (prev.currentLap >= totalLaps) return { ...prev, isPlaying: false };
      const nextLap = prev.currentLap + 1;
      // Check for SC events
      const sc = race?.safetyCarEvents.find(e => nextLap >= e.startLap && nextLap <= e.endLap);
      return { ...prev, currentLap: nextLap, activeSafetyCar: sc?.type ?? null };
    });
  }, [totalLaps, race]);

  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = setInterval(tick, 1200 / state.speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.isPlaying, state.speed, tick]);

  useEffect(() => {
    const initDrivers = urlState.drivers?.filter(d => race?.drivers.some(rd => rd.code === d))
      ?? race?.drivers.slice(0, 5).map(d => d.code)
      ?? [];
    setState(prev => ({
      ...prev,
      currentLap: urlState.lap ?? 1,
      isPlaying: false,
      selectedRace: race,
      selectedDrivers: initDrivers,
      focusedDriver: race?.drivers[0]?.code ?? null,
      activeSafetyCar: null,
      shareURL: null,
    }));
  }, [race]);

  const play = useCallback(() => setState(p => ({ ...p, isPlaying: true })), []);
  const pause = useCallback(() => setState(p => ({ ...p, isPlaying: false })), []);
  const reset = useCallback(() => setState(p => ({ ...p, currentLap: 1, isPlaying: false, activeSafetyCar: null })), []);
  const setLap = useCallback((lap: number) => {
    const sc = race?.safetyCarEvents.find(e => lap >= e.startLap && lap <= e.endLap);
    setState(p => ({ ...p, currentLap: lap, activeSafetyCar: sc?.type ?? null }));
  }, [race]);
  const setSpeed = useCallback((speed: number) => setState(p => ({ ...p, speed })), []);
  const toggleDriver = useCallback((code: string) => {
    setState(p => ({
      ...p,
      selectedDrivers: p.selectedDrivers.includes(code)
        ? p.selectedDrivers.filter(c => c !== code)
        : [...p.selectedDrivers, code],
    }));
  }, []);
  const setFocusedDriver = useCallback((code: string | null) => setState(p => ({ ...p, focusedDriver: code })), []);
  const toggleTheme = useCallback(() => setState(p => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' })), []);
  const setRainProbability = useCallback((v: number) => setState(p => ({ ...p, rainProbability: v })), []);
  const generateShareURL = useCallback(() => {
    if (!race) return;
    const url = encodeURL(race.id, state.currentLap, state.selectedDrivers);
    setState(p => ({ ...p, shareURL: url }));
    navigator.clipboard?.writeText(url).catch(() => {});
  }, [race, state.currentLap, state.selectedDrivers]);

  return {
    ...state, play, pause, reset, setLap, setSpeed,
    toggleDriver, setFocusedDriver, toggleTheme, setRainProbability, generateShareURL, totalLaps,
  };
}
