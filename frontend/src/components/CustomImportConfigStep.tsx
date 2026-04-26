import React, { useState } from 'react';
import type { ParsedRowField } from '../types';

const FIELD_OPTIONS: { value: ParsedRowField | 'ignore'; label: string }[] = [
  { value: 'ignore', label: '— ignore —' },
  { value: 'transaction_date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'description', label: 'Description (multi OK)' },
  { value: 'merchant_raw', label: 'Merchant' },
  { value: 'posted_date', label: 'Posted Date' },
  { value: 'notes', label: 'Notes / Memo' },
];

const FIELD_COLORS: Record<string, string> = {
  transaction_date: '#dbeafe',
  amount: '#dcfce7',
  description: '#fef9c3',
  merchant_raw: '#fce7f3',
  posted_date: '#e0e7ff',
  notes: '#f3e8ff',
};

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];

const DATE_FORMAT_EXAMPLES: Record<string, string> = {
  '%m/%d/%Y': '01/15/2026',
  '%Y-%m-%d': '2026-01-15',
  '%d/%m/%Y': '15/01/2026',
  '%d-%b-%Y': '15-Jan-2026',
  '%Y/%m/%d': '2026/01/15',
  '%Y%m%d': '20260115',
};

interface Props {
  headers: string[];
  previewData: Record<string, string>[];
  columnMapping: Record<string, string>;
  onColumnMappingChange: (mapping: Record<string, string>) => void;
  skipRows: number;
  onSkipRowsChange: (n: number) => void;
  isReloading: boolean;
  dateFormat: string;
  onDateFormatChange: (s: string) => void;
  currency: string;
  onCurrencyChange: (s: string) => void;
  accountType: 'debit' | 'credit' | 'investment';
  onAccountTypeChange: (t: 'debit' | 'credit' | 'investment') => void;
  onPreview: () => void;
  isLoading: boolean;
  fileName: string;
}

export default function CustomImportConfigStep({
  headers, previewData, columnMapping, onColumnMappingChange,
  skipRows, onSkipRowsChange, isReloading,
  dateFormat, onDateFormatChange,
  currency, onCurrencyChange,
  accountType, onAccountTypeChange,
  onPreview, isLoading, fileName,
}: Props) {

  const mappedValues = Object.values(columnMapping).filter((v) => v !== 'ignore');
  const hasDate = mappedValues.includes('transaction_date');
  const hasAmount = mappedValues.includes('amount');
  const canPreview = hasDate && hasAmount && !isReloading;

  const setMapping = (col: string, field: string) => {
    onColumnMappingChange({ ...columnMapping, [col]: field });
  };

  const isCustomFormat = !DATE_FORMAT_EXAMPLES[dateFormat];
  const [customFormatInput, setCustomFormatInput] = useState(isCustomFormat ? dateFormat : '');
  const dateExample = DATE_FORMAT_EXAMPLES[dateFormat] ?? (dateFormat || 'enter format above');

  return (
    <div style={styles.wrapper}>
      <div style={styles.fileTag}>{fileName}</div>

      {/* Skip rows + options row */}
      <div style={styles.optionsRow}>
        <div style={styles.optionField}>
          <label style={styles.label}>Skip rows</label>
          <div style={styles.skipRow}>
            <input
              type="number" min={0} max={20} value={skipRows}
              onChange={(e) => onSkipRowsChange(Math.max(0, parseInt(e.target.value) || 0))}
              style={styles.numberInput}
            />
            {isReloading && <span style={styles.reloadHint}>Reloading…</span>}
            <span style={styles.hintText}>Lines before the column header row</span>
          </div>
        </div>

        <div style={styles.optionField}>
          <label style={styles.label}>Date format</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <select
              value={isCustomFormat ? 'custom' : dateFormat}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  onDateFormatChange(customFormatInput);
                } else {
                  onDateFormatChange(e.target.value);
                }
              }}
              style={styles.select}
            >
              {Object.entries(DATE_FORMAT_EXAMPLES).map(([fmt, ex]) => (
                <option key={fmt} value={fmt}>{fmt} — e.g. {ex}</option>
              ))}
              <option value="custom">Custom…</option>
            </select>
            {isCustomFormat && (
              <input
                type="text"
                placeholder="%d/%m/%Y"
                value={customFormatInput}
                onChange={(e) => {
                  setCustomFormatInput(e.target.value);
                  onDateFormatChange(e.target.value);
                }}
                style={styles.select}
              />
            )}
            <span style={styles.hintText}>e.g. {dateExample}</span>
          </div>
        </div>

        <div style={styles.optionField}>
          <label style={styles.label}>Currency</label>
          <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ ...styles.select, width: 100 }}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={styles.optionField}>
          <label style={styles.label}>Account type</label>
          <div style={styles.radioGroup}>
            {(['debit', 'credit', 'investment'] as const).map((t) => (
              <label key={t} style={styles.radioLabel}>
                <input type="radio" name="accountType" value={t}
                  checked={accountType === t} onChange={() => onAccountTypeChange(t)} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Validation hints */}
      {(!hasDate || !hasAmount) && (
        <div style={styles.warning}>
          Required: {[!hasDate && 'Date', !hasAmount && 'Amount'].filter(Boolean).join(', ')} — assign below
        </div>
      )}

      {/* CSV preview table with column mapping selectors */}
      <div style={styles.tableWrap}>
        {isReloading ? (
          <div style={styles.loadingOverlay}>Reloading preview…</div>
        ) : headers.length === 0 ? (
          <div style={styles.loadingOverlay}>No columns detected — try adjusting skip rows.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {headers.map((col) => {
                  const field = columnMapping[col] ?? 'ignore';
                  return (
                    <th key={col} style={{ ...styles.th, background: FIELD_COLORS[field] ?? '#faf8f4' }}>
                      <select
                        value={field}
                        onChange={(e) => setMapping(col, e.target.value)}
                        style={styles.colSelect}
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div style={styles.colName}>{col}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {previewData.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} style={{ ...styles.td, color: '#9b9590', textAlign: 'center', padding: 16 }}>
                    No data rows found
                  </td>
                </tr>
              ) : (
                previewData.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#faf8f4' }}>
                    {headers.map((col) => (
                      <td key={col} style={{ ...styles.td, background: FIELD_COLORS[columnMapping[col] ?? 'ignore'] ? `${FIELD_COLORS[columnMapping[col]]}55` : undefined }}>
                        {row[col] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.footer}>
        <span style={{ fontSize: 12, color: '#9b9590' }}>
          Select <strong>Description</strong> on multiple columns to concatenate them
        </span>
        <button onClick={onPreview} style={styles.previewBtn} disabled={!canPreview || isLoading}>
          {isLoading ? 'Parsing…' : 'Preview →'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 20 },
  fileTag: {
    display: 'inline-block', background: '#f5f1eb', color: '#6b6560',
    fontSize: 12, padding: '3px 10px', borderRadius: 4, alignSelf: 'flex-start',
  },
  optionsRow: {
    display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start',
    background: '#faf8f4', border: '1px solid #e8e4de', borderRadius: 6, padding: 16,
  },
  optionField: { display: 'flex', flexDirection: 'column', gap: 6 },
  skipRow: { display: 'flex', alignItems: 'center', gap: 10 },
  label: { fontSize: 12, fontWeight: 600, color: '#6b6560' },
  hintText: { fontSize: 11, color: '#9b9590' },
  reloadHint: { fontSize: 12, color: '#c9a84c', fontStyle: 'italic' },
  numberInput: {
    padding: '6px 10px', border: '1px solid #e8e4de', borderRadius: 6,
    fontSize: 13, width: 64, color: '#2d2116',
  },
  select: {
    padding: '6px 10px', border: '1px solid #e8e4de', borderRadius: 6,
    fontSize: 13, color: '#2d2116', background: '#fff',
  },
  radioGroup: { display: 'flex', gap: 12 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#2d2116', cursor: 'pointer' },
  warning: {
    background: '#fef9ec', border: '1px solid #f0d07a', borderRadius: 4,
    padding: '7px 12px', fontSize: 13, color: '#92710f',
  },
  tableWrap: {
    overflowX: 'auto', border: '1px solid #e8e4de', borderRadius: 6,
    position: 'relative', minHeight: 80,
  },
  loadingOverlay: {
    padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#9b9590',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #e8e4de',
    borderRight: '1px solid #e8e4de', minWidth: 120, verticalAlign: 'top',
  },
  colSelect: {
    width: '100%', padding: '4px 6px', border: '1px solid #d0ccc8', borderRadius: 4,
    fontSize: 12, color: '#2d2116', background: '#fff', marginBottom: 4,
  },
  colName: {
    fontSize: 11, fontWeight: 600, color: '#6b6560',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  td: {
    padding: '6px 10px', borderBottom: '1px solid #f0ede8',
    borderRight: '1px solid #f0ede8', color: '#2d2116',
    maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  previewBtn: {
    padding: '9px 28px', background: '#c9a84c', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
};
