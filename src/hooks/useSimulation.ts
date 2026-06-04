import { useState, useEffect, useRef, useCallback } from 'react';
import type { Race, SimulationState } from '../types';

export function useSimulation(race: Race | null) {
  const [state, setState] = useState<SimulationState>({
    currentLap: 1,
    isPlaying: false,
    speed: 1,
    selectedRace: race,
    selectedDrivers: [],
    focusedDriver: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalLaps = race?.totalLaps ?? 57;

  const tick = useCallback(() => {
    setState(prev => {
      if (prev.currentLap >= totalLaps) {
        return { ...prev, isPlaying: false };
      }
      return { ...prev, currentLap: prev.currentLap + 1 };
    });
  }, [totalLaps]);

  useEffect(() => {
    if (state.isPlaying) {
      const delay = 1200 / state.speed;
      intervalRef.current = setInterval(tick, delay);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPlaying, state.speed, tick]);

  // Reset when race changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      currentLap: 1,
      isPlaying: false,
      selectedRace: race,
      selectedDrivers: race?.drivers.slice(0, 5).map(d => d.code) ?? [],
      focusedDriver: race?.drivers[0]?.code ?? null,
    }));
  }, [race]);

  const play = useCallback(() => setState(p => ({ ...p, isPlaying: true })), []);
  const pause = useCallback(() => setState(p => ({ ...p, isPlaying: false })), []);
  const reset = useCallback(() => setState(p => ({ ...p, currentLap: 1, isPlaying: false })), []);
  const setLap = useCallback((lap: number) => setState(p => ({ ...p, currentLap: lap })), []);
  const setSpeed = useCallback((speed: number) => setState(p => ({ ...p, speed })), []);

  const toggleDriver = useCallback((code: string) => {
    setState(p => ({
      ...p,
      selectedDrivers: p.selectedDrivers.includes(code)
        ? p.selectedDrivers.filter(c => c !== code)
        : [...p.selectedDrivers, code],
    }));
  }, []);

  const setFocusedDriver = useCallback((code: string | null) => {
    setState(p => ({ ...p, focusedDriver: code }));
  }, []);

  return {
    ...state,
    play,
    pause,
    reset,
    setLap,
    setSpeed,
    toggleDriver,
    setFocusedDriver,
    totalLaps,
  };
}
