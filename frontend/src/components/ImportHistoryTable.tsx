import React from 'react';
import type { Import } from '../types';

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
  if (imports.length === 0) {
    return <p style={{ color: '#6b6560', marginTop: 24 }}>No imports yet.</p>;
  }

  return (
    <div style={styles.cardWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {['Date Uploaded', 'Source', 'File Name', 'Status', 'Total Rows', 'Parsed', 'Failed', 'Actions'].map((h) => (
              <th key={h} style={styles.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {imports.map((imp) => (
            <tr key={imp.id}>
              <td style={styles.td}>{new Date(imp.uploaded_at).toLocaleString()}</td>
              <td style={styles.td}>{imp.source_name}</td>
              <td style={styles.td}>{imp.file_name}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, ...(STATUS_STYLES[imp.status] ?? {}) }}>
                  {STATUS_LABELS[imp.status] ?? imp.status}
                </span>
              </td>
              <td style={styles.td}>{imp.total_rows ?? '—'}</td>
              <td style={styles.td}>{imp.parsed_rows}</td>
              <td style={{ ...styles.td, color: (imp.failed_rows ?? 0) > 0 ? '#c0392b' : undefined }}>
                {imp.failed_rows ?? 0}
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cardWrapper: {
    overflowX: 'auto',
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '10px 16px',
    textAlign: 'left',
    background: '#faf8f4',
    borderBottom: '1px solid #e8e4de',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    color: '#6b6560',
    fontSize: 12,
  },
  td: { padding: '10px 16px', borderBottom: '1px solid #f3f0eb', color: '#2d2116' },
  badge: { padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500 },
  deleteBtn: {
    padding: '4px 6px',
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#c0392b',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
};
