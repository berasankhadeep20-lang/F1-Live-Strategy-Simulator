interface Props { onClose: () => void; }

export default function KeyboardShortcutsHelp({ onClose }: Props) {
  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause' },
    { key: '← →', desc: 'Step 1 lap' },
    { key: 'Shift + ← →', desc: 'Jump 5 laps' },
    { key: 'R', desc: 'Reset to lap 1' },
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Keyboard shortcuts</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {shortcuts.map(s => (
            <div key={s.key} className="shortcut-row">
              <kbd className="kbd">{s.key}</kbd>
              <span className="shortcut-desc">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
