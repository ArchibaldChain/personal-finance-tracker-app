import React from 'react';
import type { CustomParserConfig } from '../types';

interface Props {
  configs: CustomParserConfig[];
  onDelete: (id: number) => void;
}

export default function CustomParserListTable({ configs, onDelete }: Props) {
  if (configs.length === 0) {
    return <p style={{ color: '#6b6560', marginTop: 8, fontSize: 14 }}>No saved custom parsers yet.</p>;
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {['Name', 'Account Type', 'Currency', 'Date Format', 'Skip Rows', ''].map((h) => (
              <th key={h} style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {configs.map((c) => (
            <tr key={c.id}>
              <td style={styles.td}>{c.name}</td>
              <td style={styles.td}>{c.account_type}</td>
              <td style={styles.td}>{c.currency}</td>
              <td style={styles.td}><code style={styles.code}>{c.date_format}</code></td>
              <td style={styles.td}>{c.skip_rows}</td>
              <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                <button
                  style={styles.deleteBtn}
                  onClick={() => {
                    if (confirm(`Delete parser "${c.name}"? Existing transactions imported with it will not be affected.`)) {
                      onDelete(c.id);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
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
  tableWrap: { overflowX: 'auto', background: '#fff', border: '1px solid #e8e4de', borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '9px 14px', textAlign: 'left', background: '#faf8f4',
    borderBottom: '1px solid #e8e4de', fontWeight: 600, fontSize: 12,
    color: '#6b6560', whiteSpace: 'nowrap',
  },
  td: { padding: '9px 14px', borderBottom: '1px solid #f3f0eb', color: '#2d2116' },
  code: { fontSize: 12, background: '#f5f1eb', padding: '2px 6px', borderRadius: 3 },
  deleteBtn: {
    padding: '4px 6px', background: 'transparent', border: 'none',
    borderRadius: 4, cursor: 'pointer', color: '#c0392b',
    display: 'inline-flex', alignItems: 'center',
  },
};
