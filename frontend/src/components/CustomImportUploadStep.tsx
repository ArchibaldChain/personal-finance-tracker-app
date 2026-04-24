import React, { useRef } from 'react';
import type { CustomParserConfig } from '../types';

interface Props {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  matchedConfig: CustomParserConfig | null;
  onUseMatch: () => void;
}

export default function CustomImportUploadStep({ onFileSelected, isLoading, matchedConfig, onUseMatch }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelected(f);
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>Upload your CSV</h2>
      <p style={styles.sub}>Drop any bank CSV — we'll help you map the columns.</p>

      {matchedConfig && (
        <div style={styles.matchBanner}>
          <span>Matched saved parser: <strong>{matchedConfig.name}</strong></span>
          <button onClick={onUseMatch} style={styles.useMatchBtn}>Use it →</button>
        </div>
      )}

      <div
        style={{ ...styles.dropzone, borderColor: isDragging ? '#c9a84c' : '#e8e4de', background: isDragging ? '#fef9ec' : '#faf8f4' }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <p style={styles.dropText}>Detecting parser…</p>
        ) : (
          <>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: '#c9a84c' }}>
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="16 8 12 4 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="4" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={styles.dropText}>Drop your CSV here or <span style={{ color: '#c9a84c', fontWeight: 500 }}>click to browse</span></p>
            <p style={styles.dropHint}>Supports .csv files up to 10MB</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 16 },
  heading: { fontSize: 20, fontWeight: 600, color: '#2d2116', margin: 0 },
  sub: { fontSize: 14, color: '#6b6560', margin: 0 },
  matchBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6,
    padding: '10px 14px', fontSize: 14, color: '#2d6a4f',
  },
  useMatchBtn: {
    background: 'none', border: '1px solid #2d6a4f', borderRadius: 4,
    padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: '#2d6a4f', fontWeight: 500,
  },
  dropzone: {
    border: '2px dashed', borderRadius: 8, padding: '48px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  dropText: { margin: 0, fontSize: 15, color: '#6b6560', textAlign: 'center' },
  dropHint: { margin: 0, fontSize: 12, color: '#c8c4be' },
};
