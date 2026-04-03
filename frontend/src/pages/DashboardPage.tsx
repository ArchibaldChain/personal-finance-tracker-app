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
import { listTransactions } from '../api/transactions';
import MonthPicker, { MonthValue } from '../components/MonthPicker';
import type { Transaction } from '../types';

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState<MonthValue>(getPrevMonth());
  const [txList, setTxList] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
            <div style={{ ...styles.card, flex: '1 1 55%', minWidth: 300 }}>
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
            <div style={{ ...styles.card, flex: '1 1 40%', minWidth: 280 }}>
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
                        onClick={(entry) => setActiveCat(activeCat === entry.name ? null : entry.name)}
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
                      onClick={() => setActiveCat(activeCat === entry.name ? null : entry.name)}
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
                <button type="button" onClick={() => setSelectedDay(null)} style={styles.dismissBtn}>×</button>
              </div>
              {dayTxs.length === 0 ? (
                <div style={{ padding: '20px 16px', color: '#6b6560', fontSize: 13 }}>No expenses on this day.</div>
              ) : (
                <table style={styles.detailTable}>
                  <thead>
                    <tr>
                      {['Merchant', 'Category', 'Subcategory', 'Amount'].map((h) => (
                        <th key={h} style={styles.detailTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayTxs.map((tx) => (
                      <tr key={tx.id}>
                        <td style={styles.detailTd}>{tx.merchant_normalized || tx.description || '—'}</td>
                        <td style={styles.detailTd}>{tx.category || '—'}</td>
                        <td style={{ ...styles.detailTd, color: '#6b6560' }}>{tx.subcategory || '—'}</td>
                        <td style={{ ...styles.detailTd, color: '#c0392b', fontWeight: 500 }}>
                          {formatCurrency(Math.abs(tx.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Category Detail Card */}
          {!selectedDay && activeCat && (
            <div style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <span style={styles.detailTitle}>{activeCat} — {monthLabel}</span>
                <button type="button" onClick={() => setActiveCat(null)} style={styles.dismissBtn}>×</button>
              </div>
              <table style={styles.detailTable}>
                <thead>
                  <tr>
                    {['Date', 'Merchant', 'Subcategory', 'Amount'].map((h) => (
                      <th key={h} style={styles.detailTh}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCatTxs.map((tx) => (
                    <tr key={tx.id}>
                      <td style={styles.detailTd}>{tx.transaction_date}</td>
                      <td style={styles.detailTd}>{tx.merchant_normalized || tx.description || '—'}</td>
                      <td style={{ ...styles.detailTd, color: '#6b6560' }}>{tx.subcategory || '—'}</td>
                      <td style={{ ...styles.detailTd, color: '#c0392b', fontWeight: 500 }}>
                        {formatCurrency(Math.abs(tx.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => navigate(`/transactions`)}
                style={styles.viewAllLink}
              >
                View all in Transactions →
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
    gap: 20,
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
