import React from 'react';
import type { Import } from '../types';

interface ImportHistoryTableProps {
  imports: Import[];
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending: { background: '#f3f4f6', color: '#374151' },
  processing: { background: '#fef9c3', color: '#854d0e' },
  processed: { background: '#f0fdf4', color: '#15803d' },
  processed_with_errors: { background: '#fff7ed', color: '#c2410c' },
  failed: { background: '#fee2e2', color: '#991b1b' },
};

export default function ImportHistoryTable({ imports }: ImportHistoryTableProps) {
  if (imports.length === 0) {
    return <p style={{ color: '#6b7280', marginTop: 24 }}>No imports yet.</p>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 24 }}>
      <table style={styles.table}>
        <thead>
          <tr>
            {['File', 'Source', 'Uploaded', 'Status', 'Rows', 'Failed'].map((h) => (
              <th key={h} style={styles.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {imports.map((imp) => (
            <tr key={imp.id}>
              <td style={styles.td}>{imp.file_name}</td>
              <td style={styles.td}>{imp.source_name}</td>
              <td style={styles.td}>{new Date(imp.uploaded_at).toLocaleString()}</td>
              <td style={styles.td}>
                <span style={{ ...styles.badge, ...(STATUS_STYLES[imp.status] ?? {}) }}>
                  {imp.status}
                </span>
              </td>
              <td style={styles.td}>{imp.parsed_rows ?? '—'}</td>
              <td style={{ ...styles.td, color: (imp.failed_rows ?? 0) > 0 ? '#dc2626' : undefined }}>
                {imp.failed_rows ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  badge: { padding: '2px 8px', borderRadius: 12, fontSize: 12 },
};
