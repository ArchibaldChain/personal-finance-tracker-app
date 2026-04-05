import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getTransactionSummary, listTransactions, updateTransaction } from '../api/transactions';
import type { TransactionSummary } from '../api/transactions';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import { MonthValue } from '../components/MonthPicker';
import Pagination from '../components/Pagination';
import TransactionFiltersBar from '../components/TransactionFiltersBar';
import TransactionTable from '../components/TransactionTable';
import { useCategories } from '../hooks/useCategories';
import { useUsedSources } from '../hooks/useSources';
import type { Transaction, TransactionFilters, TransactionListResponse } from '../types';

const DEFAULT_FILTERS: TransactionFilters = {
  sort_by: 'transaction_date',
  sort_dir: 'desc',
  page: 1,
  page_size: 50,
};

function getPrevMonth(): MonthValue {
  const now = new Date();
  const m = now.getMonth(); // 0-based
  return m === 0
    ? { year: now.getFullYear() - 1, month: 12 }
    : { year: now.getFullYear(), month: m };
}

function monthToDateRange(m: MonthValue) {
  const from = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
  const lastDay = new Date(m.year, m.month, 0).getDate();
  const to = `${m.year}-${String(m.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function TransactionsPage() {
  const categories = useCategories();
  const sources = useUsedSources();
  const sourcesMap = Object.fromEntries(sources.map((s) => [s.key, s.display_name]));
  const location = useLocation();
  const [month, setMonth] = useState<MonthValue | null>(() => {
    const df = new URLSearchParams(location.search).get('date_from');
    if (df) {
      const [y, m] = df.split('-').map(Number);
      return { year: y, month: m };
    }
    return getPrevMonth();
  });
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const params = new URLSearchParams(location.search);
    const f: TransactionFilters = { ...DEFAULT_FILTERS };
    if (params.get('category')) f.category = params.get('category')!;
    if (params.get('date_from')) {
      f.date_from = params.get('date_from')!;
      f.date_to = params.get('date_to')!;
    } else {
      const range = monthToDateRange(getPrevMonth());
      f.date_from = range.from;
      f.date_to = range.to;
    }
    return f;
  });
  const [data, setData] = useState<TransactionListResponse>({ items: [], total: 0, page: 1, page_size: 50 });
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<TransactionSummary>({ total_spent: 0, transaction_count: 0, largest_expense: 0 });
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Summary uses only filter fields relevant to aggregation (no page/sort)
  const summaryFilters = (f: TransactionFilters): TransactionFilters => ({
    search: f.search,
    category: f.category,
    source_type: f.source_type,
    needs_review: f.needs_review,
    date_from: f.date_from,
    date_to: f.date_to,
  });

  const fetchTransactions = useCallback(async (f: TransactionFilters) => {
    setIsLoading(true);
    try {
      const [result, sum] = await Promise.all([
        listTransactions(f),
        getTransactionSummary(summaryFilters(f)),
      ]);
      setData(result);
      setSummary(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTransactions(filters);
  }, [filters, fetchTransactions]);

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  const handleMonthChange = (m: MonthValue | null) => {
    setMonth(m);
    if (m) {
      const range = monthToDateRange(m);
      setFilters((f) => ({ ...f, date_from: range.from, date_to: range.to, page: 1 }));
    } else {
      setFilters((f) => { const next = { ...f, page: 1 }; delete next.date_from; delete next.date_to; return next; });
    }
  };

  const handleSort = (field: string) => {
    setFilters((f) => ({
      ...f,
      sort_by: field,
      sort_dir: f.sort_by === field && f.sort_dir === 'desc' ? 'asc' : 'desc',
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((f) => ({ ...f, page }));
  };

  const handleSuccess = () => {
    fetchTransactions(filters);
  };

  const handleCategoryChange = useCallback(async (txId: number, category: string | null, subcategory: string | null) => {
    await updateTransaction(txId, { category, subcategory });
    fetchTransactions(filters);
  }, [filters, fetchTransactions]);

  return (
    <div>
      {/* Summary Card */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Total Spent</span>
          <span style={styles.summaryValue}>{formatCurrency(summary.total_spent)}</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Transactions</span>
          <span style={styles.summaryValue}>{summary.transaction_count.toLocaleString()}</span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Largest Expense</span>
          <span style={styles.summaryValue}>{formatCurrency(summary.largest_expense)}</span>
        </div>
      </div>

      <TransactionFiltersBar
        filters={filters}
        onChange={handleFiltersChange}
        categories={categories}
        sources={sources}
        onAddClick={() => setIsAddOpen(true)}
        month={month}
        onMonthChange={handleMonthChange}
      />

      <TransactionTable
        transactions={data.items}
        isLoading={isLoading}
        onRowClick={setSelectedTx}
        filters={filters}
        onSort={handleSort}
        sourcesMap={sourcesMap}
        categories={categories}
        onCategoryChange={handleCategoryChange}
      />

      <Pagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        onChange={handlePageChange}
      />

      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleSuccess}
        categories={categories}
      />

      <EditTransactionModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        onSuccess={handleSuccess}
        categories={categories}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
};
