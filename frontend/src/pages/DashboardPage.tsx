import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { listTransactions, updateTransaction } from '../api/transactions';
import CategoryIcon from '../components/CategoryIcon';
import EditTransactionModal from '../components/EditTransactionModal';
import IconSelect from '../components/IconSelect';
import MonthPicker, { MonthValue } from '../components/MonthPicker';
import { useApp } from '../context/AppContext';
import { useCategories } from '../hooks/useCategories';
import { useIsMobile } from '../hooks/useIsMobile';
import { useSources } from '../hooks/useSources';
import type { Category, Transaction } from '../types';

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

interface CellEdit {
  txId: number;
  category: string | null;
  subcategory: string | null;
  openStep: 'category' | 'subcategory' | null;
}

const WARM_COLORS = [
  '#c9a84c', '#c0392b', '#5a8a6a', '#d97706', '#8b6a8a',
  '#3a7a8a', '#b05a30', '#6a8a3a', '#7a5a8a', '#8a6a3a',
  '#3a5a8a', '#8a3a5a',
];

const SECTIONS: { label: string; accent: string; filter: (tx: Transaction) => boolean }[] = [
  {
    label: 'Expenses',
    accent: '#c0392b',
    filter: (tx) => tx.transaction_type === 'expense',
  },
  {
    label: 'Transfers',
    accent: '#3a7a8a',
    filter: (tx) => tx.transaction_type === 'transfer',
  },
  {
    label: 'Income',
    accent: '#5a8a6a',
    filter: (tx) => tx.transaction_type === 'income',
  },
];

function getPrevMonth(): MonthValue {
  const now = new Date();
  const m = now.getMonth();
  return m === 0
    ? { year: now.getFullYear() - 1, month: 12 }
    : { year: now.getFullYear(), month: m };
}

function monthToRange(m: MonthValue) {
  const from = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
  const lastDay = new Date(m.year, m.month, 0).getDate();
  const to = `${m.year}-${String(m.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ── Shared editable transaction table ──
interface TxDetailTableProps {
  txs: Transaction[];
  showDate?: boolean;
  cellEdit: CellEdit | null;
  setCellEdit: React.Dispatch<React.SetStateAction<CellEdit | null>>;
  categories: Category[];
  catMap: Record<string, Category>;
  catIconMap: Record<string, string>;
  catColorMap: Record<string, { bg: string; text: string }>;
  onSave: () => void;
  onEditTx: (tx: Transaction) => void;
  excludedTxIds: Set<number>;
  setExcludedTxIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  sourcesMap: Record<string, string>;
  numbersHidden: boolean;
}

function TxDetailTable({
  txs, showDate, cellEdit, setCellEdit, categories, catMap, catIconMap, catColorMap, onSave, onEditTx,
  excludedTxIds, setExcludedTxIds, sourcesMap, numbersHidden,
}: TxDetailTableProps) {
  function openCategoryEdit(tx: Transaction, e: React.MouseEvent) {
    e.stopPropagation();
    setCellEdit((prev) =>
      prev?.txId === tx.id
        ? { ...prev, openStep: 'category' }
        : { txId: tx.id, category: tx.category, subcategory: tx.subcategory, openStep: 'category' }
    );
  }

  function handleCategorySelect(tx: Transaction, value: string) {
    const cat = value || null;
    const subcats = cat ? (catMap[cat]?.subcategories ?? []) : [];
    setCellEdit({ txId: tx.id, category: cat, subcategory: null, openStep: subcats.length > 0 ? 'subcategory' : null });
  }

  function handleSubcategorySelect(value: string) {
    setCellEdit((prev) => prev ? { ...prev, subcategory: value || null, openStep: null } : null);
  }

  function toggleTx(id: number) {
    setExcludedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const allChecked = txs.length > 0 && txs.every((tx) => !excludedTxIds.has(tx.id));
  const someChecked = txs.some((tx) => !excludedTxIds.has(tx.id));

  function toggleAll(checked: boolean) {
    setExcludedTxIds((prev) => {
      const next = new Set(prev);
      if (checked) txs.forEach((tx) => next.delete(tx.id));
      else txs.forEach((tx) => next.add(tx.id));
      return next;
    });
  }

  const COL_COUNT = 7; // checkbox + desc + cat + subcat + source + amount + actions
  const headers = ['', 'Description', 'Category', 'Subcategory', 'Source', 'Amount', ''];

  const [collapsedDates, setCollapsedDates] = React.useState<Set<string>>(new Set());

  function toggleDate(date: string) {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  // Group by date when showing full month
  const groups: { date: string; txs: Transaction[] }[] = showDate
    ? Object.entries(
        txs.reduce((acc, tx) => {
          (acc[tx.transaction_date] ??= []).push(tx);
          return acc;
        }, {} as Record<string, Transaction[]>)
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, group]) => ({ date, txs: group }))
    : [{ date: '', txs }];

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  }

  function groupTotal(group: Transaction[]) {
    const sum = group.reduce((s, tx) => s + Number(tx.amount), 0);
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(sum));
    return `${sum < 0 ? '-' : '+'}${fmt}`;
  }

  return (
    <div className="table-scroll">
    <table style={detailStyles.table}>
      <thead>
        <tr>
          <th style={{ ...detailStyles.th, width: 36, padding: '8px 8px 8px 16px' }}>
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
              onChange={(e) => toggleAll(e.target.checked)}
            />
          </th>
          {headers.slice(1).map((h) => <th key={h} style={detailStyles.th}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {groups.map(({ date, txs: groupTxs }) => {
          const collapsed = collapsedDates.has(date);
          return (
          <React.Fragment key={date || 'all'}>
            {showDate && (
              <tr>
                <td colSpan={COL_COUNT} style={detailStyles.dateSep}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" onClick={() => toggleDate(date)} style={detailStyles.dayToggle}>
                      <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>▶</span>
                    </button>
                    <span style={detailStyles.dateSepDate}>{formatDate(date).date}</span>
                    <span style={detailStyles.dateSepDay}>{formatDate(date).day}</span>
                    <span style={detailStyles.dateSepTotal}>{numbersHidden ? '••••' : groupTotal(groupTxs)}</span>
                  </div>
                </td>
              </tr>
            )}
            {!collapsed && groupTxs.map((tx) => {
          const isEditing = cellEdit?.txId === tx.id;
          const displayCat = isEditing ? cellEdit.category : tx.category;
          const displaySub = isEditing ? cellEdit.subcategory : tx.subcategory;
          const pendingSubcats = isEditing && cellEdit.category ? (catMap[cellEdit.category]?.subcategories ?? []) : [];
          const excluded = excludedTxIds.has(tx.id);
          return (
            <tr key={tx.id} style={{ opacity: excluded ? 0.4 : 1 }}>
              {/* Checkbox */}
              <td style={{ ...detailStyles.td, width: 36, padding: '0 8px 0 16px' }}>
                <input
                  type="checkbox"
                  checked={!excluded}
                  onChange={() => toggleTx(tx.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>

              <td style={detailStyles.td}>{tx.description || tx.merchant_normalized || '—'}</td>

              {/* Category */}
              <td style={{ ...detailStyles.td, cursor: 'pointer' }} onClick={(e) => openCategoryEdit(tx, e)}>
                {isEditing && cellEdit.openStep === 'category' ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <IconSelect
                      value={cellEdit.category ?? ''}
                      options={categories.filter((c) => !c.transaction_type || c.transaction_type === tx.transaction_type).map((c) => ({ value: c.name, label: c.name, icon: c.icon }))}
                      onChange={(val) => handleCategorySelect(tx, val)}
                      onClose={() => setCellEdit((prev) => prev?.openStep === 'category' ? { ...prev, openStep: null } : prev)}
                      initialOpen
                      portal
                      style={{ minWidth: 140 }}
                    />
                  </div>
                ) : displayCat && catColorMap[displayCat] ? (
                  <span style={{ ...detailStyles.catBadge, background: catColorMap[displayCat].bg, color: catColorMap[displayCat].text }}>
                    <CategoryIcon name={catIconMap[displayCat]} size={12} color={catColorMap[displayCat].text} />
                    {displayCat}
                  </span>
                ) : (
                  <span style={{ color: '#c8c4be' }}>—</span>
                )}
              </td>

              {/* Subcategory */}
              <td
                style={{ ...detailStyles.td, color: '#6b6560', cursor: isEditing && pendingSubcats.length > 0 ? 'pointer' : 'default' }}
                onClick={(e) => { if (isEditing && pendingSubcats.length > 0) { e.stopPropagation(); setCellEdit((prev) => prev ? { ...prev, openStep: 'subcategory' } : null); } }}
              >
                {isEditing && cellEdit.openStep === 'subcategory' ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <IconSelect
                      value={cellEdit.subcategory ?? ''}
                      options={pendingSubcats.map((s) => ({ value: s.name, label: s.name, icon: s.icon }))}
                      onChange={(val) => handleSubcategorySelect(val)}
                      onClose={() => setCellEdit((prev) => prev ? { ...prev, openStep: null } : null)}
                      initialOpen
                      portal
                      style={{ minWidth: 140 }}
                    />
                  </div>
                ) : (
                  displaySub || '—'
                )}
              </td>

              {/* Source */}
              <td style={detailStyles.td}>
                <span style={detailStyles.sourceBadge}>
                  {tx.source_type === 'manual' ? 'Manual' : (sourcesMap[tx.source_name ?? ''] ?? tx.source_name ?? 'CSV')}
                </span>
              </td>

              {/* Amount */}
              <td style={{ ...detailStyles.td, color: tx.amount > 0 ? '#5a8a6a' : '#c0392b', fontWeight: 500, textAlign: 'right' }}>
                {numbersHidden ? '••••' : `${tx.amount > 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}`}
              </td>

              {/* Actions */}
              <td style={{ ...detailStyles.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {isEditing && cellEdit.openStep !== 'category' ? (
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <button type="button" onClick={onSave} style={detailStyles.saveBtn} title="Save">✓</button>
                    <button type="button" onClick={() => setCellEdit(null)} style={detailStyles.cancelBtn} title="Cancel">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={(e) => { e.stopPropagation(); onEditTx(tx); }} style={detailStyles.editBtn} title="Edit transaction">
                    <PencilIcon />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
          </React.Fragment>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

const detailStyles: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 16px', textAlign: 'left', background: '#faf8f4', borderBottom: '1px solid #e8e4de', fontWeight: 600, color: '#6b6560', fontSize: 12 },
  dateSep: { padding: '6px 16px', background: '#faf8f4', borderBottom: '1px solid #e8e4de', borderTop: '1px solid #e8e4de' },
  dayToggle: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b6560', fontSize: 10, padding: '0 4px 0 0', lineHeight: 1 },
  dateSepDate: { fontWeight: 500, color: '#6b6560', marginRight: 6, whiteSpace: 'nowrap' as const },
  dateSepDay: { color: '#6b6560', whiteSpace: 'nowrap' as const },
  dateSepTotal: { fontWeight: 500, color: '#6b6560', whiteSpace: 'nowrap' as const, marginLeft: 'auto' },
  catBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 500 },
  td: { padding: '10px 16px', borderBottom: '1px solid #f3f0eb', color: '#2d2116' },
  select: { padding: '3px 6px', border: '1px solid #c9a84c', borderRadius: 6, fontSize: 12, color: '#2d2116', background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 130 },
  saveBtn: { padding: '3px 8px', background: 'none', color: '#5a8a6a', border: '1px solid #5a8a6a', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 },
  cancelBtn: { padding: '3px 8px', background: 'none', color: '#c0392b', border: '1px solid #c0392b', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 },
  editBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b6560', fontSize: 14, padding: '2px 4px', borderRadius: 4 },
  sourceBadge: { background: '#fdf9f3', color: '#6b6560', padding: '2px 8px', borderRadius: 10, fontSize: 12 },
};

export default function DashboardPage() {
  const { ledgerId } = useApp();
  const categories = useCategories();
  const sources = useSources();
  const isMobile = useIsMobile();
  const sourcesMap = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.key, s.display_name])),
    [sources]
  );
  const [month, setMonth] = useState<MonthValue>(getPrevMonth());
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cellEdit, setCellEdit] = useState<CellEdit | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [excludedTxIds, setExcludedTxIds] = useState<Set<number>>(new Set());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [numbersHidden, setNumbersHidden] = useState(false);

  const fmt = (amount: number) => numbersHidden ? '••••' : formatCurrency(amount);

  function toggleSection(label: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c: Category) => [c.name, c])),
    [categories]
  );

  const catIconMap = useMemo(
    () => Object.fromEntries(categories.map((c: Category) => [c.name, c.icon ?? ''])),
    [categories]
  );

  const catColorMap = useMemo(
    () => Object.fromEntries(
      categories.map((c: Category, i: number) => [c.name, CAT_BADGE_COLORS[i % CAT_BADGE_COLORS.length]])
    ),
    [categories]
  );

  async function handleSave() {
    if (!cellEdit) return;
    await updateTransaction(cellEdit.txId, { category: cellEdit.category, subcategory: cellEdit.subcategory });
    setCellEdit(null);
    fetchData(month);
  }

  const fetchData = useCallback(async (m: MonthValue) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const range = monthToRange(m);
      const result = await listTransactions({
        date_from: range.from,
        date_to: range.to,
        page_size: 200,
        page: 1,
        sort_by: 'transaction_date',
        sort_dir: 'asc',
        ledger_id: ledgerId ?? undefined,
      });
      setTxList(result.items);
    } catch (err) {
      console.error(err);
      setFetchError('Failed to load transactions. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, [ledgerId]);

  // On mount, find the most recent transaction date and jump to that month
  useEffect(() => {
    listTransactions({ page_size: 1, page: 1, sort_by: 'transaction_date', sort_dir: 'desc', ledger_id: ledgerId ?? undefined })
      .then((res) => {
        if (res.items.length > 0) {
          const [year, month] = res.items[0].transaction_date.split('-').map(Number);
          setMonth({ year, month });
        }
      })
      .catch(() => {});
  }, [ledgerId]);

  useEffect(() => {
    fetchData(month);
    setActiveCat(null);
    setSelectedDay(null);
    setExcludedTxIds(new Set());
    setCellEdit(null);
  }, [month, fetchData]);

  // Transactions that drive the section cards (full month or filtered to selected day + active category)
  const displayTxs = useMemo(() => {
    let txs = selectedDay ? txList.filter((tx) => tx.transaction_date === selectedDay) : txList;
    if (activeCat) txs = txs.filter((tx) => (tx.category ?? 'Uncategorized') === activeCat);
    return txs;
  }, [txList, selectedDay, activeCat]);

  // All checked expense-type transactions → feed the charts (refunds reduce net expense)
  const chartExpenses = useMemo(
    () => txList.filter((tx) => tx.transaction_type === 'expense' && !excludedTxIds.has(tx.id)),
    [txList, excludedTxIds]
  );

  const dailyData = useMemo(() => {
    const map: Record<number, number> = {};
    chartExpenses.forEach((tx) => {
      const day = parseInt(tx.transaction_date.split('-')[2], 10);
      // Negative amounts are expenses (add); positive amounts are refunds (subtract)
      map[day] = (map[day] ?? 0) + (tx.amount < 0 ? Math.abs(tx.amount) : -tx.amount);
    });
    const lastDay = new Date(month.year, month.month, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => ({
      day: i + 1,
      amount: parseFloat((Math.max(0, map[i + 1] ?? 0)).toFixed(2)),
    }));
  }, [chartExpenses, month]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    chartExpenses.forEach((tx) => {
      const cat = tx.category ?? 'Uncategorized';
      map[cat] = (map[cat] ?? 0) + (tx.amount < 0 ? Math.abs(tx.amount) : -tx.amount);
    });
    const total = Object.values(map).filter((v) => v > 0).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(Math.max(0, value).toFixed(2)), pct: total > 0 ? (Math.max(0, value) / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [chartExpenses]);

  const totalSpent = useMemo(
    () => -chartExpenses.reduce((s, tx) => s + Number(tx.amount), 0),
    [chartExpenses]
  );

  const totalIncome = useMemo(
    () => txList
      .filter((tx) => tx.transaction_type === 'income' && !excludedTxIds.has(tx.id))
      .reduce((s, tx) => s + Number(tx.amount), 0),
    [txList, excludedTxIds]
  );

  const netIncome = useMemo(() => totalIncome - totalSpent, [totalIncome, totalSpent]);
  const largestExpense = useMemo(
    () => chartExpenses.filter((tx) => Number(tx.amount) < 0).reduce((max, tx) => Math.max(max, Math.abs(Number(tx.amount))), 0),
    [chartExpenses]
  );

  // Debug: log to console to catch NaN sources
  console.log('[Dashboard] totalSpent:', totalSpent, 'largestExpense:', largestExpense, 'chartExpenses sample:', chartExpenses.slice(0, 3).map(tx => ({ id: tx.id, amount: tx.amount, type: typeof tx.amount })));

  const monthLabel = new Date(month.year, month.month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const hasData = txList.length > 0;

  const selectedDayLabel = selectedDay
    ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  return (
    <div>
      <div style={styles.pageHeader} className="page-header">
        <h1 style={styles.title}>Dashboard</h1>
        <MonthPicker value={month} onChange={(v) => v && setMonth(v)} clearable={false} />
        <button
          type="button"
          onClick={() => setNumbersHidden((h) => !h)}
          style={styles.eyeBtn}
          title={numbersHidden ? 'Show amounts' : 'Hide amounts'}
        >
          <EyeIcon hidden={numbersHidden} />
        </button>
      </div>

      {isLoading && <div style={styles.loading}>Loading…</div>}

      {!isLoading && fetchError && (
        <div style={styles.errorBox}>{fetchError}</div>
      )}

      {!isLoading && !fetchError && !hasData && (
        <div style={styles.emptyState}>
          <span style={{ fontSize: 40, opacity: 0.4 }}>📊</span>
          <p style={styles.emptyTitle}>No transactions found for {monthLabel}</p>
          <p style={styles.emptyHint}>Use the month picker above to navigate to a month with transactions.</p>
        </div>
      )}

      {!isLoading && !fetchError && hasData && (
        <>
          {/* Summary Card — reflects checked expenses only */}
          <div style={styles.summaryCard} className="summary-card">
            <div style={styles.summaryItem} className="summary-item">
              <span style={styles.summaryLabel}>Total Spent</span>
              <span style={{ ...styles.summaryValue, color: '#c0392b' }}>{fmt(totalSpent)}</span>
            </div>
            {!isMobile && <div style={styles.summaryDivider} className="summary-divider" />}
            <div style={styles.summaryItem} className="summary-item">
              <span style={styles.summaryLabel}>Total Income</span>
              <span style={styles.summaryValue}>{fmt(totalIncome)}</span>
            </div>
            {!isMobile && <div style={styles.summaryDivider} className="summary-divider" />}
            <div style={styles.summaryItem} className="summary-item">
              <span style={styles.summaryLabel}>Net Income</span>
              <span style={{ ...styles.summaryValue, color: netIncome >= 0 ? '#5a8a6a' : '#c0392b' }}>{fmt(netIncome)}</span>
            </div>
            {!isMobile && <div style={styles.summaryDivider} className="summary-divider" />}
            <div style={styles.summaryItem} className="summary-item">
              <span style={styles.summaryLabel}>Transactions</span>
              <span style={styles.summaryValue}>{txList.length.toLocaleString()}</span>
            </div>
            {!isMobile && <div style={styles.summaryDivider} className="summary-divider" />}
            <div style={styles.summaryItem} className="summary-item">
              <span style={styles.summaryLabel}>Largest Expense</span>
              <span style={styles.summaryValue}>{fmt(largestExpense)}</span>
            </div>
          </div>

          <div style={styles.chartsRow} className="charts-row">
            {/* Bar Chart */}
            <div style={{ ...styles.card, flex: '1 1 52%', minWidth: 300 }}>
              <h2 style={styles.chartTitle}>Daily Expenses — {monthLabel}</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4de" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#6b6560' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e8e4de' }}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6b6560' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => numbersHidden ? '••••' : `$${v}`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => [numbersHidden ? '••••' : formatCurrency(value), 'Spent']}
                    labelFormatter={(label) => `Day ${label}`}
                    contentStyle={{ border: '1px solid #e8e4de', borderRadius: 6, fontSize: 13 }}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                    cursor="pointer"
                    onClick={(data) => {
                      const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
                      setSelectedDay((prev) => prev === dateStr ? null : dateStr);
                      setCellEdit(null);
                    }}
                  >
                    {dailyData.map((d) => {
                      const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                      return (
                        <Cell
                          key={d.day}
                          fill={selectedDay === dateStr ? '#a07830' : '#c9a84c'}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div style={{ ...styles.card, flex: '1 1 44%', minWidth: 300, paddingRight: 0 }}>
              <h2 style={styles.chartTitle}>By Category — {monthLabel}</h2>
              <div style={styles.pieRow} className="pie-row">
                <div style={{ flex: '0 0 200px', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        onClick={(entry) => setActiveCat((prev) => prev === entry.name ? null : entry.name)}
                        style={{ cursor: 'pointer' }}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={WARM_COLORS[i % WARM_COLORS.length]}
                            opacity={activeCat && activeCat !== entry.name ? 0.35 : 1}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => numbersHidden ? '••••' : formatCurrency(value)}
                        contentStyle={{ border: '1px solid #e8e4de', borderRadius: 6, fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={styles.centerLabel}>{fmt(totalSpent)}</div>
                </div>
                <div style={styles.legend} className="pie-legend">
                  {categoryData.map((entry, i) => (
                    <div
                      key={entry.name}
                      style={{ ...styles.legendItem, opacity: activeCat && activeCat !== entry.name ? 0.5 : 1 }}
                      onClick={() => setActiveCat((prev) => prev === entry.name ? null : entry.name)}
                    >
                      <span style={{ ...styles.legendDot, background: WARM_COLORS[i % WARM_COLORS.length] }} />
                      <span style={styles.legendName}>{entry.name}</span>
                      <span style={styles.legendPct}>{numbersHidden ? '••%' : `${entry.pct.toFixed(1)}%`}</span>
                      <span style={styles.legendAmt}>{numbersHidden ? '••••' : formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section header */}
          <div style={styles.sectionHeader}>
            <span style={styles.sectionHeaderTitle}>
              {selectedDayLabel ?? monthLabel}
            </span>
            {selectedDay && (
              <button type="button" onClick={() => { setSelectedDay(null); setCellEdit(null); }} style={styles.clearDayBtn}>
                × All of {monthLabel}
              </button>
            )}
            {activeCat && (
              <button type="button" onClick={() => setActiveCat(null)} style={styles.clearDayBtn}>
                × All categories
              </button>
            )}
          </div>

          {/* Expenses / Transfers / Income section cards */}
          <div style={styles.sectionsCol}>
            {SECTIONS.map((section) => {
              const sectionTxs = displayTxs.filter(section.filter);
              if (sectionTxs.length === 0) return null;
              const raw = sectionTxs.reduce((s, tx) => s + Number(tx.amount), 0);
              const sectionTotal = section.label === 'Expenses' ? -raw : raw;
              const collapsed = collapsedSections.has(section.label);
              return (
                <div key={section.label} style={styles.detailCard}>
                  <div
                    style={{ ...styles.detailHeader, cursor: 'pointer' }}
                    onClick={() => toggleSection(section.label)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#6b6560', fontSize: 12, transition: 'transform 0.15s', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', display: 'inline-block' }}>▶</span>
                      <span style={{ ...styles.detailTitle, color: section.accent }}>{section.label}</span>
                      {activeCat && <span style={styles.activeCatBadge}>{activeCat}</span>}
                    </div>
                    <span style={styles.sectionTotal}>{fmt(sectionTotal)}</span>
                  </div>
                  {!collapsed && (
                    <TxDetailTable
                      txs={sectionTxs}
                      showDate={!selectedDay}
                      cellEdit={cellEdit}
                      setCellEdit={setCellEdit}
                      categories={categories}
                      catMap={catMap}
                      catIconMap={catIconMap}
                      catColorMap={catColorMap}
                      onSave={handleSave}
                      onEditTx={setSelectedTx}
                      excludedTxIds={excludedTxIds}
                      setExcludedTxIds={setExcludedTxIds}
                      sourcesMap={sourcesMap}
                      numbersHidden={numbersHidden}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <EditTransactionModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onSuccess={() => { setSelectedTx(null); fetchData(month); }}
        categories={categories}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#2d2116' },
  eyeBtn: {
    background: 'none',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#6b6560',
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  loading: { padding: 48, textAlign: 'center', color: '#6b6560' },
  errorBox: {
    background: '#fee2e2',
    color: '#c0392b',
    border: '1px solid #fca5a5',
    borderRadius: 6,
    padding: '12px 16px',
    fontSize: 14,
    marginBottom: 20,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '60px 40px',
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    textAlign: 'center',
  },
  emptyTitle: { margin: 0, fontSize: 16, fontWeight: 600, color: '#2d2116' },
  emptyHint: { margin: 0, fontSize: 14, color: '#6b6560' },
  summaryCard: {
    display: 'flex',
    gap: 0,
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    padding: '16px 24px',
    marginBottom: 20,
    boxShadow: '0 1px 4px rgba(45,33,22,0.06)',
    alignItems: 'center',
  },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b6560', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' },
  summaryValue: { fontSize: 22, fontWeight: 700, color: '#c9a84c' },
  summaryDivider: { width: 1, height: 40, background: '#e8e4de', margin: '0 16px' },
  chartsRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  card: {
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    padding: 20,
    boxShadow: '0 1px 4px rgba(45,33,22,0.06)',
  },
  chartTitle: { margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#2d2116' },
  pieRow: { display: 'flex', alignItems: 'center', gap: 16 },
  centerLabel: { textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#2d2116', marginTop: -12 },
  legend: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 220, paddingRight: 8 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '2px 0', cursor: 'pointer' },
  legendDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  legendName: { flex: 1, color: '#2d2116', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  legendPct: { color: '#6b6560', minWidth: 36, textAlign: 'right' },
  legendAmt: { color: '#2d2116', fontWeight: 500, minWidth: 64, textAlign: 'right' },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  sectionHeaderTitle: { fontSize: 15, fontWeight: 600, color: '#2d2116' },
  clearDayBtn: {
    background: 'none',
    border: '1px solid #e8e4de',
    borderRadius: 4,
    cursor: 'pointer',
    color: '#6b6560',
    fontSize: 12,
    padding: '4px 10px',
  },
  sectionsCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  detailCard: {
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    boxShadow: '0 2px 8px rgba(45,33,22,0.08)',
    overflow: 'hidden',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid #e8e4de',
  },
  detailTitle: { fontSize: 15, fontWeight: 600, color: '#2d2116' },
  sectionTotal: { fontSize: 14, fontWeight: 600, color: '#2d2116' },
  activeCatBadge: { fontSize: 11, fontWeight: 500, color: '#92400e', background: '#fef9ec', border: '1px solid #c9a84c', borderRadius: 10, padding: '1px 8px' },
};
