import React, { useEffect, useRef, useState } from 'react';
import type { Category, Source, TransactionFilters } from '../types';
import MonthPicker, { MonthValue } from './MonthPicker';

interface TransactionFiltersBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  categories: Category[];
  sources: Source[];
  onAddClick: () => void;
  month: MonthValue | null;
  onMonthChange: (v: MonthValue | null) => void;
  hasNeedsReview?: boolean;
  hasDuplicates?: boolean;
}

export default function TransactionFiltersBar({
  filters,
  onChange,
  categories,
  sources,
  onAddClick,
  month,
  onMonthChange,
  hasNeedsReview = false,
  hasDuplicates = false,
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

  const handleSourceType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, source_type: e.target.value || undefined, page: 1 });
  };

  const handleNeedsReview = () => {
    onChange({ ...filters, needs_review: !filters.needs_review, page: 1 });
  };

  const handleDuplicates = () => {
    onChange({ ...filters, is_duplicate: !filters.is_duplicate, page: 1 });
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
      <select
        value={filters.category ?? ''}
        onChange={(e) => onChange({ ...filters, category: e.target.value || undefined, page: 1 })}
        style={styles.input}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select value={filters.source_type ?? ''} onChange={handleSourceType} style={styles.input}>
        <option value="">All sources</option>
        <option value="manual">Manual</option>
        {sources.map((s) => (
          <option key={s.key} value={s.key}>{s.display_name}</option>
        ))}
      </select>
      {(hasNeedsReview || filters.needs_review) && (
        <button
          onClick={handleNeedsReview}
          style={filters.needs_review ? styles.reviewBtnActive : styles.reviewBtn}
          title="Needs Review"
        >
          ⚠
        </button>
      )}
      {(hasDuplicates || filters.is_duplicate) && (
        <button
          onClick={handleDuplicates}
          style={filters.is_duplicate ? styles.dupBtnActive : styles.dupBtn}
          title="Duplicates only"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      )}
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
  dupBtn: {
    padding: '8px 12px',
    background: '#fff',
    color: '#c0392b',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  dupBtnActive: {
    padding: '8px 12px',
    background: '#fee2e2',
    color: '#c0392b',
    border: '1px solid #c0392b',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
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
