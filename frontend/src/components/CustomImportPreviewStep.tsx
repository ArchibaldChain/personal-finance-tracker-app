import React, { useState } from 'react';
import type { PreviewRow } from '../types';

interface Props {
  rows: PreviewRow[];
  totalRows: number;
  onSave: (name: string) => Promise<void>;
  onImport: () => Promise<void>;
  isSaving: boolean;
  isImporting: boolean;
  savedConfigName: string | null;
  onBack: () => void;
}

export default function CustomImportPreviewStep({
  rows, totalRows, onSave, onImport,
  isSaving, isImporting, savedConfigName, onBack,
}: Props) {
  const [parserName, setParserName] = useState(savedConfigName ?? '');
  const successRows = rows.filter((r) => r.parsed !== null);
  const failedRows = rows.filter((r) => r.error !== null);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>← Back</button>
        <div style={styles.stats}>
          Showing {rows.length} of {totalRows} rows
          {failedRows.length > 0 && (
            <span style={styles.failBadge}>{failedRows.length} failed</span>
          )}
          {successRows.length > 0 && (
            <span style={styles.okBadge}>{successRows.length} ok</span>
          )}
        </div>
      </div>

      {/* Preview table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Description</th>
              <th style={styles.th}>Merchant</th>
              <th style={styles.th}>Currency</th>
              <th style={styles.th}>Notes</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.row_index} style={row.error ? styles.errorRow : undefined}>
                <td style={styles.td}>{row.row_index + 1}</td>
                {row.parsed ? (
                  <>
                    <td style={styles.td}>{row.parsed.transaction_date}</td>
                    <td style={{ ...styles.td, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: parseFloat(row.parsed.amount ?? '0') < 0 ? '#c0392b' : '#2d6a4f' }}>
                        {row.parsed.amount}
                      </span>
                    </td>
                    <td style={styles.td}>{row.parsed.description}</td>
                    <td style={styles.td}>{row.parsed.merchant_raw ?? '—'}</td>
                    <td style={styles.td}>{row.parsed.currency}</td>
                    <td style={styles.td}>{row.parsed.notes ?? '—'}</td>
                    <td style={styles.td}><span style={styles.okBadge}>ok</span></td>
                  </>
                ) : (
                  <>
                    <td colSpan={6} style={{ ...styles.td, color: '#c0392b', fontSize: 12 }}>{row.error}</td>
                    <td style={styles.td}><span style={styles.failBadge}>fail</span></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save + Import */}
      <div style={styles.savePanel}>
        <div style={styles.saveRow}>
          <div style={styles.saveField}>
            <label style={styles.label}>Save parser for future reuse</label>
            <input
              type="text"
              placeholder="e.g. My Credit Union Visa"
              value={parserName}
              onChange={(e) => setParserName(e.target.value)}
              style={styles.nameInput}
              disabled={savedConfigName !== null}
            />
          </div>
          <button
            onClick={() => onSave(parserName)}
            style={styles.saveBtn}
            disabled={isSaving || !parserName.trim() || savedConfigName !== null}
          >
            {savedConfigName ? '✓ Saved' : isSaving ? 'Saving…' : 'Save Parser'}
          </button>
        </div>

        {savedConfigName === null && (
          <p style={styles.saveHint}>You must save the parser before importing.</p>
        )}

        <button
          onClick={onImport}
          style={styles.importBtn}
          disabled={isImporting || savedConfigName === null}
        >
          {isImporting ? 'Importing…' : `Import ${totalRows} rows`}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: {
    background: 'none', border: '1px solid #e8e4de', borderRadius: 4,
    padding: '5px 12px', cursor: 'pointer', fontSize: 13, color: '#6b6560',
  },
  stats: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b6560' },
  okBadge: {
    background: '#f0fdf4', color: '#2d6a4f', border: '1px solid #bbf7d0',
    borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600,
  },
  failBadge: {
    background: '#fee2e2', color: '#c0392b', border: '1px solid #fca5a5',
    borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600,
  },
  tableWrap: { overflowX: 'auto', border: '1px solid #e8e4de', borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left', padding: '8px 10px', background: '#faf8f4',
    fontSize: 12, fontWeight: 500, color: '#6b6560', borderBottom: '1px solid #e8e4de',
    whiteSpace: 'nowrap',
  },
  td: { padding: '7px 10px', borderBottom: '1px solid #f0ede8', color: '#2d2116' },
  errorRow: { background: '#fff8f8' },
  savePanel: {
    background: '#faf8f4', border: '1px solid #e8e4de', borderRadius: 6,
    padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
  },
  saveRow: { display: 'flex', alignItems: 'flex-end', gap: 12 },
  saveField: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 12, fontWeight: 500, color: '#6b6560' },
  nameInput: {
    padding: '8px 10px', border: '1px solid #e8e4de', borderRadius: 6,
    fontSize: 14, color: '#2d2116', flex: 1,
  },
  saveBtn: {
    padding: '9px 18px', background: '#fff', border: '1px solid #c9a84c',
    borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#c9a84c', fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  saveHint: { fontSize: 12, color: '#9b9590', margin: 0 },
  importBtn: {
    padding: '10px 28px', background: '#c9a84c', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
    alignSelf: 'flex-end',
  },
};
