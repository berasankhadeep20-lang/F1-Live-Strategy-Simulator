interface Props {
  currentLap: number;
  totalLaps: number;
  isPlaying: boolean;
  speed: number;
  theme: 'dark' | 'light';
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetLap: (lap: number) => void;
  onSetSpeed: (speed: number) => void;
  onToggleTheme: () => void;
  onShare: () => void;
  onKeyboardHelp: () => void;
}

export default function PlaybackControls({
  currentLap, totalLaps, isPlaying, speed, theme,
  onPlay, onPause, onReset, onSetLap, onSetSpeed, onToggleTheme, onShare, onKeyboardHelp,
}: Props) {
  const progress = ((currentLap - 1) / Math.max(1, totalLaps - 1)) * 100;
  const speeds = [1, 2, 4];

  return (
    <div className="playback-controls">
      <div className="playback-top">
        <div className="playback-buttons">
          <button className="ctrl-btn" onClick={onReset} title="Reset (R)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.67"/>
            </svg>
          </button>
          <button
            className={`ctrl-btn play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={isPlaying ? onPause : onPlay}
            disabled={currentLap >= totalLaps}
            title="Play / Pause (Space)"
          >
            {isPlaying
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            }
          </button>
          <div className="speed-buttons">
            {speeds.map(s => (
              <button key={s} className={`speed-btn ${speed === s ? 'active' : ''}`} onClick={() => onSetSpeed(s)}>{s}×</button>
            ))}
          </div>
        </div>

        <div className="lap-counter">
          <span className="lap-label">LAP</span>
          <span className="lap-num">{currentLap}</span>
          <span className="lap-total">/ {totalLaps}</span>
        </div>

        <div className="playback-actions">
          <button className="ctrl-btn" onClick={onShare} title="Share this moment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
          <button className="ctrl-btn" onClick={onKeyboardHelp} title="Keyboard shortcuts">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="13" rx="2"/>
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
            </svg>
          </button>
          <button className="ctrl-btn theme-btn" onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="scrubber-wrap">
        <input
          type="range" min={1} max={totalLaps} value={currentLap}
          onChange={e => onSetLap(Number(e.target.value))}
          className="scrubber"
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
          title="Scrub laps (← → arrow keys)"
        />
        <div className="scrubber-ticks">
          {Array.from({ length: Math.min(10, totalLaps) }, (_, i) => {
            const lap = Math.round(1 + (i / 9) * (totalLaps - 1));
            return <span key={i} className="tick">{lap}</span>;
          })}
        </div>
      </div>
    </div>
  );
}
