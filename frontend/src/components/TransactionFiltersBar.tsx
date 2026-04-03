import React, { useEffect, useRef, useState } from 'react';
import type { Category, TransactionFilters } from '../types';
import MonthPicker, { MonthValue } from './MonthPicker';

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  categories: Category[];
  onAddClick: () => void;
  month: MonthValue | null;
  onMonthChange: (v: MonthValue | null) => void;
}

export default function TransactionFiltersBar({
  filters,
  onChange,
  categories,
  onAddClick,
  month,
  onMonthChange,
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

  const handleNeedsReview = () => {
    onChange({ ...filters, needs_review: !filters.needs_review, page: 1 });
  };

  return (
    <div style={styles.bar}>
      <MonthPicker value={month} onChange={onMonthChange} clearable />
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
      <button
        onClick={handleNeedsReview}
        style={filters.needs_review ? styles.reviewBtnActive : styles.reviewBtn}
        title="Needs Review"
      >
        ⚠
      </button>
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
    border: '1px solid #e8e4de',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    minWidth: 140,
    color: '#2d2116',
    background: '#fff',
  },
  reviewBtn: {
    padding: '8px 14px',
    background: '#fff',
    color: '#92400e',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  reviewBtnActive: {
    padding: '8px 14px',
    background: '#fef9c3',
    color: '#92400e',
    border: '1px solid #d97706',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  addBtn: {
    marginLeft: 'auto',
    padding: '8px 16px',
    background: '#c9a84c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
};
