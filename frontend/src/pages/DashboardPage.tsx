import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import MonthPicker, { MonthValue } from '../components/MonthPicker';
import { useCategories } from '../hooks/useCategories';
import type { Category, Transaction } from '../types';

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

function getPrevMonth(): MonthValue {
  const now = new Date();
  const m = now.getMonth(); // 0-based
  return m === 0
    ? { year: now.getFullYear() - 1, month: 12 }
    : { year: now.getFullYear(), month: m };
}

function monthToRange(m: MonthValue) {
  const from = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
  const lastDay = new Date(m.year, m.month, 0).getDate();
  const to = `${m.year}-${String(m.month).padStart(2, '00')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ── Shared editable transaction table used in both day and category detail cards ──
interface TxDetailTableProps {
  txs: Transaction[];
  showDate?: boolean;
  cellEdit: CellEdit | null;
  setCellEdit: React.Dispatch<React.SetStateAction<CellEdit | null>>;
  categories: Category[];
  catMap: Record<string, Category>;
  onSave: () => void;
}

function TxDetailTable({ txs, showDate, cellEdit, setCellEdit, categories, catMap, onSave }: TxDetailTableProps) {
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

  const headers = [...(showDate ? ['Date', 'Day'] : []), 'Merchant', 'Category', 'Subcategory', 'Amount', ''];

  return (
    <table style={detailStyles.table}>
      <thead>
        <tr>{headers.map((h) => <th key={h} style={detailStyles.th}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {txs.map((tx) => {
          const isEditing = cellEdit?.txId === tx.id;
          const displayCat = isEditing ? cellEdit.category : tx.category;
          const displaySub = isEditing ? cellEdit.subcategory : tx.subcategory;
          const pendingSubcats = isEditing && cellEdit.category ? (catMap[cellEdit.category]?.subcategories ?? []) : [];
          return (
            <tr key={tx.id}>
              {showDate && <td style={detailStyles.td}>{tx.transaction_date}</td>}
              {showDate && (
                <td style={{ ...detailStyles.td, color: '#6b6560' }}>
                  {new Date(tx.transaction_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                </td>
              )}
              <td style={detailStyles.td}>{tx.merchant_normalized || tx.description || '—'}</td>

              {/* Category */}
              <td style={{ ...detailStyles.td, cursor: 'pointer' }} onClick={(e) => openCategoryEdit(tx, e)}>
                {isEditing && cellEdit.openStep === 'category' ? (
                  <select autoFocus defaultValue="" onChange={(e) => { e.stopPropagation(); handleCategorySelect(tx, e.target.value); }} onBlur={() => setCellEdit((prev) => prev ? { ...prev, openStep: null } : null)} onClick={(e) => e.stopPropagation()} style={detailStyles.select}>
                    <option value="">— None —</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                ) : (
                  <span style={{ color: displayCat ? '#2d2116' : '#c8c4be' }}>{displayCat || '—'}</span>
                )}
              </td>

              {/* Subcategory */}
              <td
                style={{ ...detailStyles.td, color: '#6b6560', cursor: isEditing && pendingSubcats.length > 0 ? 'pointer' : 'default' }}
                onClick={(e) => { if (isEditing && pendingSubcats.length > 0) { e.stopPropagation(); setCellEdit((prev) => prev ? { ...prev, openStep: 'subcategory' } : null); } }}
              >
                {isEditing && cellEdit.openStep === 'subcategory' ? (
                  <select autoFocus defaultValue="" onChange={(e) => { e.stopPropagation(); handleSubcategorySelect(e.target.value); }} onBlur={() => setCellEdit((prev) => prev ? { ...prev, openStep: null } : null)} onClick={(e) => e.stopPropagation()} style={detailStyles.select}>
                    <option value="">— None —</option>
                    {pendingSubcats.map((s) => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
                  </select>
                ) : (
                  displaySub || '—'
                )}
              </td>

              <td style={{ ...detailStyles.td, color: '#c0392b', fontWeight: 500 }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(tx.amount))}
              </td>

              {/* Actions */}
              <td style={{ ...detailStyles.td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {isEditing && cellEdit.openStep !== 'category' ? (
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <button type="button" onClick={onSave} style={detailStyles.saveBtn} title="Save">✓</button>
                    <button type="button" onClick={() => setCellEdit(null)} style={detailStyles.cancelBtn} title="Cancel">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={(e) => openCategoryEdit(tx, e)} style={detailStyles.editBtn} title="Edit category">✎</button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const detailStyles: Record<string, React.CSSProperties> = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 16px', textAlign: 'left', background: '#faf8f4', borderBottom: '1px solid #e8e4de', fontWeight: 600, color: '#6b6560', fontSize: 12 },
  td: { padding: '10px 16px', borderBottom: '1px solid #f3f0eb', color: '#2d2116' },
  select: { padding: '3px 6px', border: '1px solid #c9a84c', borderRadius: 6, fontSize: 12, color: '#2d2116', background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 130 },
  saveBtn: { padding: '3px 8px', background: 'none', color: '#5a8a6a', border: '1px solid #5a8a6a', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 },
  cancelBtn: { padding: '3px 8px', background: 'none', color: '#c0392b', border: '1px solid #c0392b', borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1 },
  editBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b6560', fontSize: 14, padding: '2px 4px', borderRadius: 4 },
};

export default function DashboardPage() {
  const categories = useCategories();
  const navigate = useNavigate();
  const [month, setMonth] = useState<MonthValue>(getPrevMonth());
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cellEdit, setCellEdit] = useState<CellEdit | null>(null);

  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c: Category) => [c.name, c])),
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
      });
      setTxList(result.items);
    } catch (err) {
      console.error(err);
      setFetchError('Failed to load transactions. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
    setActiveCat(null);
    setSelectedDay(null);
  }, [month, fetchData]);

  const expenses = useMemo(() => txList.filter((tx) => tx.amount < 0), [txList]);

  const dailyData = useMemo(() => {
    const map: Record<number, number> = {};
    expenses.forEach((tx) => {
      const day = parseInt(tx.transaction_date.split('-')[2], 10);
      map[day] = (map[day] ?? 0) + Math.abs(tx.amount);
    });
    const lastDay = new Date(month.year, month.month, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => ({
      day: i + 1,
      amount: parseFloat((map[i + 1] ?? 0).toFixed(2)),
    }));
  }, [expenses, month]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((tx) => {
      const cat = tx.category ?? 'Uncategorized';
      map[cat] = (map[cat] ?? 0) + Math.abs(tx.amount);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)), pct: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const totalSpent = useMemo(() => expenses.reduce((s, tx) => s + Math.abs(tx.amount), 0), [expenses]);
  const largestExpense = useMemo(() => expenses.reduce((max, tx) => Math.max(max, Math.abs(tx.amount)), 0), [expenses]);

  const activeCatTxs = useMemo(
    () => activeCat ? expenses.filter((tx) => (tx.category ?? 'Uncategorized') === activeCat) : [],
    [activeCat, expenses]
  );

  const dayTxs = useMemo(
    () => selectedDay ? expenses.filter((tx) => tx.transaction_date === selectedDay) : [],
    [selectedDay, expenses]
  );

  const monthLabel = new Date(month.year, month.month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const hasData = expenses.length > 0;

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Dashboard</h1>
        <MonthPicker value={month} onChange={(v) => v && setMonth(v)} clearable={false} />
      </div>

      {isLoading && <div style={styles.loading}>Loading…</div>}

      {!isLoading && fetchError && (
        <div style={styles.errorBox}>{fetchError}</div>
      )}

      {!isLoading && !fetchError && !hasData && (
        <div style={styles.emptyState}>
          <span style={{ fontSize: 40, opacity: 0.4 }}>📊</span>
          <p style={styles.emptyTitle}>No expenses found for {monthLabel}</p>
          <p style={styles.emptyHint}>Use the month picker above to navigate to a month with transactions.</p>
        </div>
      )}

      {!isLoading && !fetchError && hasData && (
        <>
          {/* Summary Card */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Total Spent</span>
              <span style={styles.summaryValue}>{formatCurrency(totalSpent)}</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Transactions</span>
              <span style={styles.summaryValue}>{txList.length.toLocaleString()}</span>
            </div>
            <div style={styles.summaryDivider} />
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Largest Expense</span>
              <span style={styles.summaryValue}>{formatCurrency(largestExpense)}</span>
            </div>
          </div>

          <div style={styles.chartsRow}>
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
                    tickFormatter={(v) => `$${v}`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Spent']}
                    labelFormatter={(label) => `Day ${label}`}
                    contentStyle={{ border: '1px solid #e8e4de', borderRadius: 6, fontSize: 13 }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#c9a84c"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={24}
                    cursor="pointer"
                    onClick={(data) => {
                      const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`;
                      setSelectedDay((prev) => prev === dateStr ? null : dateStr);
                      setActiveCat(null);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div style={{ ...styles.card, flex: '1 1 44%', minWidth: 300, paddingRight: 12 }}>
              <h2 style={styles.chartTitle}>By Category — {monthLabel}</h2>
              <div style={styles.pieRow}>
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
                        onClick={(entry) => { setActiveCat((prev) => prev === entry.name ? null : entry.name); setSelectedDay(null); }}
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
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ border: '1px solid #e8e4de', borderRadius: 6, fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={styles.centerLabel}>{formatCurrency(totalSpent)}</div>
                </div>
                <div style={styles.legend}>
                  {categoryData.map((entry, i) => (
                    <div
                      key={entry.name}
                      style={{
                        ...styles.legendItem,
                        opacity: activeCat && activeCat !== entry.name ? 0.5 : 1,
                      }}
                      onClick={() => { setActiveCat((prev) => prev === entry.name ? null : entry.name); setSelectedDay(null); }}
                    >
                      <span style={{ ...styles.legendDot, background: WARM_COLORS[i % WARM_COLORS.length] }} />
                      <span style={styles.legendName}>{entry.name}</span>
                      <span style={styles.legendPct}>{entry.pct.toFixed(1)}%</span>
                      <span style={styles.legendAmt}>{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Day Detail Card */}
          {selectedDay && (
            <div style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <span style={styles.detailTitle}>
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {' — '}{formatCurrency(dayTxs.reduce((s, tx) => s + Math.abs(tx.amount), 0))}
                </span>
                <button type="button" onClick={() => { setSelectedDay(null); setCellEdit(null); }} style={styles.dismissBtn}>×</button>
              </div>
              {dayTxs.length === 0 ? (
                <div style={{ padding: '20px 16px', color: '#6b6560', fontSize: 13 }}>No expenses on this day.</div>
              ) : (
                <TxDetailTable txs={dayTxs} showDate={true} cellEdit={cellEdit} setCellEdit={setCellEdit} categories={categories} catMap={catMap} onSave={handleSave} />
              )}
            </div>
          )}

          {/* Category Detail Card */}
          {activeCat && (
            <div style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <span style={styles.detailTitle}>{activeCat} — {monthLabel}</span>
                <button type="button" onClick={() => { setActiveCat(null); setCellEdit(null); }} style={styles.dismissBtn}>×</button>
              </div>
              <TxDetailTable txs={activeCatTxs} showDate={true} cellEdit={cellEdit} setCellEdit={setCellEdit} categories={categories} catMap={catMap} onSave={handleSave} />
              <button
                type="button"
                onClick={() => {
                  const range = monthToRange(month);
                  const params = new URLSearchParams();
                  if (activeCat) params.set('category', activeCat);
                  params.set('date_from', range.from);
                  params.set('date_to', range.to);
                  navigate(`/transactions?${params.toString()}`);
                }}
                style={styles.viewAllLink}
              >
                View them in Transactions →
              </button>
            </div>
          )}

          {/* Daily Totals Table (default — nothing selected) */}
          {!selectedDay && !activeCat && (
            <div style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <span style={styles.detailTitle}>Daily Totals — {monthLabel}</span>
              </div>
              <table style={styles.detailTable}>
                <thead>
                  <tr>
                    {['Date', 'Day', 'Total Spent', 'Transactions'].map((h) => (
                      <th key={h} style={styles.detailTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyData.filter((d) => d.amount > 0).map((d) => {
                    const dateStr = `${month.year}-${String(month.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                    const txCount = expenses.filter((tx) => tx.transaction_date === dateStr).length;
                    return (
                      <tr
                        key={d.day}
                        style={{ cursor: 'pointer' }}
                        onClick={() => { setSelectedDay(dateStr); setActiveCat(null); }}
                      >
                        <td style={styles.detailTd}>{dateStr}</td>
                        <td style={{ ...styles.detailTd, color: '#6b6560' }}>
                          {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </td>
                        <td style={{ ...styles.detailTd, color: '#c0392b', fontWeight: 500 }}>
                          {formatCurrency(d.amount)}
                        </td>
                        <td style={{ ...styles.detailTd, color: '#6b6560' }}>{txCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
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
  emptyTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#2d2116',
  },
  emptyHint: {
    margin: 0,
    fontSize: 14,
    color: '#6b6560',
  },
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
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b6560',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#c9a84c',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    background: '#e8e4de',
    margin: '0 16px',
  },
  chartsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  card: {
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    padding: 20,
    boxShadow: '0 1px 4px rgba(45,33,22,0.06)',
  },
  chartTitle: {
    margin: '0 0 16px',
    fontSize: 15,
    fontWeight: 600,
    color: '#2d2116',
  },
  pieRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  centerLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: '#2d2116',
    marginTop: -12,
  },
  legend: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    overflowY: 'auto',
    maxHeight: 220,
    paddingRight: 8,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    padding: '2px 0',
    cursor: 'pointer',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendName: { flex: 1, color: '#2d2116', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  legendPct: { color: '#6b6560', minWidth: 36, textAlign: 'right' },
  legendAmt: { color: '#2d2116', fontWeight: 500, minWidth: 64, textAlign: 'right' },
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
  dismissBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    color: '#6b6560',
    lineHeight: 1,
    padding: '0 4px',
  },
  detailTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  detailTh: {
    padding: '8px 16px',
    textAlign: 'left',
    background: '#faf8f4',
    borderBottom: '1px solid #e8e4de',
    fontWeight: 600,
    color: '#6b6560',
    fontSize: 12,
  },
  detailTd: {
    padding: '10px 16px',
    borderBottom: '1px solid #f3f0eb',
    color: '#2d2116',
  },
  inlineSelect: {
    padding: '3px 6px',
    border: '1px solid #c9a84c',
    borderRadius: 6,
    fontSize: 12,
    color: '#2d2116',
    background: '#fff',
    outline: 'none',
    cursor: 'pointer',
    minWidth: 130,
  },
  saveBtn: {
    padding: '3px 8px',
    background: 'none',
    color: '#5a8a6a',
    border: '1px solid #5a8a6a',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  },
  cancelBtn: {
    padding: '3px 8px',
    background: 'none',
    color: '#c0392b',
    border: '1px solid #c0392b',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  },
  editBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b6560',
    fontSize: 14,
    padding: '2px 4px',
    borderRadius: 4,
  },
  viewAllLink: {
    display: 'block',
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left',
  },
};
