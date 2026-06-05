import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Race, Compound, CustomStint } from '../types';
import { getTyreColor, formatLapTime } from '../utils/strategyEngine';
import {
  buildStintsFromStops, computeCustomStrategy,
  clampStopLap, extractDefaultStrategy,
} from '../utils/customStrategyEngine';

const COMPOUNDS: Compound[] = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE'];

interface Props {
  race: Race;
  currentLap: number;
  focusedDriver: string | null;
}

interface StopEntry {
  lap: number;
  compound: Compound; // compound for the NEXT stint (after this stop)
}

export default function CustomStrategyBuilder({ race, currentLap, focusedDriver }: Props) {
  const driverCode = focusedDriver ?? race.drivers[0]?.code ?? '';
  const driver = race.drivers.find(d => d.code === driverCode);

  // Stops: each entry = { lap: stop lap, compound: tyre fitted after stop }
  const [stops, setStops] = useState<StopEntry[]>([]);
  const [firstCompound, setFirstCompound] = useState<Compound>('MEDIUM');
  const [dragging, setDragging] = useState<number | null>(null); // index of stop being dragged
  const [customStints, setCustomStints] = useState<CustomStint[]>([]);
  const [analysis, setAnalysis] = useState<ReturnType<typeof computeCustomStrategy> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load driver's original strategy when driver changes
  useEffect(() => {
    if (!driver) return;
    const { stops: origStops, compounds } = extractDefaultStrategy(race, driverCode);
    setFirstCompound(compounds[0] ?? 'MEDIUM');
    setStops(origStops.map((lap, i) => ({ lap, compound: compounds[i + 1] ?? 'HARD' })));
  }, [driverCode, race]);

  // Recompute whenever stops or compounds change
  useEffect(() => {
    const stopLaps = stops.map(s => s.lap);
    const compounds: Compound[] = [firstCompound, ...stops.map(s => s.compound)];
    const stints = buildStintsFromStops(stopLaps, compounds, race.totalLaps);
    setCustomStints(stints);
    setAnalysis(computeCustomStrategy(race, driverCode, stints));
  }, [stops, firstCompound, driverCode, race]);

  const addStop = useCallback(() => {
    // Add a new stop roughly in the middle of the longest stint
    const existing = stops.map(s => s.lap).sort((a, b) => a - b);
    const boundaries = [0, ...existing, race.totalLaps];
    let best = { gap: 0, mid: Math.floor(race.totalLaps / 2) };
    for (let i = 0; i < boundaries.length - 1; i++) {
      const gap = boundaries[i + 1] - boundaries[i];
      if (gap > best.gap) { best = { gap, mid: Math.floor((boundaries[i] + boundaries[i + 1]) / 2) }; }
    }
    const newLap = clampStopLap(best.mid, race.totalLaps);
    setStops(prev => [...prev, { lap: newLap, compound: 'HARD' as Compound }].sort((a, b) => a.lap - b.lap));
  }, [stops, race.totalLaps]);

  const removeStop = useCallback((idx: number) => {
    setStops(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateStopLap = useCallback((idx: number, lap: number) => {
    setStops(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], lap: clampStopLap(lap, race.totalLaps) };
      return next.sort((a, b) => a.lap - b.lap);
    });
  }, [race.totalLaps]);

  const updateStopCompound = useCallback((idx: number, compound: Compound) => {
    setStops(prev => { const next = [...prev]; next[idx] = { ...next[idx], compound }; return next; });
  }, []);

  const resetToOriginal = useCallback(() => {
    const { stops: origStops, compounds } = extractDefaultStrategy(race, driverCode);
    setFirstCompound(compounds[0] ?? 'MEDIUM');
    setStops(origStops.map((lap, i) => ({ lap, compound: compounds[i + 1] ?? 'HARD' })));
  }, [race, driverCode]);

  // Timeline drag handlers
  const handleTimelineMouseDown = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(idx);
  };

  const handleTimelineMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging === null || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const lap = clampStopLap(Math.round(pct * race.totalLaps), race.totalLaps);
    updateStopLap(dragging, lap);
  }, [dragging, race.totalLaps, updateStopLap]);

  const handleTimelineMouseUp = useCallback(() => setDragging(null), []);

  const delta = analysis?.timeDelta ?? 0;
  const faster = delta < 0;
  const deltaColor = Math.abs(delta) < 1 ? '#FF9800' : faster ? '#4CAF50' : '#f44336';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const custom = payload.find((p: any) => p.dataKey === 'custom');
    const original = payload.find((p: any) => p.dataKey === 'original');
    const diff = (custom?.value ?? 0) - (original?.value ?? 0);
    return (
      <div className="chart-tooltip">
        <div className="tooltip-title">Lap {label}</div>
        <div className="tooltip-row" style={{ color: '#60a5fa' }}>
          <span>Custom</span><span>{formatLapTime(custom?.value)}</span>
        </div>
        <div className="tooltip-row" style={{ color: driver?.teamColor ?? '#888' }}>
          <span>Original</span><span>{formatLapTime(original?.value)}</span>
        </div>
        <div className="tooltip-row" style={{ color: diff < 0 ? '#4CAF50' : '#f44336' }}>
          <span>Δ</span><span>{diff > 0 ? '+' : ''}{diff.toFixed(3)}s</span>
        </div>
      </div>
    );
  };

  if (!driver) return null;

  return (
    <div className="panel custom-strategy-builder">
      <div className="panel-header">
        <div className="csb-header-left">
          <span className="panel-title">Custom Strategy Builder</span>
          <span className="csb-driver-tag" style={{ color: driver.teamColor, borderColor: driver.teamColor }}>
            {driverCode}
          </span>
        </div>
        <div className="csb-header-actions">
          <button className="csb-reset-btn" onClick={resetToOriginal} title="Reset to original strategy">
            ↺ Reset
          </button>
          <span className="panel-sub">{customStints.length} stint{customStints.length !== 1 ? 's' : ''} · {stops.length} stop{stops.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Total time delta banner ── */}
      {analysis && Math.abs(delta) > 0.1 && (
        <div className="csb-delta-banner" style={{ background: `${deltaColor}18`, borderColor: deltaColor }}>
          <span className="csb-delta-icon">{faster ? '⚡' : '🐢'}</span>
          <span className="csb-delta-text">
            Custom strategy is <strong style={{ color: deltaColor }}>{faster ? 'faster' : 'slower'}</strong> by{' '}
            <strong style={{ color: deltaColor }}>{Math.abs(delta).toFixed(1)}s</strong> total race time
          </span>
          <div className="csb-times">
            <span>Custom: {formatLapTime(analysis.projectedTime)}</span>
            <span style={{ color: 'var(--text-muted)' }}>Original: {formatLapTime(analysis.originalTime)}</span>
          </div>
        </div>
      )}

      {/* ── Stint compound selector for first stint ── */}
      <div className="csb-body">
        <div className="csb-section-label">Starting compound</div>
        <div className="csb-compound-row">
          {COMPOUNDS.map(c => (
            <button
              key={c}
              className={`csb-compound-btn ${firstCompound === c ? 'active' : ''}`}
              style={firstCompound === c ? { borderColor: getTyreColor(c), background: `${getTyreColor(c)}22`, color: getTyreColor(c) } : {}}
              onClick={() => setFirstCompound(c)}
            >
              <span className="csb-tyre-dot" style={{ background: getTyreColor(c) }} />
              {c}
            </button>
          ))}
        </div>

        {/* ── Draggable timeline ── */}
        <div className="csb-section-label" style={{ marginTop: 14 }}>
          Pit stop laps <span className="csb-hint">(drag handles to move · click + to add)</span>
        </div>
        <div
          className="csb-timeline"
          ref={timelineRef}
          onMouseMove={handleTimelineMouseMove}
          onMouseUp={handleTimelineMouseUp}
          onMouseLeave={handleTimelineMouseUp}
        >
          {/* Stint blocks */}
          {customStints.map((stint, _i) => {
            const left = ((stint.startLap - 1) / (race.totalLaps - 1)) * 100;
            const width = ((stint.endLap - stint.startLap + 1) / (race.totalLaps - 1)) * 100;
            const tColor = getTyreColor(stint.compound);
            return (
              <div
                key={stint.id}
                className="csb-stint-block"
                style={{ left: `${left}%`, width: `${Math.max(width, 2)}%`, background: `${tColor}28`, borderColor: tColor }}
              >
                <span className="csb-stint-label" style={{ color: tColor }}>{stint.compound[0]}</span>
              </div>
            );
          })}

          {/* Current lap needle */}
          <div
            className="csb-lap-needle"
            style={{ left: `${((currentLap - 1) / (race.totalLaps - 1)) * 100}%` }}
          />

          {/* Draggable stop handles */}
          {stops.map((stop, idx) => {
            const pct = ((stop.lap - 1) / (race.totalLaps - 1)) * 100;
            return (
              <div
                key={idx}
                className={`csb-stop-handle ${dragging === idx ? 'dragging' : ''}`}
                style={{ left: `${pct}%` }}
                onMouseDown={handleTimelineMouseDown(idx)}
                title={`Stop ${idx + 1}: Lap ${stop.lap}`}
              >
                <div className="csb-stop-flag">🏁</div>
                <div className="csb-stop-lap-label">L{stop.lap}</div>
              </div>
            );
          })}

          {/* Lap axis */}
          <div className="csb-axis">
            {[1, 10, 20, 30, 40, 50, race.totalLaps].filter(l => l <= race.totalLaps).map(l => (
              <span key={l} style={{ left: `${((l - 1) / (race.totalLaps - 1)) * 100}%` }}>{l}</span>
            ))}
          </div>
        </div>

        {/* ── Per-stop controls ── */}
        <div className="csb-stops-list">
          {stops.length === 0 && (
            <div className="csb-no-stops">No stops — running the full race on {firstCompound}.</div>
          )}
          {stops.map((stop, idx) => (
            <div key={idx} className="csb-stop-row">
              <div className="csb-stop-num">Stop {idx + 1}</div>

              <div className="csb-stop-lap-ctrl">
                <button className="csb-lap-btn" onClick={() => updateStopLap(idx, stop.lap - 1)}>−</button>
                <div className="csb-lap-display">
                  <span className="csb-lap-val">L{stop.lap}</span>
                  <input
                    type="range"
                    min={5} max={race.totalLaps - 5} value={stop.lap}
                    onChange={e => updateStopLap(idx, Number(e.target.value))}
                    className="csb-lap-slider"
                    style={{ '--csb-p': `${((stop.lap - 5) / (race.totalLaps - 10)) * 100}%` } as React.CSSProperties}
                  />
                </div>
                <button className="csb-lap-btn" onClick={() => updateStopLap(idx, stop.lap + 1)}>+</button>
              </div>

              <div className="csb-stop-compound-label">→</div>
              <div className="csb-stop-compounds">
                {COMPOUNDS.map(c => (
                  <button
                    key={c}
                    className={`csb-mini-compound ${stop.compound === c ? 'active' : ''}`}
                    style={stop.compound === c ? { borderColor: getTyreColor(c), background: `${getTyreColor(c)}22` } : {}}
                    onClick={() => updateStopCompound(idx, c)}
                    title={c}
                  >
                    <span style={{ color: getTyreColor(c) }}>{c[0]}</span>
                  </button>
                ))}
              </div>

              <button className="csb-remove-btn" onClick={() => removeStop(idx)} title="Remove stop">✕</button>
            </div>
          ))}

          <button
            className="csb-add-stop-btn"
            onClick={addStop}
            disabled={stops.length >= 4}
          >
            + Add pit stop
          </button>
        </div>

        {/* ── Lap time comparison chart ── */}
        {analysis && analysis.lapTimeCurve.length > 0 && (
          <>
            <div className="csb-section-label" style={{ marginTop: 16 }}>Lap time comparison</div>
            <div className="csb-chart-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={analysis.lapTimeCurve.slice(0, currentLap)}
                  margin={{ top: 6, right: 12, bottom: 6, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="lap" stroke="#666" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis
                    stroke="#666"
                    tick={{ fontSize: 10, fill: '#888' }}
                    tickFormatter={v => formatLapTime(v)}
                    width={64}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {stops.map(s => (
                    <ReferenceLine key={s.lap} x={s.lap} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 2" />
                  ))}
                  <ReferenceLine x={currentLap} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
                  <Line
                    type="monotone" dataKey="custom" name="Custom"
                    stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 3 }}
                  />
                  <Line
                    type="monotone" dataKey="original" name={`${driverCode} original`}
                    stroke={driver.teamColor} strokeWidth={1.5} dot={false}
                    strokeDasharray="4 2" activeDot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* ── Per-stint summary ── */}
            <div className="csb-section-label" style={{ marginTop: 14 }}>Stint breakdown</div>
            <div className="csb-stint-summary">
              {customStints.map((stint, i) => {
                const tColor = getTyreColor(stint.compound);
                const stintLaps = stint.endLap - stint.startLap + 1;
                const stintTimes = analysis.lapTimeCurve
                  .filter(r => r.lap >= stint.startLap && r.lap <= stint.endLap)
                  .map(r => r.custom);
                const avgTime = stintTimes.length ? stintTimes.reduce((a, b) => a + b, 0) / stintTimes.length : 0;
                const isActive = currentLap >= stint.startLap && currentLap <= stint.endLap;
                return (
                  <div key={stint.id} className={`csb-stint-card ${isActive ? 'active' : ''}`} style={isActive ? { borderColor: tColor } : {}}>
                    <div className="csb-stint-card-top">
                      <span className="csb-stint-card-num">Stint {i + 1}</span>
                      <span className="compound-pill" style={{ background: `${tColor}22`, color: tColor, border: `1px solid ${tColor}` }}>
                        {stint.compound}
                      </span>
                      {isActive && <span className="csb-active-badge">NOW</span>}
                    </div>
                    <div className="csb-stint-card-details">
                      <span>L{stint.startLap}–{stint.endLap}</span>
                      <span>{stintLaps} laps</span>
                      <span>Avg {formatLapTime(avgTime)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
