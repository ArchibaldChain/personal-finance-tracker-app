import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteUser, updateUser } from '../api/ledgers';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, refreshCurrentUser } = useApp();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setEmail(user.email);
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user]);

  function getInitials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await updateUser(user.id, {
        display_name: displayName.trim() || undefined,
        email: email.trim() || undefined,
        avatar_url: avatarUrl.trim() || null,
      });
      refreshCurrentUser();
      setSuccess(true);
    } catch {
      setError('Failed to save. Email may already be in use.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(user.id);
      signOut();
      navigate('/login', { replace: true });
    } catch {
      setDeleteError('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  }

  if (!user) return null;

  const previewName = displayName.trim() || user.displayName;
  const previewAvatar = avatarUrl.trim() || null;
  const deleteMatch = deleteInput.trim() === user.displayName;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Profile</h2>
        <p style={styles.sub}>Manage your account details</p>
      </div>

      <div style={styles.card}>
        {/* Avatar preview */}
        <div style={styles.avatarSection}>
          {previewAvatar ? (
            <img src={previewAvatar} alt={previewName} style={styles.avatarLarge} referrerPolicy="no-referrer" />
          ) : (
            <div style={styles.avatarInitials}>{getInitials(previewName)}</div>
          )}
          <div>
            <p style={styles.avatarName}>{previewName}</p>
            <p style={styles.avatarEmail}>{email || user.email}</p>
          </div>
        </div>

        <hr style={styles.divider} />

        <form style={styles.form} onSubmit={handleSave}>
          <div style={styles.field}>
            <label style={styles.label}>Display Name</label>
            <input
              style={styles.input}
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSuccess(false); }}
              placeholder="Your name"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSuccess(false); }}
              placeholder="you@example.com"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Avatar URL <span style={styles.optional}>(optional)</span></label>
            <input
              style={styles.input}
              value={avatarUrl}
              onChange={(e) => { setAvatarUrl(e.target.value); setSuccess(false); }}
              placeholder="https://..."
            />
            <p style={styles.hint}>Paste a URL to a profile image. Leave blank to use initials.</p>
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.successMsg}>Profile saved.</p>}

          <button type="submit" style={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div style={styles.dangerCard}>
        <p style={styles.dangerTitle}>Danger Zone</p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            style={styles.deleteBtn}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete Account
          </button>
        ) : (
          <form onSubmit={handleDelete} style={styles.confirmForm}>
            <p style={styles.confirmWarning}>
              This will permanently delete your account, all transactions, imports, and categories.
              This action cannot be undone.
            </p>
            <label style={styles.confirmLabel}>
              Type your display name <strong>{user.displayName}</strong> to confirm:
            </label>
            <input
              style={styles.input}
              value={deleteInput}
              onChange={(e) => { setDeleteInput(e.target.value); setDeleteError(null); }}
              placeholder={user.displayName}
              autoFocus
            />
            {deleteError && <p style={styles.error}>{deleteError}</p>}
            <div style={styles.confirmButtons}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteError(null); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ ...styles.deleteBtn, opacity: deleteMatch ? 1 : 0.4, cursor: deleteMatch ? 'pointer' : 'not-allowed' }}
                disabled={!deleteMatch || deleting}
              >
                {deleting ? 'Deleting…' : 'Permanently Delete Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 },
  header: { marginBottom: 4 },
  heading: { margin: 0, fontSize: 22, fontWeight: 700, color: '#2d2116' },
  sub: { margin: '4px 0 0', fontSize: 14, color: '#7a6a56' },
  card: {
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 10,
    padding: '28px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  avatarSection: { display: 'flex', alignItems: 'center', gap: 16 },
  avatarLarge: { width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  avatarInitials: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#c9a84c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 600,
    flexShrink: 0,
  },
  avatarName: { margin: 0, fontSize: 16, fontWeight: 600, color: '#2d2116' },
  avatarEmail: { margin: '2px 0 0', fontSize: 13, color: '#7a6a56' },
  divider: { border: 'none', borderTop: '1px solid #e8e4de', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#2d2116' },
  optional: { fontWeight: 400, color: '#aaa' },
  input: {
    padding: '9px 12px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    fontSize: 14,
    color: '#2d2116',
    outline: 'none',
  },
  hint: { margin: 0, fontSize: 12, color: '#aaa' },
  error: { margin: 0, fontSize: 13, color: '#c0392b' },
  successMsg: { margin: 0, fontSize: 13, color: '#27ae60' },
  saveBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: 6,
    background: '#c9a84c',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  dangerCard: {
    background: '#fff',
    border: '1px solid #f5c6c6',
    borderRadius: 10,
    padding: '20px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  dangerTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#c0392b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  deleteBtn: {
    padding: '9px 18px',
    border: '1px solid #c0392b',
    borderRadius: 6,
    background: '#c0392b',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  confirmForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  confirmWarning: { margin: 0, fontSize: 13, color: '#7a6a56', lineHeight: 1.5 },
  confirmLabel: { fontSize: 13, color: '#2d2116' },
  confirmButtons: { display: 'flex', gap: 8, alignItems: 'center' },
  cancelBtn: {
    padding: '9px 18px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    background: 'transparent',
    fontSize: 14,
    color: '#7a6a56',
    cursor: 'pointer',
  },
};
