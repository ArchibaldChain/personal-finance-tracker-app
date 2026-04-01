import React, { useEffect, useState } from 'react';
import { listSources } from '../api/categories';
import { processImport, uploadImport } from '../api/imports';

interface ImportFormProps {
  onSuccess: () => void;
}

export default function ImportForm({ onSuccess }: ImportFormProps) {
  const [sources, setSources] = useState<{ key: string; display_name: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.heading}>Import CSV</h2>

      {status && (
        <div style={status.type === 'success' ? styles.successMsg : styles.errorMsg}>
          {status.message}
        </div>
      )}

      <label style={styles.label}>
        Institution / Source
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          style={styles.input}
          required
        >
          {sources.map((s) => (
            <option key={s.key} value={s.key}>
              {s.display_name}
            </option>
          ))}
        </select>
      </label>

      <label style={styles.label}>
        CSV File
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={styles.fileInput}
          required
        />
      </label>

      <button type="submit" style={styles.btn} disabled={isLoading || !file}>
        {isLoading ? 'Importing…' : 'Import'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    maxWidth: 440,
  },
  heading: { margin: 0, fontSize: 18, fontWeight: 600 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 500 },
  input: {
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
  },
  fileInput: { fontSize: 14, padding: '4px 0' },
  btn: {
    padding: '9px 18px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    alignSelf: 'flex-start',
  },
  successMsg: {
    background: '#f0fdf4',
    color: '#15803d',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 14,
  },
  errorMsg: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 14,
  },
};
