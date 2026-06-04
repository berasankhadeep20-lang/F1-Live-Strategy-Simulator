import { useState, useMemo } from 'react';
import { getRaces } from './data/raceData';
import { useSimulation } from './hooks/useSimulation';
import RaceSelector from './components/RaceSelector';
import PlaybackControls from './components/PlaybackControls';
import StrategyTimeline from './components/StrategyTimeline';
import TyreDegChart from './components/TyreDegChart';
import PitWindowPanel from './components/PitWindowPanel';
import PositionChart from './components/PositionChart';
import UndercutAnalyzer from './components/UndercutAnalyzer';
import DriverSelector from './components/DriverSelector';
import './App.css';

export default function App() {
  const races = useMemo(() => getRaces(), []);
  const [selectedRace, setSelectedRace] = useState(races[0]);

  const sim = useSimulation(selectedRace);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-f1">F1</span>
            <span className="logo-text">Strategy Simulator</span>
          </div>
          <span className="header-desc">Live pit stop & tyre strategy analysis</span>
        </div>
        <div className="header-right">
          <a
            href="https://github.com/berasankhadeep20-lang/F1-Live-Strategy-Simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </a>
        </div>
      </header>

      <div className="race-selector-bar">
        <RaceSelector races={races} selected={selectedRace} onSelect={setSelectedRace} />
      </div>

      <div className="playback-bar">
        <PlaybackControls
          currentLap={sim.currentLap}
          totalLaps={sim.totalLaps}
          isPlaying={sim.isPlaying}
          speed={sim.speed}
          onPlay={sim.play}
          onPause={sim.pause}
          onReset={sim.reset}
          onSetLap={sim.setLap}
          onSetSpeed={sim.setSpeed}
        />
      </div>

      <div className="main-layout">
        <aside className="sidebar">
          <DriverSelector
            race={selectedRace}
            currentLap={sim.currentLap}
            selectedDrivers={sim.selectedDrivers}
            focusedDriver={sim.focusedDriver}
            onToggle={sim.toggleDriver}
            onFocus={sim.setFocusedDriver}
          />
        </aside>

        <main className="center-panels">
          <StrategyTimeline
            race={selectedRace}
            currentLap={sim.currentLap}
            selectedDrivers={sim.selectedDrivers}
            focusedDriver={sim.focusedDriver}
            onDriverClick={sim.setFocusedDriver}
          />
          <div className="charts-row">
            <PositionChart
              race={selectedRace}
              currentLap={sim.currentLap}
              selectedDrivers={sim.selectedDrivers}
              focusedDriver={sim.focusedDriver}
            />
            <TyreDegChart
              race={selectedRace}
              focusedDriver={sim.focusedDriver}
              currentLap={sim.currentLap}
            />
          </div>
        </main>

        <aside className="right-panels">
          <PitWindowPanel
            race={selectedRace}
            currentLap={sim.currentLap}
            selectedDrivers={sim.selectedDrivers}
            focusedDriver={sim.focusedDriver}
            onDriverClick={sim.setFocusedDriver}
          />
          <UndercutAnalyzer
            race={selectedRace}
            currentLap={sim.currentLap}
            focusedDriver={sim.focusedDriver}
          />
        </aside>
      </div>
    </div>
  );
}
