import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CategoryIcon from './CategoryIcon';

export interface IconSelectOption {
  value: string;
  label: string;
  icon?: string | null;
}

interface IconSelectProps {
  value: string;
  options: IconSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  initialOpen?: boolean;
  onClose?: () => void;
  /** Render dropdown via portal (use inside overflow:hidden/auto containers like tables) */
  portal?: boolean;
}

export default function IconSelect({
  value,
  options,
  placeholder = '— None —',
  onChange,
  disabled = false,
  style,
  initialOpen = false,
  onClose,
  portal = false,
}: IconSelectProps) {
  const [open, setOpen] = useState(initialOpen);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  function computePos() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 180);
    const IDEAL_HEIGHT = 480;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    let top: number;
    let maxHeight: number;
    if (spaceBelow >= Math.min(IDEAL_HEIGHT, 120) || spaceBelow >= spaceAbove) {
      top = rect.bottom + 2;
      maxHeight = Math.min(IDEAL_HEIGHT, spaceBelow);
    } else {
      maxHeight = Math.min(IDEAL_HEIGHT, spaceAbove);
      top = rect.top - maxHeight - 2;
    }
    setDropdownPos({ top, left: rect.left, width, maxHeight });
  }

  // Recompute position on open and track scroll so dropdown follows its anchor
  useEffect(() => {
    if (open && portal) {
      computePos();
      window.addEventListener('scroll', computePos, true);
      return () => window.removeEventListener('scroll', computePos, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, portal]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const outsideRef = ref.current && !ref.current.contains(target);
      // Also check portal dropdown if rendered
      const portalDropdown = document.getElementById('icon-select-portal-dropdown');
      const outsidePortal = !portalDropdown || !portalDropdown.contains(target);
      if (outsideRef && outsidePortal && open) {
        setOpen(false);
        onClose?.();
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
  }

  const dropdown = open && (
    <div
      id={portal ? 'icon-select-portal-dropdown' : undefined}
      onClick={(e) => e.stopPropagation()}
      style={portal && dropdownPos ? {
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #e8e4de',
        borderRadius: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxHeight: dropdownPos.maxHeight,
        overflowY: 'auto',
      } : dropdownStyle}
    >
      <div style={optionStyle(false)} onMouseDown={() => handleSelect('')}>
        <span style={{ color: '#a89880' }}>{placeholder}</span>
      </div>
      {options.map((opt) => (
        <div
          key={opt.value}
          style={optionStyle(opt.value === value)}
          onMouseDown={() => handleSelect(opt.value)}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {opt.icon
              ? <CategoryIcon name={opt.icon} size={14} color={opt.value === value ? '#c9a84c' : '#6b6560'} />
              : <span style={{ width: 14 }} />
            }
            {opt.label}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          ...triggerStyle,
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          {selected?.icon && (
            <CategoryIcon name={selected.icon} size={14} color="#6b6560" />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? '#2d2116' : '#a89880' }}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <span style={{ fontSize: 10, color: '#a89880', flexShrink: 0 }}>▼</span>
      </button>

      {portal ? (dropdown && createPortal(dropdown, document.body)) : dropdown}
    </div>
  );
}

const triggerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 6,
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #e8e4de',
  borderRadius: 4,
  fontSize: 14,
  background: '#fff',
  boxSizing: 'border-box',
  textAlign: 'left',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 100,
  background: '#fff',
  border: '1px solid #e8e4de',
  borderRadius: 4,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  maxHeight: 400,
  overflowY: 'auto',
  marginTop: 2,
};

function optionStyle(selected: boolean): React.CSSProperties {
  return {
    padding: '8px 10px',
    cursor: 'pointer',
    background: selected ? '#fef9ec' : '#fff',
    color: selected ? '#92400e' : '#2d2116',
    fontWeight: selected ? 500 : 400,
    fontSize: 14,
  };
}
