import React from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const isMobile = useIsMobile();
  const totalPages = Math.ceil(total / pageSize);
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);

  if (total === 0) return null;

  const btnStyle: React.CSSProperties = {
    ...styles.btn,
    padding: isMobile ? '10px 18px' : '6px 12px',
    minHeight: isMobile ? 44 : undefined,
  };

  return (
    <div style={styles.bar}>
      <span style={styles.info}>
        {start}–{end} of {total}
      </span>
      <div style={styles.buttons}>
        <button
          style={btnStyle}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          {isMobile ? '←' : '← Prev'}
        </button>
        <span style={styles.pageNum}>
          {page} / {totalPages}
        </span>
        <button
          style={btnStyle}
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          {isMobile ? '→' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    fontSize: 14,
  },
  info: { color: '#6b6560' },
  buttons: { display: 'flex', gap: 8, alignItems: 'center' },
  btn: {
    border: '1px solid #e8e4de',
    borderRadius: 4,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    color: '#2d2116',
  },
  pageNum: { color: '#2d2116', fontWeight: 500 },
};
