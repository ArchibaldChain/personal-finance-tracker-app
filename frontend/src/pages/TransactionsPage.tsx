import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listTransactions, updateTransaction } from '../api/transactions';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import { MonthValue } from '../components/MonthPicker';
import Pagination from '../components/Pagination';
import TransactionFiltersBar from '../components/TransactionFiltersBar';
import TransactionTable from '../components/TransactionTable';
import { useApp } from '../context/AppContext';
import { useCategories } from '../hooks/useCategories';
import { useUsedSources } from '../hooks/useSources';
import type { Transaction, TransactionFilters, TransactionListResponse } from '../types';

const DEFAULT_FILTERS: TransactionFilters = {
  sort_by: 'transaction_date',
  sort_dir: 'desc',
  page: 1,
  page_size: 50,
};


function monthToDateRange(m: MonthValue) {
  const from = `${m.year}-${String(m.month).padStart(2, '0')}-01`;
  const lastDay = new Date(m.year, m.month, 0).getDate();
  const to = `${m.year}-${String(m.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}


export default function TransactionsPage() {
  const { ledgerId } = useApp();
  const categories = useCategories();
  const sources = useUsedSources(ledgerId ?? undefined);
  const sourcesMap = Object.fromEntries(sources.map((s) => [s.key, s.display_name]));
  const location = useLocation();
  const [month, setMonth] = useState<MonthValue | null>(() => {
    const df = new URLSearchParams(location.search).get('date_from');
    if (!df) return null;
    const [y, m] = df.split('-').map(Number);
    return { year: y, month: m };
  });
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const params = new URLSearchParams(location.search);
    const f: TransactionFilters = { ...DEFAULT_FILTERS };
    if (params.get('category')) f.category = params.get('category')!;
    if (params.get('date_from')) {
      f.date_from = params.get('date_from')!;
      f.date_to = params.get('date_to')!;
    }
    return f;
  });
  const [data, setData] = useState<TransactionListResponse>({ items: [], total: 0, page: 1, page_size: 50 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchTransactions = useCallback(async (f: TransactionFilters) => {
    setIsLoading(true);
    try {
      const result = await listTransactions({ ...f, ledger_id: ledgerId ?? undefined });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [ledgerId]);

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
        ledgerId={ledgerId}
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

