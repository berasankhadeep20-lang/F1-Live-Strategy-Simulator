import { useState } from 'react';
import type { Race } from '../types';
import { computeUndercutAnalysis, formatLapTime, getTyreColor } from '../utils/strategyEngine';

interface Props {
  race: Race;
  currentLap: number;
  focusedDriver: string | null;
}

export default function UndercutAnalyzer({ race, currentLap, focusedDriver }: Props) {
  const [attacker, setAttacker] = useState(focusedDriver ?? race.drivers[1]?.code ?? '');
  const [defender, setDefender] = useState(race.drivers[0]?.code ?? '');

  const analysis = attacker && defender && attacker !== defender
    ? computeUndercutAnalysis(race, attacker, defender, currentLap)
    : null;

  const prob = analysis?.successProbability ?? 0;
  const probPct = (prob * 100).toFixed(0);
  const probColor = prob > 0.6 ? '#4CAF50' : prob > 0.35 ? '#FF9800' : '#f44336';

  const attackerDriver = race.drivers.find(d => d.code === attacker);
  const defenderDriver = race.drivers.find(d => d.code === defender);
  const aLap = attackerDriver?.laps.find(l => l.lap === currentLap);
  const dLap = defenderDriver?.laps.find(l => l.lap === currentLap);

  return (
    <div className="panel undercut-analyzer">
      <div className="panel-header">
        <span className="panel-title">Undercut Analyzer</span>
        <span className="panel-sub">Real-time strategy decision</span>
      </div>

      <div className="uca-selectors">
        <div className="uca-selector-group">
          <label>Attacker (pits)</label>
          <select
            value={attacker}
            onChange={e => setAttacker(e.target.value)}
            style={{ borderColor: attackerDriver?.teamColor }}
          >
            {race.drivers.map(d => (
              <option key={d.code} value={d.code}>{d.code} — {d.team.split(' ')[0]}</option>
            ))}
          </select>
        </div>
        <div className="uca-vs">VS</div>
        <div className="uca-selector-group">
          <label>Defender (stays out)</label>
          <select
            value={defender}
            onChange={e => setDefender(e.target.value)}
            style={{ borderColor: defenderDriver?.teamColor }}
          >
            {race.drivers.map(d => (
              <option key={d.code} value={d.code}>{d.code} — {d.team.split(' ')[0]}</option>
            ))}
          </select>
        </div>
      </div>

      {analysis ? (
        <div className="uca-result">
          {/* Big probability gauge */}
          <div className="prob-gauge">
            <svg viewBox="0 0 120 70" width="160" height="90">
              <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" strokeLinecap="round"/>
              <path
                d="M10 60 A50 50 0 0 1 110 60"
                fill="none"
                stroke={probColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${prob * 157} 157`}
              />
              <text x="60" y="55" textAnchor="middle" fill={probColor} fontSize="22" fontWeight="700">{probPct}%</text>
              <text x="60" y="68" textAnchor="middle" fill="#666" fontSize="9">UNDERCUT SUCCESS</text>
            </svg>
          </div>

          <div className="uca-stats">
            <div className="uca-stat">
              <span className="uca-stat-label">Current gap</span>
              <span className="uca-stat-value">{analysis.currentGap.toFixed(3)}s</span>
            </div>
            <div className="uca-stat">
              <span className="uca-stat-label">Pit loss time</span>
              <span className="uca-stat-value">{analysis.pitLossTime.toFixed(0)}s</span>
            </div>
            <div className="uca-stat">
              <span className="uca-stat-label">Pace gain/lap</span>
              <span className="uca-stat-value" style={{ color: analysis.degDelta > 0 ? '#4CAF50' : '#f44336' }}>
                {analysis.degDelta > 0 ? '+' : ''}{analysis.estimatedGainPerLap.toFixed(3)}s
              </span>
            </div>
            <div className="uca-stat">
              <span className="uca-stat-label">Rec. stop lap</span>
              <span className="uca-stat-value highlight">L{analysis.recommendedLap}</span>
            </div>
          </div>

          <div className="uca-compounds">
            {aLap && (
              <div className="uca-comp-row">
                <span style={{ color: attackerDriver?.teamColor }}>{attacker}</span>
                <span className="compound-pill" style={{
                  background: `${getTyreColor(aLap.compound)}22`,
                  color: getTyreColor(aLap.compound),
                  border: `1px solid ${getTyreColor(aLap.compound)}`
                }}>
                  {aLap.compound} age {aLap.tyreAge}
                </span>
                <span className="lap-time-small">{formatLapTime(aLap.lapTime)}</span>
              </div>
            )}
            {dLap && (
              <div className="uca-comp-row">
                <span style={{ color: defenderDriver?.teamColor }}>{defender}</span>
                <span className="compound-pill" style={{
                  background: `${getTyreColor(dLap.compound)}22`,
                  color: getTyreColor(dLap.compound),
                  border: `1px solid ${getTyreColor(dLap.compound)}`
                }}>
                  {dLap.compound} age {dLap.tyreAge}
                </span>
                <span className="lap-time-small">{formatLapTime(dLap.lapTime)}</span>
              </div>
            )}
          </div>

          <div className="uca-verdict" style={{ borderColor: probColor, color: probColor }}>
            {prob > 0.6
              ? '✓ Undercut recommended — high deg advantage'
              : prob > 0.35
              ? '⚠ Borderline — consider traffic and VSC risk'
              : '✗ Overcut preferred — stay out for track position'}
          </div>
        </div>
      ) : (
        <div className="uca-empty">Select different drivers to analyze</div>
      )}
    </div>
  );
}
