# F1 Live Strategy Simulator

A real-time Formula 1 pit stop strategy dashboard — visualize tyre degradation, pit windows, undercut/overcut probabilities, and race position changes lap by lap.

**Live demo:** https://berasankhadeep20-lang.github.io/F1-Live-Strategy-Simulator

## Features

- Strategy Timeline — Stint-by-stint tyre visualization for all drivers with a live lap needle
- Tyre Degradation Model — Polynomial deg curves per compound (Soft / Medium / Hard)
- Pit Window Calculator — Optimal stop lap, window open/close, compound recommendation
- Undercut Analyzer — Pick any two drivers; get live success probability, pace delta, and verdict
- Position Chart — Lap-by-lap race order with team colors
- Playback Controls — Scrub, play at 1x/2x/4x speed, reset at any point
- 3 Races — Bahrain 2024, Monza 2024, Silverstone 2024

## Tech Stack

- React 18 + TypeScript + Vite
- Recharts for all charts
- Pure CSS (no UI library)
- GitHub Actions for auto-deploy to GitHub Pages

## Local Development

```bash
git clone https://github.com/berasankhadeep20-lang/F1-Live-Strategy-Simulator.git
cd F1-Live-Strategy-Simulator
npm install
npm run dev
```

## Deployment

Pushes to main auto-deploy. Enable GitHub Pages in Settings > Pages > Source: GitHub Actions.

## Author

Sankhadeep Bera | IISER Kolkata
https://berasankhadeep20-lang.github.io
