import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Race } from '../types';
import type { Compound } from '../types';
import { computeDegCurve, getTyreColor } from '../utils/strategyEngine';

interface Props {
  race: Race;
  focusedDriver: string | null;
  currentLap: number;
}

const COMPOUNDS: Compound[] = ['SOFT', 'MEDIUM', 'HARD'];

export default function TyreDegChart({ race, focusedDriver, currentLap }: Props) {
  const driver = race.drivers.find(d => d.code === focusedDriver) ?? race.drivers[0];

  // Actual lap times per compound from driver data
  const actualByCompound: Record<string, Array<{ age: number; actual: number }>> = {};
  driver.laps.forEach(l => {
    if (!actualByCompound[l.compound]) actualByCompound[l.compound] = [];
    actualByCompound[l.compound].push({ age: l.tyreAge, actual: l.lapTime - (driver.laps[0]?.lapTime ?? 90) });
  });

  // Model curves
  const maxAge = 50;
  const modelData = computeDegCurve('SOFT', maxAge).map((_, i) => {
    const age = i + 1;
    const row: Record<string, number> = { age };
    COMPOUNDS.forEach(c => {
      row[`${c}_model`] = computeDegCurve(c, maxAge)[i]?.delta ?? 0;
    });
    return row;
  });

  // Current tyre age of driver
  const curLapData = driver.laps.find(l => l.lap === currentLap);
  const currentTyreAge = curLapData?.tyreAge ?? 1;
  const currentCompound = curLapData?.compound ?? 'MEDIUM';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <div className="tooltip-title">Tyre age: {label} laps</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="tooltip-row" style={{ color: p.color }}>
            <span>{p.name}</span>
            <span>+{Number(p.value).toFixed(3)}s</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="panel tyre-deg-chart">
      <div className="panel-header">
        <span className="panel-title">Tyre Degradation Model</span>
        <span className="panel-sub">
          {driver.code} — Current: <span style={{ color: getTyreColor(currentCompound) }}>
            {currentCompound}
          </span> age {currentTyreAge}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={modelData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="age"
            stroke="#666"
            tick={{ fontSize: 11, fill: '#888' }}
            label={{ value: 'Tyre age (laps)', position: 'insideBottom', offset: -4, fill: '#666', fontSize: 11 }}
          />
          <YAxis
            stroke="#666"
            tick={{ fontSize: 11, fill: '#888' }}
            tickFormatter={v => `+${v.toFixed(1)}s`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(val: string) => val.replace('_model', '')}
          />
          <ReferenceLine
            x={currentTyreAge}
            stroke={getTyreColor(currentCompound)}
            strokeDasharray="4 2"
            label={{ value: 'Now', fill: getTyreColor(currentCompound), fontSize: 11 }}
          />
          {COMPOUNDS.map(c => (
            <Line
              key={c}
              type="monotone"
              dataKey={`${c}_model`}
              name={c}
              stroke={getTyreColor(c)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
