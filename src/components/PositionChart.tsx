import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Race } from '../types';

interface Props {
  race: Race;
  currentLap: number;
  selectedDrivers: string[];
  focusedDriver: string | null;
}

export default function PositionChart({ race, currentLap, selectedDrivers, focusedDriver }: Props) {
  const drivers = race.drivers.filter(d => selectedDrivers.includes(d.code));

  // Build per-lap data rows
  const data = Array.from({ length: currentLap }, (_, i) => {
    const lap = i + 1;
    const row: Record<string, number | string> = { lap };
    drivers.forEach(d => {
      const lapData = d.laps.find(l => l.lap === lap);
      if (lapData) row[d.code] = lapData.position;
    });
    return row;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const sorted = [...payload].sort((a, b) => a.value - b.value);
    return (
      <div className="chart-tooltip">
        <div className="tooltip-title">Lap {label}</div>
        {sorted.map((p: any) => {
          const driver = race.drivers.find(d => d.code === p.dataKey);
          return (
            <div key={p.dataKey} className="tooltip-row" style={{ color: driver?.teamColor ?? p.color }}>
              <span>P{p.value}</span>
              <span>{p.dataKey}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="panel position-chart">
      <div className="panel-header">
        <span className="panel-title">Race Position</span>
        <span className="panel-sub">Lap-by-lap order</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="lap"
            stroke="#666"
            tick={{ fontSize: 11, fill: '#888' }}
            label={{ value: 'Lap', position: 'insideBottom', offset: -4, fill: '#666', fontSize: 11 }}
          />
          <YAxis
            reversed
            domain={[1, 10]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            stroke="#666"
            tick={{ fontSize: 11, fill: '#888' }}
            tickFormatter={v => `P${v}`}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={currentLap} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
          {drivers.map(d => (
            <Line
              key={d.code}
              type="monotone"
              dataKey={d.code}
              stroke={d.teamColor}
              strokeWidth={focusedDriver === d.code ? 2.5 : 1.5}
              dot={false}
              activeDot={{ r: 4, fill: d.teamColor }}
              opacity={focusedDriver && focusedDriver !== d.code ? 0.35 : 1}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
