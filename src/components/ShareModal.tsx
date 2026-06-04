import { useState } from 'react';

interface Props {
  url: string | null;
  onClose: () => void;
  onGenerate: () => void;
}

export default function ShareModal({ url, onClose, onGenerate }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Share this moment</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="modal-desc">Share the current race, lap, and selected drivers — anyone with the link loads exactly this view.</p>
          {url ? (
            <div className="share-url-box">
              <span className="share-url-text">{url.length > 60 ? url.slice(0, 60) + '…' : url}</span>
              <button className={`share-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <button className="share-generate-btn" onClick={onGenerate}>Generate share link</button>
          )}
        </div>
      </div>
    </div>
  );
}
