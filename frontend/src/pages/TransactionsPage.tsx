import { useCallback, useEffect, useState } from 'react';
import { listTransactions } from '../api/transactions';
import AddTransactionModal from '../components/AddTransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import Pagination from '../components/Pagination';
import TransactionFiltersBar from '../components/TransactionFiltersBar';
import TransactionTable from '../components/TransactionTable';
import { useCategories } from '../hooks/useCategories';
import { useSources } from '../hooks/useSources';
import type { Transaction, TransactionFilters, TransactionListResponse } from '../types';

const DEFAULT_FILTERS: TransactionFilters = {
  sort_by: 'transaction_date',
  sort_dir: 'desc',
  page: 1,
  page_size: 50,
};

export default function TransactionsPage() {
  const categories = useCategories();
  const sources = useSources();
  const sourcesMap = Object.fromEntries(sources.map((s) => [s.key, s.display_name]));
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<TransactionListResponse>({ items: [], total: 0, page: 1, page_size: 50 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchTransactions = useCallback(async (f: TransactionFilters) => {
    setIsLoading(true);
    try {
      const result = await listTransactions(f);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(filters);
  }, [filters, fetchTransactions]);

  const handleFiltersChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
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

  return (
    <div>
      <TransactionFiltersBar
        filters={filters}
        onChange={handleFiltersChange}
        categories={categories}
        onAddClick={() => setIsAddOpen(true)}
      />

      <TransactionTable
        transactions={data.items}
        isLoading={isLoading}
        onRowClick={setSelectedTx}
        filters={filters}
        onSort={handleSort}
        sourcesMap={sourcesMap}
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
