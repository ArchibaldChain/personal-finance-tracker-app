import React from 'react';
import type { Transaction, TransactionFilters } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRowClick: (tx: Transaction) => void;
  filters: TransactionFilters;
  onSort: (field: string) => void;
}

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: 'transaction_date', label: 'Date', sortable: true },
  { key: 'merchant_normalized', label: 'Merchant', sortable: true },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'category', label: 'Category', sortable: false },
  { key: 'source_type', label: 'Source', sortable: false },
  { key: 'description', label: 'Description', sortable: false },
];

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

export default function TransactionTable({
  transactions,
  isLoading,
  onRowClick,
  filters,
  onSort,
}: TransactionTableProps) {
  const SortIndicator = ({ field }: { field: string }) => {
    if (filters.sort_by !== field) return <span style={{ color: '#9ca3af' }}> ↕</span>;
    return <span>{filters.sort_dir === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  if (isLoading) {
    return <div style={styles.empty}>Loading…</div>;
  }

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                style={{
                  ...styles.th,
                  cursor: col.sortable ? 'pointer' : 'default',
                }}
                onClick={() => col.sortable && onSort(col.key)}
              >
                {col.label}
                {col.sortable && <SortIndicator field={col.key} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} style={styles.empty}>
                No transactions found.
              </td>
            </tr>
          ) : (
            transactions.map((tx) => (
              <tr
                key={tx.id}
                style={styles.row}
                onClick={() => onRowClick(tx)}
              >
                <td style={styles.td}>{tx.transaction_date}</td>
                <td style={styles.td}>{tx.merchant_normalized || tx.description || '—'}</td>
                <td
                  style={{
                    ...styles.td,
                    color: tx.amount < 0 ? '#dc2626' : '#16a34a',
                    fontWeight: 500,
                  }}
                >
                  {formatAmount(tx.amount, tx.currency)}
                </td>
                <td style={styles.td}>
                  {tx.category ? (
                    <span style={styles.badge}>{tx.category}</span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                  )}
                </td>
                <td style={styles.td}>
                  <span style={tx.source_type === 'csv' ? styles.csvBadge : styles.manualBadge}>
                    {tx.source_type === 'csv' ? 'CSV' : 'Manual'}
                  </span>
                </td>
                <td style={{ ...styles.td, color: '#6b7280', maxWidth: 240 }}>
                  <span style={styles.truncate}>{tx.description || '—'}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' },
  row: { cursor: 'pointer', transition: 'background 0.1s' },
  empty: { padding: '32px', textAlign: 'center', color: '#6b7280' },
  badge: {
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  csvBadge: {
    background: '#f0fdf4',
    color: '#15803d',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
  },
  manualBadge: {
    background: '#fef9c3',
    color: '#854d0e',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
  },
  truncate: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
