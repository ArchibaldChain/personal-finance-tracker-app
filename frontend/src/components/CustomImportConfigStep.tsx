import React from 'react';
import type { ParsedRowField } from '../types';

const FIELD_OPTIONS: { value: ParsedRowField | 'ignore'; label: string; required?: boolean }[] = [
  { value: 'transaction_date', label: 'Date', required: true },
  { value: 'amount', label: 'Amount (single column)', required: true },
  { value: 'description', label: 'Description', required: true },
  { value: 'merchant_raw', label: 'Merchant' },
  { value: 'posted_date', label: 'Posted Date' },
  { value: 'notes', label: 'Notes / Memo' },
  { value: 'ignore', label: '— ignore —' },
];

const REQUIRED_FIELDS: ParsedRowField[] = ['transaction_date', 'description'];

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];

const DATE_FORMAT_EXAMPLES: Record<string, string> = {
  '%m/%d/%Y': '01/15/2026',
  '%Y-%m-%d': '2026-01-15',
  '%d/%m/%Y': '15/01/2026',
  '%d-%b-%Y': '15-Jan-2026',
  '%Y/%m/%d': '2026/01/15',
};

interface Props {
  headers: string[];
  columnMapping: Record<string, string>;
  onColumnMappingChange: (mapping: Record<string, string>) => void;
  skipRows: number;
  onSkipRowsChange: (n: number) => void;
  amountMode: 'single' | 'split';
  onAmountModeChange: (m: 'single' | 'split') => void;
  debitColumn: string;
  onDebitColumnChange: (s: string) => void;
  creditColumn: string;
  onCreditColumnChange: (s: string) => void;
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
  headers, columnMapping, onColumnMappingChange,
  skipRows, onSkipRowsChange,
  amountMode, onAmountModeChange,
  debitColumn, onDebitColumnChange,
  creditColumn, onCreditColumnChange,
  dateFormat, onDateFormatChange,
  currency, onCurrencyChange,
  accountType, onAccountTypeChange,
  onPreview, isLoading, fileName,
}: Props) {

  const mappedFields = Object.values(columnMapping).filter((v) => v !== 'ignore');
  const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedFields.includes(f));
  const missingAmount = amountMode === 'single' && !mappedFields.includes('amount');
  const canPreview = missingRequired.length === 0 && !missingAmount;

  const setMapping = (col: string, field: string) => {
    onColumnMappingChange({ ...columnMapping, [col]: field });
  };

  const dateExample = DATE_FORMAT_EXAMPLES[dateFormat] ?? 'custom format';

  return (
    <div style={styles.wrapper}>
      <div style={styles.fileTag}>{fileName}</div>

      {/* Skip rows */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Skip rows</h3>
        <p style={styles.sectionHint}>How many lines before the column header row (e.g. bank metadata lines)?</p>
        <input
          type="number" min={0} max={20} value={skipRows}
          onChange={(e) => onSkipRowsChange(Math.max(0, parseInt(e.target.value) || 0))}
          style={styles.numberInput}
        />
      </section>

      {/* Column mapping */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Column mapping</h3>
        {missingRequired.length > 0 && (
          <div style={styles.warning}>
            Required fields not yet mapped: <strong>{missingRequired.join(', ')}</strong>
          </div>
        )}
        {missingAmount && amountMode === 'single' && (
          <div style={styles.warning}>Required field not yet mapped: <strong>amount</strong></div>
        )}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>CSV column</th>
              <th style={styles.th}>Maps to</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((col) => (
              <tr key={col}>
                <td style={styles.td}><code style={styles.colName}>{col}</code></td>
                <td style={styles.td}>
                  <select
                    value={columnMapping[col] ?? 'ignore'}
                    onChange={(e) => setMapping(col, e.target.value)}
                    style={styles.select}
                  >
                    {FIELD_OPTIONS
                      .filter((opt) => !(amountMode === 'split' && opt.value === 'amount'))
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Amount handling */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Amount handling</h3>
        <div style={styles.radioGroup}>
          {(['single', 'split'] as const).map((mode) => (
            <label key={mode} style={styles.radioLabel}>
              <input type="radio" name="amountMode" value={mode}
                checked={amountMode === mode} onChange={() => onAmountModeChange(mode)} />
              {mode === 'single' ? 'Single signed column (positive = income, negative = expense)' : 'Separate debit / credit columns'}
            </label>
          ))}
        </div>
        {amountMode === 'split' && (
          <div style={styles.splitCols}>
            <div style={styles.field}>
              <label style={styles.label}>Debit column (expenses)</label>
              <select value={debitColumn} onChange={(e) => onDebitColumnChange(e.target.value)} style={styles.select}>
                <option value="">— none —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Credit column (income)</label>
              <select value={creditColumn} onChange={(e) => onCreditColumnChange(e.target.value)} style={styles.select}>
                <option value="">— none —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Date format */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Date format</h3>
        <div style={styles.field}>
          <select value={dateFormat} onChange={(e) => onDateFormatChange(e.target.value)} style={styles.select}>
            {Object.entries(DATE_FORMAT_EXAMPLES).map(([fmt, ex]) => (
              <option key={fmt} value={fmt}>{fmt} — e.g. {ex}</option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {dateFormat === 'custom' && (
            <input
              type="text" placeholder="%d/%m/%Y"
              onChange={(e) => onDateFormatChange(e.target.value)}
              style={{ ...styles.select, marginTop: 6 }}
            />
          )}
          <p style={styles.sectionHint}>Example: <code>{dateExample}</code></p>
        </div>
      </section>

      {/* Currency */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Currency</h3>
        <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={{ ...styles.select, maxWidth: 120 }}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </section>

      {/* Account type */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Account type</h3>
        <div style={styles.radioGroup}>
          {(['debit', 'credit', 'investment'] as const).map((t) => (
            <label key={t} style={styles.radioLabel}>
              <input type="radio" name="accountType" value={t}
                checked={accountType === t} onChange={() => onAccountTypeChange(t)} />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
      </section>

      <div style={styles.footer}>
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
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#2d2116', margin: 0 },
  sectionHint: { fontSize: 12, color: '#9b9590', margin: 0 },
  warning: {
    background: '#fef9ec', border: '1px solid #f0d07a', borderRadius: 4,
    padding: '7px 12px', fontSize: 13, color: '#92710f',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b6560',
    padding: '6px 8px', borderBottom: '1px solid #e8e4de',
  },
  td: { padding: '5px 8px', borderBottom: '1px solid #f0ede8' },
  colName: { fontSize: 13, background: '#f5f1eb', padding: '2px 6px', borderRadius: 3 },
  select: {
    padding: '7px 10px', border: '1px solid #e8e4de', borderRadius: 6,
    fontSize: 13, color: '#2d2116', background: '#fff', width: '100%',
  },
  numberInput: {
    padding: '7px 10px', border: '1px solid #e8e4de', borderRadius: 6,
    fontSize: 13, width: 80, color: '#2d2116',
  },
  radioGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  radioLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2d2116', cursor: 'pointer' },
  splitCols: { display: 'flex', gap: 16, marginTop: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  label: { fontSize: 12, fontWeight: 500, color: '#6b6560' },
  footer: { display: 'flex', justifyContent: 'flex-end', paddingTop: 8 },
  previewBtn: {
    padding: '9px 28px', background: '#c9a84c', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
};
