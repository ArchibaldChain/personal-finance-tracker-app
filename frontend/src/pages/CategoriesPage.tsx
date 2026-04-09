import React, { useEffect, useState } from 'react';
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  listCategories,
  reorderCategories,
  updateCategory,
  updateSubcategory,
} from '../api/categories';
import CategoryIcon, { ALL_ICON_NAMES } from '../components/CategoryIcon';
import { useApp } from '../context/AppContext';
import type { Category, Subcategory } from '../types';

const CAT_BADGE_COLORS = [
  { bg: '#fef9ec', text: '#92400e' },
  { bg: '#fee2e2', text: '#c0392b' },
  { bg: '#f0fdf4', text: '#5a8a6a' },
  { bg: '#fff7ed', text: '#9a3412' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ecfdf5', text: '#065f46' },
  { bg: '#fef3c7', text: '#78350f' },
  { bg: '#ffe4e6', text: '#9f1239' },
  { bg: '#e0f2fe', text: '#075985' },
  { bg: '#fdf2f8', text: '#86198f' },
];

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <div style={styles.iconGrid}>
      {ALL_ICON_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          style={{
            ...styles.iconBtn,
            background: value === name ? '#fef9ec' : '#faf8f4',
            border: value === name ? '2px solid #c9a84c' : '2px solid transparent',
          }}
          title={name}
        >
          <CategoryIcon name={name} size={18} color={value === name ? '#c9a84c' : '#6b6560'} />
        </button>
      ))}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

interface SubcategoryRowProps {
  sub: Subcategory;
  onUpdate: (id: number, name: string, icon: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function SubcategoryRow({ sub, onUpdate, onDelete }: SubcategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.name);
  const [icon, setIcon] = useState(sub.icon ?? '');

  async function handleSave() {
    await onUpdate(sub.id, name, icon);
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={styles.subEditBlock}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.inlineInput}
          autoFocus
        />
        <IconPicker value={icon} onChange={setIcon} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button type="button" onClick={handleSave} style={styles.saveBtn} className="cat-btn-sub">Save</button>
          <button type="button" onClick={() => setEditing(false)} style={styles.cancelBtn} className="cat-btn-cancel">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.subRow}>
      <span style={styles.subIconBadge}>
        <CategoryIcon name={sub.icon} size={14} color="#6b6560" />
      </span>
      <span style={styles.subName}>{sub.name}</span>
      <button type="button" onClick={() => setEditing(true)} style={styles.iconActionBtn} title="Edit">
        <PencilIcon />
      </button>
      <button type="button" onClick={() => onDelete(sub.id)} style={{ ...styles.iconActionBtn, color: '#c0392b' }} title="Delete">
        <TrashIcon />
      </button>
    </div>
  );
}

interface AddSubcategoryFormProps {
  categoryId: number;
  onAdd: (categoryId: number, name: string, icon: string) => Promise<void>;
}

function AddSubcategoryForm({ categoryId, onAdd }: AddSubcategoryFormProps) {
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
        + Add Subcategory
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
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button type="submit" style={styles.saveBtn} className="cat-btn-sub">Add</button>
        <button type="button" onClick={() => setOpen(false)} style={styles.cancelBtn} className="cat-btn-cancel">Cancel</button>
      </div>
    </form>
  );
}

// ---- Main Page ----

export default function CategoriesPage() {
  const { ledgerId } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Right panel edit state
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');

  // New category form state
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');

  const selectedCategory = categories.find((c) => c.id === selectedId) ?? null;

  async function reload() {
    const resp = await listCategories(ledgerId ?? undefined);
    setCategories(resp.categories);
  }

  useEffect(() => { reload().catch(console.error); }, [ledgerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync edit fields when selection changes
  useEffect(() => {
    if (selectedCategory) {
      setEditName(selectedCategory.name);
      setEditIcon(selectedCategory.icon ?? '');
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveCategory() {
    if (!selectedCategory) return;
    await updateCategory(selectedCategory.id, { name: editName, icon: editIcon || null });
    await reload();
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Delete this category and all its subcategories?')) return;
    await deleteCategory(id);
    if (selectedId === id) setSelectedId(null);
    await reload();
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const newOrder = [...categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setCategories(newOrder);
    await reorderCategories(newOrder.map((c) => c.id));
  }

  async function handleUpdateSubcategory(id: number, name: string, icon: string) {
    await updateSubcategory(id, { name, icon: icon || null });
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

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = await createCategory({ name: newName.trim(), icon: newIcon || null });
    setNewName('');
    setNewIcon('');
    setIsAddingCategory(false);
    await reload();
    setSelectedId(created.id);
  }

  return (
    <div style={styles.layout}>
      <style>{`
        .cat-btn-primary:active { background: #a8872f !important; transform: scale(0.96); }
        .cat-btn-cancel:active  { background: #ece8e0 !important; transform: scale(0.96); }
        .cat-btn-sub:active     { background: #a8872f !important; transform: scale(0.96); }
        .cat-btn-primary, .cat-btn-cancel, .cat-btn-sub { transition: background 0.1s, transform 0.08s; }
      `}</style>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftScroll}>
          {categories.map((cat, i) => {
            const color = CAT_BADGE_COLORS[i % CAT_BADGE_COLORS.length];
            return (
            <div
              key={cat.id}
              style={{
                ...styles.catRow,
                background: selectedId === cat.id ? '#fef9ec' : '#fff',
              }}
              onClick={() => { setSelectedId(cat.id); setIsAddingCategory(false); }}
            >
              <span style={{ ...styles.catIconBadge, background: color.bg }}>
                <CategoryIcon name={cat.icon} size={18} color={color.text} />
              </span>
              <div style={styles.catInfo}>
                <span style={styles.catName}>{cat.name}</span>
                <span style={styles.subCountPill}>{cat.subcategories.length} subcategories</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleMove(i, 'up'); }}
                style={{ ...styles.iconActionBtn, opacity: i === 0 ? 0.2 : 1 }}
                disabled={i === 0}
                title="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleMove(i, 'down'); }}
                style={{ ...styles.iconActionBtn, opacity: i === categories.length - 1 ? 0.2 : 1 }}
                disabled={i === categories.length - 1}
                title="Move down"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedId(cat.id); setIsAddingCategory(false); }}
                style={styles.iconActionBtn}
                title="Edit"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                style={{ ...styles.iconActionBtn, color: '#c0392b' }}
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => { setIsAddingCategory(true); setSelectedId(null); }}
          style={styles.addCatBtn}
          className="cat-btn-primary"
        >
          + Add Category
        </button>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        {isAddingCategory ? (
          <form onSubmit={handleCreateCategory} style={styles.detailContent}>
            <h2 style={styles.detailHeading}>New Category</h2>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Category Icon</label>
              <IconPicker value={newIcon} onChange={setNewIcon} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Category Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={styles.fieldInput}
                placeholder="e.g. Food & Dining"
                autoFocus
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={styles.saveChangesBtn} className="cat-btn-primary">Create Category</button>
              <button type="button" onClick={() => setIsAddingCategory(false)} style={styles.cancelBtnLg} className="cat-btn-cancel">Cancel</button>
            </div>
          </form>
        ) : selectedCategory ? (
          <div style={styles.detailContent}>
            <h2 style={styles.detailHeading}>Category Details</h2>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Category Icon</label>
              <IconPicker value={editIcon} onChange={setEditIcon} />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Category Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={styles.fieldInput}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Subcategories</label>
              <div style={styles.subList}>
                {selectedCategory.subcategories.map((sub) => (
                  <SubcategoryRow
                    key={sub.id}
                    sub={sub}
                    onUpdate={handleUpdateSubcategory}
                    onDelete={handleDeleteSubcategory}
                  />
                ))}
                <AddSubcategoryForm categoryId={selectedCategory.id} onAdd={handleAddSubcategory} />
              </div>
            </div>

            <button type="button" onClick={handleSaveCategory} style={styles.saveChangesBtn} className="cat-btn-primary">
              Save Changes
            </button>
          </div>
        ) : (
          <div style={styles.placeholder}>
            <span style={styles.placeholderIcon}>📂</span>
            <p style={styles.placeholderText}>Select a category to view and edit its details</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
    minHeight: 500,
  },
  leftPanel: {
    width: 320,
    flexShrink: 0,
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  leftScroll: {
    flex: 1,
  },
  catRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f0eb',
    transition: 'background 0.1s',
  },
  catIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 6,
    background: '#f5f0e8',
    display: 'flex' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  catInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  catName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d2116',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  subCountPill: {
    fontSize: 11,
    color: '#6b6560',
  },
  iconActionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b6560',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 4,
    flexShrink: 0,
  },
  addCatBtn: {
    margin: 12,
    padding: '10px',
    background: '#c9a84c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    width: 'calc(100% - 24px)',
  },
  rightPanel: {
    flex: 1,
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    minHeight: 400,
    display: 'flex',
  },
  detailContent: {
    flex: 1,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  detailHeading: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: '#2d2116',
    paddingBottom: 16,
    borderBottom: '1px solid #e8e4de',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#6b6560',
  },
  fieldInput: {
    padding: '8px 12px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    fontSize: 14,
    color: '#2d2116',
    background: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  subList: {
    border: '1px solid #e8e4de',
    borderRadius: 6,
    overflow: 'hidden',
    background: '#faf8f4',
  },
  subRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: '#fff',
    borderBottom: '1px solid #f3f0eb',
  },
  subEditBlock: {
    padding: '10px 14px',
    background: '#fff',
    borderBottom: '1px solid #f3f0eb',
  },
  subIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 4,
    background: '#f5f0e8',
    display: 'flex' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    flexShrink: 0,
  },
  subName: {
    flex: 1,
    fontSize: 13,
    color: '#2d2116',
  },
  addSubBtn: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    borderTop: '1px dashed #e8e4de',
    color: '#6b6560',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
  },
  addSubForm: {
    padding: '12px 14px',
    background: '#fff',
    borderTop: '1px solid #e8e4de',
  },
  saveChangesBtn: {
    padding: '10px 20px',
    background: '#c9a84c',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
  cancelBtnLg: {
    padding: '10px 20px',
    background: '#fff',
    color: '#6b6560',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
  },
  placeholder: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
  },
  placeholderIcon: {
    fontSize: 40,
    opacity: 0.4,
  },
  placeholderText: {
    margin: 0,
    fontSize: 14,
    color: '#6b6560',
    textAlign: 'center',
  },
  iconGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
  },
  iconBtn: {
    fontSize: 18,
    padding: '4px 6px',
    borderRadius: 4,
    cursor: 'pointer',
    lineHeight: 1,
    transition: 'border-color 0.1s',
  },
  inlineInput: {
    padding: '6px 8px',
    border: '1px solid #e8e4de',
    borderRadius: 4,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box' as const,
    marginBottom: 8,
    color: '#2d2116',
    outline: 'none',
  },
  saveBtn: {
    padding: '5px 12px',
    background: '#c9a84c',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
  cancelBtn: {
    padding: '5px 12px',
    background: '#f5f0e8',
    color: '#6b6560',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
  },
};
