import React, { useEffect, useRef, useState } from 'react';

export interface MonthValue {
  year: number;
  month: number; // 1-based (1=Jan)
}

interface MonthPickerProps {
  value: MonthValue | null;
  onChange: (v: MonthValue | null) => void;
  clearable?: boolean;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatLabel(v: MonthValue): string {
  return new Date(v.year, v.month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthPicker({ value, onChange, clearable = true }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [gridYear, setGridYear] = useState(value?.year ?? new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  function navigateMonth(delta: number) {
    const base = value ?? getPrevMonth();
    let m = base.month + delta;
    let y = base.year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    onChange({ year: y, month: m });
  }

  function getPrevMonth(): MonthValue {
    const now = new Date();
    const m = now.getMonth(); // 0-based
    return m === 0 ? { year: now.getFullYear() - 1, month: 12 } : { year: now.getFullYear(), month: m };
  }

  function handleLabelClick() {
    setGridYear(value?.year ?? new Date().getFullYear());
    setIsOpen((v) => !v);
  }

  function handleMonthSelect(month: number) {
    onChange({ year: gridYear, month });
    setIsOpen(false);
  }

  const label = value ? formatLabel(value) : 'All time';

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.control}>
        <button type="button" onClick={() => navigateMonth(-1)} style={styles.arrowBtn} title="Previous month">‹</button>
        <button type="button" onClick={handleLabelClick} style={styles.labelBtn}>
          {label}
        </button>
        <button type="button" onClick={() => navigateMonth(1)} style={styles.arrowBtn} title="Next month">›</button>
        {clearable && value && (
          <button type="button" onClick={() => onChange(null)} style={styles.clearBtn} title="Clear">×</button>
        )}
      </div>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.yearNav}>
            <button type="button" onClick={() => setGridYear((y) => y - 1)} style={styles.yearArrow}>‹</button>
            <span style={styles.yearLabel}>{gridYear}</span>
            <button type="button" onClick={() => setGridYear((y) => y + 1)} style={styles.yearArrow}>›</button>
          </div>
          <div style={styles.monthGrid}>
            {MONTHS_SHORT.map((name, i) => {
              const isSelected = value?.year === gridYear && value?.month === i + 1;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleMonthSelect(i + 1)}
                  style={{
                    ...styles.monthCell,
                    background: isSelected ? '#c9a84c' : 'transparent',
                    color: isSelected ? '#fff' : '#2d2116',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-flex',
    flexDirection: 'column',
  },
  control: {
    display: 'inline-flex',
    alignItems: 'center',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    background: '#fff',
    overflow: 'hidden',
    height: 36,
  },
  arrowBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    color: '#6b6560',
    padding: '0 8px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  labelBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#2d2116',
    padding: '0 6px',
    whiteSpace: 'nowrap',
    minWidth: 110,
    textAlign: 'center',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    borderLeft: '1px solid #e8e4de',
    cursor: 'pointer',
    fontSize: 16,
    color: '#6b6560',
    padding: '0 8px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 200,
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(45,33,22,0.12)',
    padding: 12,
    minWidth: 200,
  },
  yearNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: '0 4px',
  },
  yearArrow: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 18,
    color: '#6b6560',
    padding: '2px 6px',
    lineHeight: 1,
  },
  yearLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d2116',
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 4,
  },
  monthCell: {
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 12,
    padding: '6px 4px',
    textAlign: 'center',
  },
};
