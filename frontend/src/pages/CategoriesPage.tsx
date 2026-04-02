import React, { useEffect, useState } from 'react';
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  listCategories,
  updateCategory,
  updateSubcategory,
} from '../api/categories';
import type { Category, Subcategory } from '../types';

const PRESET_ICONS = [
  '🍽️','🍿','🛒','🛍️','🚌','🚗','✈️','🏠','💡','📱',
  '🏥','💆','🎬','📚','🐾','💻','🏋️','🎁','🧧','📦',
  '💸','☕','🧋','🍔','🥡','🥪','🍷','🏬','🚕','🚲',
  '🅿️','🚆','⛽','🔧','🏨','🎡','⚡','💧','🔥','🌐',
  '💊','🩺','🦷','✂️','💄','💅','🎮','📺','🎟️','🎨',
  '🎓','🔌','💰','🧴','👕','👟','👜','🏦','📈','💳',
];

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div style={styles.iconGrid}>
      {PRESET_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          style={{
            ...styles.iconBtn,
            background: value === icon ? '#dbeafe' : '#f9fafb',
            border: value === icon ? '2px solid #2563eb' : '2px solid transparent',
          }}
          title={icon}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

function SubcategoryRow({
  sub,
  onUpdate,
  onDelete,
}: {
  sub: Subcategory;
  onUpdate: (id: number, name: string, icon: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.name);
  const [icon, setIcon] = useState(sub.icon ?? '');

  async function handleSave() {
    await onUpdate(sub.id, name, icon);
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={styles.subEditRow}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.inlineInput}
        />
        <IconPicker value={icon} onChange={setIcon} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button type="button" onClick={handleSave} style={styles.saveBtn}>Save</button>
          <button type="button" onClick={() => setEditing(false)} style={styles.cancelBtn}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.subRow}>
      <span style={styles.subIcon}>{sub.icon}</span>
      <span style={styles.subName}>{sub.name}</span>
      <button type="button" onClick={() => setEditing(true)} style={styles.editIconBtn} title="Edit">✏️</button>
      <button
        type="button"
        onClick={() => onDelete(sub.id)}
        style={styles.deleteIconBtn}
        title="Delete subcategory"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  );
}

function AddSubcategoryForm({
  categoryId,
  onAdd,
}: {
  categoryId: number;
  onAdd: (categoryId: number, name: string, icon: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(categoryId, name.trim(), icon);
    setName('');
    setIcon('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={styles.addSubBtn}>
        + Add subcategory
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.addSubForm}>
      <input
        placeholder="Subcategory name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.inlineInput}
        autoFocus
      />
      <IconPicker value={icon} onChange={setIcon} />
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button type="submit" style={styles.saveBtn}>Add</button>
        <button type="button" onClick={() => setOpen(false)} style={styles.cancelBtn}>Cancel</button>
      </div>
    </form>
  );
}

function CategoryCard({
  category,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onAddSubcategory,
}: {
  category: Category;
  onUpdateCategory: (id: number, name: string, icon: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onUpdateSubcategory: (id: number, name: string, icon: string) => Promise<void>;
  onDeleteSubcategory: (id: number) => Promise<void>;
  onAddSubcategory: (categoryId: number, name: string, icon: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon ?? '');

  async function handleSaveHeader() {
    await onUpdateCategory(category.id, name, icon);
    setEditingHeader(false);
  }

  return (
    <div style={styles.card}>
      {editingHeader ? (
        <div style={styles.cardHeaderEdit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.inlineInput}
          />
          <IconPicker value={icon} onChange={setIcon} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={handleSaveHeader} style={styles.saveBtn}>Save</button>
            <button type="button" onClick={() => setEditingHeader(false)} style={styles.cancelBtn}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={styles.cardHeader}>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={styles.cardHeaderBtn}
          >
            <span style={styles.catIcon}>{category.icon}</span>
            <span style={styles.catName}>{category.name}</span>
            <span style={styles.subCount}>{category.subcategories.length}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
              {expanded ? '▲' : '▼'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setEditingHeader(true)}
            style={styles.editIconBtn}
            title="Edit category"
          >✏️</button>
          <button
            type="button"
            onClick={() => onDeleteCategory(category.id)}
            style={styles.deleteIconBtn}
            title="Delete category"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      )}

      {expanded && !editingHeader && (
        <div style={styles.cardBody}>
          {category.subcategories.map((sub) => (
            <SubcategoryRow
              key={sub.id}
              sub={sub}
              onUpdate={onUpdateSubcategory}
              onDelete={onDeleteSubcategory}
            />
          ))}
          <AddSubcategoryForm categoryId={category.id} onAdd={onAddSubcategory} />
        </div>
      )}
    </div>
  );
}

function AddCategoryForm({ onAdd }: { onAdd: (name: string, icon: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim(), icon);
    setName('');
    setIcon('');
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={styles.addCatBtn}>
        + Add category
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.addCatForm}>
      <h3 style={{ margin: 0, fontSize: 15 }}>New Category</h3>
      <input
        placeholder="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={styles.inlineInput}
        autoFocus
      />
      <IconPicker value={icon} onChange={setIcon} />
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button type="submit" style={styles.saveBtn}>Create</button>
        <button type="button" onClick={() => setOpen(false)} style={styles.cancelBtn}>Cancel</button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  async function reload() {
    const resp = await listCategories();
    setCategories(resp.categories);
  }

  useEffect(() => { reload().catch(console.error); }, []);

  async function handleUpdateCategory(id: number, name: string, icon: string) {
    await updateCategory(id, { name, icon });
    await reload();
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Delete this category and all its subcategories?')) return;
    await deleteCategory(id);
    await reload();
  }

  async function handleUpdateSubcategory(id: number, name: string, icon: string) {
    await updateSubcategory(id, { name, icon });
    await reload();
  }

  async function handleDeleteSubcategory(id: number) {
    if (!confirm('Delete this subcategory?')) return;
    await deleteSubcategory(id);
    await reload();
  }

  async function handleAddSubcategory(categoryId: number, name: string, icon: string) {
    await createSubcategory(categoryId, { name, icon: icon || null });
    await reload();
  }

  async function handleAddCategory(name: string, icon: string) {
    await createCategory({ name, icon: icon || null });
    await reload();
  }

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Categories</h1>
        <p style={styles.subtitle}>Manage your spending categories and subcategories.</p>
      </div>

      <div style={styles.grid}>
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateSubcategory={handleUpdateSubcategory}
            onDeleteSubcategory={handleDeleteSubcategory}
            onAddSubcategory={handleAddSubcategory}
          />
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <AddCategoryForm onAdd={handleAddCategory} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { marginBottom: 24 },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' },
  subtitle: { margin: '4px 0 0', fontSize: 14, color: '#6b7280' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 14,
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 14px',
  },
  cardHeaderEdit: { padding: '12px 14px' },
  cardHeaderBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  catIcon: { fontSize: 20 },
  catName: { fontSize: 14, fontWeight: 600, color: '#111827' },
  subCount: {
    fontSize: 11,
    background: '#f3f4f6',
    color: '#6b7280',
    borderRadius: 10,
    padding: '2px 7px',
    fontWeight: 500,
  },
  cardBody: {
    borderTop: '1px solid #f3f4f6',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  subRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 0',
  },
  subEditRow: { padding: '8px 0' },
  subIcon: { fontSize: 16, minWidth: 22 },
  subName: { fontSize: 13, color: '#374151', flex: 1 },
  editIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: 13,
    opacity: 0.6,
  },
  deleteIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#dc2626',
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    opacity: 0.7,
  },
  inlineInput: {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: 4,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box' as const,
    marginBottom: 8,
  },
  iconGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginBottom: 4,
  },
  iconBtn: {
    fontSize: 18,
    padding: '4px 6px',
    borderRadius: 4,
    cursor: 'pointer',
    lineHeight: 1,
  },
  saveBtn: {
    padding: '5px 12px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
  cancelBtn: {
    padding: '5px 12px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
  addSubBtn: {
    background: 'none',
    border: '1px dashed #d1d5db',
    borderRadius: 4,
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 13,
    padding: '5px 10px',
    marginTop: 4,
    width: '100%',
  },
  addSubForm: { marginTop: 8 },
  addCatBtn: {
    padding: '9px 18px',
    background: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  addCatForm: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    maxWidth: 360,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
};
