import React, { useEffect, useRef, useState } from 'react';
import type { Category, TransactionFilters } from '../types';

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  categories: Category[];
  onAddClick: () => void;
}

export default function TransactionFiltersBar({
  filters,
  onChange,
  categories,
  onAddClick,
}: TransactionFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined, page: 1 });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleCategory = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, category: e.target.value || undefined, page: 1 });
  };

  const handleSourceType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, source_type: e.target.value || undefined, page: 1 });
  };

  return (
    <div style={styles.bar}>
      <input
        type="search"
        placeholder="Search merchant, description…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        style={{ ...styles.input, flex: 2, minWidth: 200 }}
      />
      <select value={filters.category ?? ''} onChange={handleCategory} style={styles.input}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <select value={filters.source_type ?? ''} onChange={handleSourceType} style={styles.input}>
        <option value="">All sources</option>
        <option value="manual">Manual</option>
        <option value="csv">CSV Import</option>
      </select>
      <button onClick={onAddClick} style={styles.addBtn}>
        + Add Transaction
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  input: {
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
    minWidth: 140,
  },
  addBtn: {
    marginLeft: 'auto',
    padding: '8px 16px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
};
