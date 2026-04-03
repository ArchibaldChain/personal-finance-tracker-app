import React, { useMemo, useState } from 'react';
import type { Category, Transaction, TransactionFilters } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRowClick: (tx: Transaction) => void;
  filters: TransactionFilters;
  onSort: (field: string) => void;
  sourcesMap: Record<string, string>;
  categories: Category[];
  onCategoryChange: (txId: number, category: string | null, subcategory: string | null) => void;
}

// Tracks the in-progress edit for one row
interface CellEdit {
  txId: number;
  category: string | null;
  subcategory: string | null;
  openStep: 'category' | 'subcategory' | null; // which dropdown is currently open
}

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: 'transaction_date', label: 'Date', sortable: true },
  { key: 'merchant_normalized', label: 'Merchant', sortable: true },
  { key: 'category', label: 'Category', sortable: false },
  { key: 'subcategory', label: 'Subcategory', sortable: false },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'source_type', label: 'Source', sortable: false },
  { key: '_edit', label: '', sortable: false },
];

const CAT_BADGE_COLORS = [
  { bg: '#fef9ec', text: '#92400e' },
  { bg: '#fee2e2', text: '#c0392b' },
  { bg: '#f0fdf4', text: '#5a8a6a' },
  { bg: '#fff7ed', text: '#9a3412' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ecfdf5', text: '#065f46' },
  { bg: '#fef3c7', text: '#78350f' },
  { bg: '#ffe4e6', text: '#9f1239' },
  { bg: '#e0f2fe', text: '#075985' },
  { bg: '#fdf2f8', text: '#86198f' },
];

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function TransactionTable({
  transactions,
  isLoading,
  onRowClick,
  filters,
  onSort,
  sourcesMap,
  categories,
  onCategoryChange,
}: TransactionTableProps) {
  const [cellEdit, setCellEdit] = useState<CellEdit | null>(null);

  const catIconMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.icon ?? ''])),
    [categories]
  );
  const catColorMap = useMemo(
    () => Object.fromEntries(
      categories.map((c, i) => [c.name, CAT_BADGE_COLORS[i % CAT_BADGE_COLORS.length]])
    ),
    [categories]
  );

  function openCategoryDropdown(tx: Transaction, e: React.MouseEvent) {
    e.stopPropagation();
    setCellEdit({ txId: tx.id, category: tx.category, subcategory: tx.subcategory, openStep: 'category' });
  }

  function handleCategorySelect(tx: Transaction, value: string) {
    const cat = value || null;
    const subcats = categories.find((c) => c.name === cat)?.subcategories ?? [];
    setCellEdit({
      txId: tx.id,
      category: cat,
      subcategory: null,
      openStep: subcats.length > 0 ? 'subcategory' : null,
    });
  }

  function handleSubcategorySelect(value: string) {
    if (!cellEdit) return;
    setCellEdit({ ...cellEdit, subcategory: value || null, openStep: null });
  }

  function handleSave() {
    if (!cellEdit) return;
    onCategoryChange(cellEdit.txId, cellEdit.category, cellEdit.subcategory);
    setCellEdit(null);
  }

  function handleCancel() {
    setCellEdit(null);
  }

  const SortIndicator = ({ field }: { field: string }) => {
    if (filters.sort_by !== field) return <span style={{ color: '#c8c4be' }}> ↕</span>;
    return <span style={{ color: '#c9a84c' }}>{filters.sort_dir === 'asc' ? ' ↑' : ' ↓'}</span>;
  };

  if (isLoading) return <div style={styles.empty}>Loading…</div>;

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                style={{ ...styles.th, cursor: col.sortable ? 'pointer' : 'default', width: col.key === '_edit' ? 80 : undefined }}
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
              <td colSpan={COLUMNS.length} style={styles.empty}>No transactions found.</td>
            </tr>
          ) : (
            transactions.map((tx, index) => {
              const isEditing = cellEdit?.txId === tx.id;
              const displayCat = isEditing ? cellEdit.category : tx.category;
              const displaySub = isEditing ? cellEdit.subcategory : tx.subcategory;
              const colors = displayCat ? catColorMap[displayCat] : undefined;
              const icon = displayCat ? catIconMap[displayCat] : '';
              const needsReview =
                !isEditing &&
                tx.classification_confidence !== null &&
                tx.classification_confidence !== undefined &&
                tx.classification_confidence < 0.7;

              const pendingSubcats = isEditing && cellEdit.category
                ? (categories.find((c) => c.name === cellEdit.category)?.subcategories ?? [])
                : [];

              return (
                <tr
                  key={tx.id}
                  style={{ background: index % 2 === 0 ? '#fff' : '#fdf9f3', height: 40 }}
                >
                  <td style={styles.td}>{tx.transaction_date}</td>
                  <td style={styles.td}>{tx.merchant_normalized || tx.description || '—'}</td>

                  {/* Category cell */}
                  <td
                    style={{ ...styles.td, cursor: isEditing ? 'default' : 'pointer' }}
                    onClick={(e) => !isEditing && openCategoryDropdown(tx, e)}
                  >
                    {isEditing && cellEdit.openStep === 'category' ? (
                      <select
                        autoFocus
                        defaultValue={tx.category ?? ''}
                        onChange={(e) => { e.stopPropagation(); handleCategorySelect(tx, e.target.value); }}
                        onBlur={handleCancel}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.inlineSelect}
                      >
                        <option value="">— None —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {displayCat && colors ? (
                          <span style={{ ...styles.categoryBadge, background: colors.bg, color: colors.text }}>
                            {icon && <span style={{ marginRight: 3 }}>{icon}</span>}
                            {displayCat}
                          </span>
                        ) : (
                          <span style={{ color: '#c8c4be' }}>—</span>
                        )}
                        {needsReview && (
                          <span
                            title={`Low confidence: ${Math.round((tx.classification_confidence ?? 0) * 100)}%`}
                            style={styles.warningIcon}
                          >
                            ⚠
                          </span>
                        )}
                      </span>
                    )}
                  </td>

                  {/* Subcategory cell */}
                  <td style={{ ...styles.td, color: '#6b6560', fontSize: 13 }}>
                    {isEditing && cellEdit.openStep === 'subcategory' ? (
                      <select
                        autoFocus
                        defaultValue={tx.subcategory ?? ''}
                        onChange={(e) => { e.stopPropagation(); handleSubcategorySelect(e.target.value); }}
                        onBlur={() => setCellEdit((prev) => prev ? { ...prev, openStep: null } : null)}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.inlineSelect}
                      >
                        <option value="">— None —</option>
                        {pendingSubcats.map((s) => (
                          <option key={s.id} value={s.name}>{s.icon} {s.name}</option>
                        ))}
                      </select>
                    ) : (
                      displaySub || '—'
                    )}
                  </td>

                  <td style={{ ...styles.td, color: tx.amount < 0 ? '#c0392b' : '#5a8a6a', fontWeight: 500, textAlign: 'right' }}>
                    {formatAmount(tx.amount, tx.currency)}
                  </td>

                  <td style={styles.td}>
                    <span style={styles.sourceBadge}>
                      {tx.source_type === 'manual'
                        ? 'Manual'
                        : (tx.source_name && sourcesMap[tx.source_name]) ?? tx.source_name ?? 'CSV'}
                    </span>
                  </td>

                  {/* Edit / Save+Cancel column */}
                  <td style={{ ...styles.td, textAlign: 'center', padding: '6px 8px' }}>
                    {isEditing && cellEdit.openStep === null ? (
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSave(); }}
                          style={styles.saveBtn}
                          title="Save"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                          style={styles.cancelBtn}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRowClick(tx); }}
                        style={styles.editBtn}
                        title="Edit transaction"
                      >
                        <PencilIcon />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { overflowX: 'auto', border: '1px solid #e8e4de', borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    padding: '10px 16px',
    textAlign: 'left',
    background: '#faf8f4',
    borderBottom: '1px solid #e8e4de',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    color: '#6b6560',
    fontSize: 12,
  },
  td: { padding: '10px 16px', borderBottom: '1px solid #f3f0eb', verticalAlign: 'middle' },
  empty: { padding: '32px', textAlign: 'center', color: '#6b6560' },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
    whiteSpace: 'nowrap',
    fontWeight: 500,
  },
  inlineSelect: {
    padding: '3px 6px',
    border: '1px solid #c9a84c',
    borderRadius: 6,
    fontSize: 13,
    color: '#2d2116',
    background: '#fff',
    outline: 'none',
    cursor: 'pointer',
    minWidth: 140,
  },
  warningIcon: {
    color: '#d97706',
    fontSize: 13,
    cursor: 'default',
    lineHeight: 1,
  },
  sourceBadge: {
    background: '#fdf9f3',
    color: '#6b6560',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 12,
  },
  editBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b6560',
    padding: '4px',
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    padding: '3px 10px',
    background: '#c9a84c',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  cancelBtn: {
    padding: '3px 7px',
    background: 'none',
    color: '#6b6560',
    border: '1px solid #e8e4de',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
  },
};
