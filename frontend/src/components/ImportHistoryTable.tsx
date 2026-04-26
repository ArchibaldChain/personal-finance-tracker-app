import React, { useState } from 'react';
import { getFailedRows } from '../api/imports';
import type { FailedRow, Import } from '../types';

interface ImportHistoryTableProps {
  imports: Import[];
  onDelete: (id: number) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  processed: 'Success',
  processed_with_errors: 'Partial',
  failed: 'Failed',
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending: { background: '#f5f0e8', color: '#6b6560' },
  processing: { background: '#fef9c3', color: '#92400e' },
  processed: { background: '#f0fdf4', color: '#5a8a6a' },
  processed_with_errors: { background: '#fef9c3', color: '#92400e' },
  failed: { background: '#fee2e2', color: '#c0392b' },
};

export default function ImportHistoryTable({ imports, onDelete }: ImportHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [failedRows, setFailedRows] = useState<Record<number, FailedRow[]>>({});
  const [loading, setLoading] = useState<number | null>(null);

  const handleToggleFailed = async (imp: Import) => {
    if (expandedId === imp.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(imp.id);
    if (!failedRows[imp.id]) {
      setLoading(imp.id);
      try {
        const rows = await getFailedRows(imp.id);
        setFailedRows((prev) => ({ ...prev, [imp.id]: rows }));
      } finally {
        setLoading(null);
      }
    }
  };

  if (imports.length === 0) {
    return <p style={{ color: '#6b6560', marginTop: 24 }}>No imports yet.</p>;
  }

  const COLS = ['Date Uploaded', 'Source', 'File Name', 'Status', 'Total Rows', 'Parsed', 'Failed', 'Actions'];

  return (
    <div style={styles.cardWrapper}>
      <table style={styles.table}>
        <colgroup>
          <col style={{ width: 160 }} />{/* Date */}
          <col style={{ width: 130 }} />{/* Source */}
          <col style={{ width: 160 }} />{/* File Name */}
          <col style={{ width: 80 }} />{/* Status */}
          <col style={{ width: 84 }} />{/* Total Rows */}
          <col style={{ width: 68 }} />{/* Parsed */}
          <col style={{ width: 68 }} />{/* Failed */}
          <col style={{ width: 60 }} />{/* Actions */}
        </colgroup>
        <thead>
          <tr>
            {COLS.map((h) => <th key={h} style={styles.th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {imports.map((imp) => {
            const rows = failedRows[imp.id];
            const isExpanded = expandedId === imp.id;
            const colCount = COLS.length;
            const rawCols = rows && rows.length > 0 ? Object.keys(rows[0].raw_data) : [];

            return (
              <React.Fragment key={imp.id}>
                <tr>
                  <td style={styles.td}>{new Date(imp.uploaded_at.endsWith('Z') ? imp.uploaded_at : imp.uploaded_at + 'Z').toLocaleString()}</td>
                  <td style={styles.td}>{imp.source_display_name || imp.source_name}</td>
                  <td style={styles.td} title={imp.file_name}>{imp.file_name}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...(STATUS_STYLES[imp.status] ?? {}) }}>
                      {STATUS_LABELS[imp.status] ?? imp.status}
                    </span>
                  </td>
                  <td style={styles.td}>{imp.total_rows ?? '—'}</td>
                  <td style={styles.td}>{imp.parsed_rows}</td>
                  <td style={styles.td}>
                    {(imp.failed_rows ?? 0) > 0 ? (
                      <button
                        style={styles.failedBtn}
                        onClick={() => handleToggleFailed(imp)}
                        title="View failed rows"
                      >
                        {imp.failed_rows}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 4, transform: isExpanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
                          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : (
                      <span style={{ color: '#9b9590' }}>0</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.deleteBtn}
                      title="Delete import and all its transactions"
                      onClick={() => {
                        if (confirm(`Delete "${imp.file_name}" and all its transactions?`)) {
                          onDelete(imp.id);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={colCount} style={styles.expandedCell}>
                      {loading === imp.id ? (
                        <p style={styles.loadingText}>Loading failed rows…</p>
                      ) : rows && rows.length > 0 ? (
                        <div style={styles.failedPanel}>
                          <p style={styles.panelTitle}>{rows.length} failed row{rows.length !== 1 ? 's' : ''}</p>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={styles.innerTable}>
                              <thead>
                                <tr>
                                  <th style={styles.innerTh}>#</th>
                                  {rawCols.map((c) => <th key={c} style={styles.innerTh}>{c}</th>)}
                                  <th style={styles.innerTh}>Error</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r) => (
                                  <tr key={r.row_index}>
                                    <td style={styles.innerTd}>{r.row_index + 1}</td>
                                    {rawCols.map((c) => (
                                      <td key={c} style={styles.innerTd}>{r.raw_data[c] ?? '—'}</td>
                                    ))}
                                    <td style={{ ...styles.innerTd, color: '#c0392b' }}>{r.error}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p style={styles.loadingText}>No failed rows found.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cardWrapper: { overflowX: 'auto', background: '#fff', border: '1px solid #e8e4de', borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14, tableLayout: 'fixed' },
  th: {
    padding: '10px 16px', textAlign: 'left', background: '#faf8f4',
    borderBottom: '1px solid #e8e4de', fontWeight: 600, whiteSpace: 'nowrap',
    color: '#6b6560', fontSize: 12,
  },
  td: { padding: '10px 16px', borderBottom: '1px solid #f3f0eb', color: '#2d2116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500 },
  failedBtn: {
    display: 'inline-flex', alignItems: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#c0392b', fontWeight: 600, fontSize: 14, padding: 0,
  },
  deleteBtn: {
    padding: '4px 6px', border: 'none', borderRadius: 4,
    background: 'transparent', color: '#c0392b', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center',
  },
  expandedCell: { padding: 0, borderBottom: '1px solid #f3f0eb' },
  failedPanel: { background: '#fff8f8', padding: '14px 16px', borderTop: '1px solid #fca5a5' },
  panelTitle: { margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: '#c0392b' },
  loadingText: { margin: 0, padding: '10px 16px', fontSize: 13, color: '#9b9590' },
  innerTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  innerTh: {
    padding: '5px 10px', textAlign: 'left', background: '#fee2e2',
    borderBottom: '1px solid #fca5a5', fontWeight: 600, color: '#6b6560',
    whiteSpace: 'nowrap',
  },
  innerTd: { padding: '5px 10px', borderBottom: '1px solid #fde8e8', color: '#2d2116' },
};
