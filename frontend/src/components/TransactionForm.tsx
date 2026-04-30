import React, { useEffect, useState } from 'react';
import type { Category, Transaction, TransactionCreate } from '../types';

interface TransactionFormProps {
  initialValues?: Transaction;
  categories: Category[];
  onSubmit: (data: TransactionCreate) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  onDelete?: () => void;
}

type AddTypeMode = 'expense' | 'return' | 'transfer' | 'income';
type EditTypeMode = 'expense' | 'transfer' | 'income';

const ADD_TYPE_BUTTONS: { value: AddTypeMode; label: string }[] = [
  { value: 'expense',  label: 'Expense' },
  { value: 'return',   label: 'Return' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'income',   label: 'Income' },
];

const EDIT_TYPE_BUTTONS: { value: EditTypeMode; label: string }[] = [
  { value: 'expense',  label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'income',   label: 'Income' },
];

const TYPE_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  expense:  { border: '#c0392b', bg: '#fee2e2', text: '#c0392b' },
  return:   { border: '#5a8a6a', bg: '#f0fdf4', text: '#5a8a6a' },
  transfer: { border: '#075985', bg: '#e0f2fe', text: '#075985' },
  income:   { border: '#5a8a6a', bg: '#f0fdf4', text: '#5a8a6a' },
};

const EMPTY: TransactionCreate = {
  transaction_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
  amount: 0,
  currency: 'CAD',
  merchant_normalized: '',
  description: '',
  transaction_type: 'expense',
  category: '',
  subcategory: '',
  notes: '',
  source_type: 'manual',
  source_name: 'Cash',
};

function toFormValues(tx: Transaction): TransactionCreate {
  return {
    transaction_date: tx.transaction_date,
    amount: tx.amount,
    currency: tx.currency,
    merchant_normalized: tx.merchant_normalized ?? '',
    description: tx.description ?? '',
    transaction_type: tx.transaction_type ?? 'expense',
    category: tx.category ?? '',
    subcategory: tx.subcategory ?? '',
    notes: tx.notes ?? '',
    source_type: tx.source_type as 'csv' | 'manual',
    source_name: tx.source_name ?? '',
  };
}

export default function TransactionForm({
  initialValues,
  categories,
  onSubmit,
  onCancel,
  isLoading,
  onDelete,
}: TransactionFormProps) {
  const isEdit = !!initialValues;

  const [form, setForm] = useState<TransactionCreate>(
    initialValues ? toFormValues(initialValues) : EMPTY
  );
  // For add mode, track the UI button separately (expense/return/transfer/income)
  const [addMode, setAddMode] = useState<AddTypeMode>('expense');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialValues ? toFormValues(initialValues) : EMPTY);
    setAddMode('expense');
    setError(null);
  }, [initialValues]);

  const handleCategoryChange = (cat: string) => {
    setForm((f) => ({ ...f, category: cat, subcategory: '' }));
  };

  const effectiveType = isEdit
    ? (form.transaction_type ?? null)
    : (addMode === 'return' ? 'expense' : addMode);

  const filteredCategories = categories.filter(
    (c) => !c.transaction_type || c.transaction_type === effectiveType
  );

  const subcategories =
    categories.find((c) => c.name === form.category)?.subcategories ?? [];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.transaction_date) { setError('Date is required'); return; }
    if (form.amount === undefined || form.amount === null || String(form.amount) === '') {
      setError('Amount is required'); return;
    }

    let amount = Number(form.amount);
    let transaction_type = form.transaction_type ?? 'expense';

    if (!isEdit) {
      // Map UI mode to stored values
      if (addMode === 'expense') {
        transaction_type = 'expense';
        amount = -Math.abs(amount);
      } else if (addMode === 'return') {
        transaction_type = 'expense';
        amount = Math.abs(amount);
      } else {
        transaction_type = addMode; // 'transfer' | 'income'
      }
    } else {
      // In edit mode, normalize the sign to match the selected type
      if (transaction_type === 'expense') {
        amount = -Math.abs(amount);
      } else if (transaction_type === 'income') {
        amount = Math.abs(amount);
      }
      // 'transfer' keeps the sign as-is (user-entered)
    }

    try {
      await onSubmit({
        ...form,
        amount,
        transaction_type,
        merchant_normalized: form.merchant_normalized || null,
        description: form.description || null,
        category: form.category || null,
        subcategory: form.subcategory || null,
        notes: form.notes || null,
        source_name: form.source_name || null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.error}>{error}</div>}

      {/* Type buttons */}
      <div style={styles.typeBtnRow}>
        {isEdit
          ? EDIT_TYPE_BUTTONS.map((btn) => {
              const active = (form.transaction_type ?? 'expense') === btn.value;
              const colors = TYPE_COLORS[btn.value];
              return (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, transaction_type: btn.value }))}
                  style={{
                    ...styles.typeBtn,
                    flex: 1,
                    border: active ? `2px solid ${colors.border}` : '2px solid #e8e4de',
                    background: active ? colors.bg : '#fff',
                    color: active ? colors.text : '#6b6560',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {btn.label}
                </button>
              );
            })
          : ADD_TYPE_BUTTONS.map((btn) => {
              const active = addMode === btn.value;
              const colors = TYPE_COLORS[btn.value];
              return (
                <button
                  key={btn.value}
                  type="button"
                  onClick={() => setAddMode(btn.value)}
                  style={{
                    ...styles.typeBtn,
                    flex: 1,
                    border: active ? `2px solid ${colors.border}` : '2px solid #e8e4de',
                    background: active ? colors.bg : '#fff',
                    color: active ? colors.text : '#6b6560',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {btn.label}
                </button>
              );
            })
        }
      </div>

      <div style={styles.row}>
        <label style={styles.label}>
          Date *
          <input
            type="date"
            name="transaction_date"
            value={form.transaction_date}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Amount *
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            step="0.01"
            required
            style={styles.input}
            placeholder="12.50"
          />
        </label>
      </div>

      <div style={styles.row}>
        <label style={styles.label}>
          Currency
          <select name="currency" value={form.currency} onChange={handleChange} style={styles.input}>
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </label>
        <label style={styles.label}>
          Merchant
          <input
            type="text"
            name="merchant_normalized"
            value={form.merchant_normalized ?? ''}
            onChange={handleChange}
            style={styles.input}
            placeholder="Starbucks"
          />
        </label>
      </div>

      <label style={styles.labelFull}>
        Description
        <input
          type="text"
          name="description"
          value={form.description ?? ''}
          onChange={handleChange}
          style={styles.input}
          placeholder="Optional description"
        />
      </label>

      <div style={styles.row}>
        <label style={styles.label}>
          Category
          <select
            value={form.category ?? ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={styles.input}
          >
            <option value="">— None —</option>
            {filteredCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label style={styles.label}>
          Subcategory
          <select
            value={form.subcategory ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
            style={styles.input}
            disabled={subcategories.length === 0}
          >
            <option value="">— None —</option>
            {subcategories.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <label style={styles.labelFull}>
        Notes
        <textarea
          name="notes"
          value={form.notes ?? ''}
          onChange={handleChange}
          rows={2}
          style={{ ...styles.input, resize: 'vertical' }}
          placeholder="Optional notes"
        />
      </label>

      <label style={styles.labelFull}>
        Account / Source Name
        <input
          type="text"
          name="source_name"
          value={form.source_name ?? ''}
          onChange={handleChange}
          style={styles.input}
          placeholder="e.g. Chase Sapphire"
        />
      </label>

      <div style={styles.actions}>
        {onDelete && (
          <button type="button" onClick={onDelete} style={styles.deleteBtn} disabled={isLoading}>
            Delete
          </button>
        )}
        <div style={styles.rightActions}>
          <button type="button" onClick={onCancel} style={styles.cancelBtn} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" style={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 14,
  },
  typeBtnRow: { display: 'flex', gap: 6 },
  typeBtn: {
    padding: '7px 0',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    transition: 'background 0.1s, border-color 0.1s',
  },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 500 },
  labelFull: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 500 },
  input: {
    padding: '7px 10px',
    border: '1px solid #e8e4de',
    borderRadius: 4,
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    color: '#2d2116',
  },
  actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  rightActions: { display: 'flex', gap: 8 },
  cancelBtn: {
    padding: '8px 16px',
    border: '1px solid #e8e4de',
    borderRadius: 4,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b6560',
  },
  submitBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 4,
    background: '#c9a84c',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  deleteBtn: {
    padding: '8px 16px',
    border: '1px solid #c0392b',
    borderRadius: 4,
    background: '#fff',
    color: '#c0392b',
    cursor: 'pointer',
    fontSize: 14,
  },
};
