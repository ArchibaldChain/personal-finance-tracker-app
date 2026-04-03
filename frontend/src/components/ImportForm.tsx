import React, { useEffect, useRef, useState } from 'react';
import { listSources } from '../api/categories';
import { processImport, uploadImport } from '../api/imports';

interface ImportFormProps {
  onSuccess: () => void;
}

export default function ImportForm({ onSuccess }: ImportFormProps) {
  const [sources, setSources] = useState<{ key: string; display_name: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSources()
      .then((s) => {
        setSources(s);
        if (s.length > 0) setSelectedSource(s[0].key);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedSource) return;
    setIsLoading(true);
    setStatus(null);
    try {
      const importRecord = await uploadImport(file, selectedSource);
      const processed = await processImport(importRecord.id);
      setStatus({
        type: 'success',
        message: `Import complete: ${processed.parsed_rows} rows imported${
          processed.failed_rows > 0 ? `, ${processed.failed_rows} failed` : ''
        }.`,
      });
      setFile(null);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Import failed. Check the file format and try again.';
      setStatus({ type: 'error', message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <div style={styles.topRow}>
        <div style={styles.sourceGroup}>
          <label style={styles.label}>Select Bank / Source</label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            style={styles.select}
            required
          >
            {sources.map((s) => (
              <option key={s.key} value={s.key}>
                {s.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status && (
        <div style={status.type === 'success' ? styles.successMsg : styles.errorMsg}>
          {status.message}
        </div>
      )}

      <div
        style={{
          ...styles.dropzone,
          borderColor: isDragging ? '#c9a84c' : '#e8e4de',
          background: isDragging ? '#fef9ec' : '#faf8f4',
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: '#c9a84c' }}>
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="16 8 12 4 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="4" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={styles.dropText}>
          {file ? (
            <span style={{ color: '#2d2116', fontWeight: 600 }}>{file.name}</span>
          ) : (
            <>Drop your CSV here or <span style={{ color: '#c9a84c', fontWeight: 500 }}>click to browse</span></>
          )}
        </p>
        <p style={styles.dropHint}>Supports .csv files up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />
      </div>

      <div style={styles.footer}>
        <button type="submit" style={styles.importBtn} disabled={isLoading || !file}>
          {isLoading ? 'Importing…' : 'Import'}
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    padding: 24,
    boxShadow: '0 1px 4px rgba(45,33,22,0.06)',
  },
  topRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-end',
  },
  sourceGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    maxWidth: 320,
  },
  label: { fontSize: 13, fontWeight: 500, color: '#6b6560' },
  select: {
    padding: '8px 10px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    fontSize: 14,
    color: '#2d2116',
    background: '#fff',
    outline: 'none',
  },
  dropzone: {
    border: '2px dashed',
    borderRadius: 8,
    padding: '40px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  dropText: {
    margin: 0,
    fontSize: 15,
    color: '#6b6560',
    textAlign: 'center',
  },
  dropHint: {
    margin: 0,
    fontSize: 12,
    color: '#c8c4be',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  importBtn: {
    padding: '9px 24px',
    background: '#c9a84c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
  successMsg: {
    background: '#f0fdf4',
    color: '#5a8a6a',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 14,
    border: '1px solid #bbf7d0',
  },
  errorMsg: {
    background: '#fee2e2',
    color: '#c0392b',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 14,
    border: '1px solid #fca5a5',
  },
};
