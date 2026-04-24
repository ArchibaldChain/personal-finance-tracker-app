import React, { useEffect, useRef, useState } from 'react';
import { listSources } from '../api/categories';
import { deleteCustomParser } from '../api/customParsers';
import { processImport, uploadImport } from '../api/imports';
import type { Source } from '../types';

interface ImportFormProps {
  onSuccess: () => void;
  ledgerId?: number;
}

export default function ImportForm({ onSuccess, ledgerId }: ImportFormProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchSources = () => {
    listSources()
      .then((s) => {
        setSources(s);
        setSelectedSource((prev) => {
          if (prev && s.find((src) => src.key === prev)) return prev;
          return s.length > 0 ? s[0].key : '';
        });
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDeleteCustomParser = async (e: React.MouseEvent, key: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete parser "${name}"? Existing transactions imported with it will not be affected.`)) return;
    const id = parseInt(key.replace('custom_', ''), 10);
    try {
      await deleteCustomParser(id);
      if (selectedSource === key) setSelectedSource('');
      fetchSources();
    } catch {
      alert('Failed to delete parser.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedSource) return;
    setIsLoading(true);
    setStatus(null);
    try {
      const importRecord = await uploadImport(file, selectedSource, ledgerId);
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

  const selectedLabel = sources.find((s) => s.key === selectedSource)?.display_name ?? 'Select…';
  const builtinSources = sources.filter((s) => !s.is_custom);
  const customSources = sources.filter((s) => s.is_custom);

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <div style={styles.topRow}>
        <div style={styles.sourceGroup}>
          <label style={styles.label}>Select Bank / Source</label>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsOpen((o) => !o)}
              style={styles.trigger}
            >
              <span>{selectedLabel}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                <path d="M2 4l4 4 4-4" stroke="#6b6560" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isOpen && (
              <div style={styles.menu}>
                {builtinSources.map((s) => (
                  <div
                    key={s.key}
                    style={{ ...styles.menuItem, background: selectedSource === s.key ? '#fef9ec' : undefined }}
                    onClick={() => { setSelectedSource(s.key); setIsOpen(false); }}
                  >
                    {s.display_name}
                  </div>
                ))}

                {customSources.length > 0 && (
                  <>
                    <div style={styles.dividerRow}>
                      <div style={styles.dividerLine} />
                      <span style={styles.dividerLabel}>Custom Sources</span>
                      <div style={styles.dividerLine} />
                    </div>
                    {customSources.map((s) => (
                      <div
                        key={s.key}
                        style={{ ...styles.menuItem, background: selectedSource === s.key ? '#fef9ec' : undefined }}
                        onClick={() => { setSelectedSource(s.key); setIsOpen(false); }}
                      >
                        <span style={{ flex: 1 }}>{s.display_name}</span>
                        <button
                          type="button"
                          style={styles.deleteBtn}
                          onClick={(e) => handleDeleteCustomParser(e, s.key, s.display_name)}
                          title="Delete parser"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
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
  topRow: { display: 'flex', gap: 16, alignItems: 'flex-end' },
  sourceGroup: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, maxWidth: 320 },
  label: { fontSize: 13, fontWeight: 500, color: '#6b6560' },
  trigger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 10px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    fontSize: 14,
    color: '#2d2116',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(45,33,22,0.1)',
    zIndex: 100,
    maxHeight: 260,
    overflowY: 'auto',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    fontSize: 14,
    color: '#2d2116',
    cursor: 'pointer',
    gap: 6,
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e8e4de',
  },
  dividerLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#9b9590',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#c0392b',
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 3,
    flexShrink: 0,
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
  dropText: { margin: 0, fontSize: 15, color: '#6b6560', textAlign: 'center' },
  dropHint: { margin: 0, fontSize: 12, color: '#c8c4be' },
  footer: { display: 'flex', justifyContent: 'flex-end' },
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
