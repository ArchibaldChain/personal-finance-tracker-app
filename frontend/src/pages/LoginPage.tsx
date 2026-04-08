import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../api/ledgers';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { allUsers, refreshUsers } = useApp();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSignIn(userId: number) {
    signIn(userId);
    navigate('/dashboard', { replace: true });
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const user = await createUser({ display_name: newName.trim(), email: newEmail.trim() });
      refreshUsers();
      handleSignIn(user.id);
    } catch {
      setError('Could not create account. Email may already be in use.');
    } finally {
      setCreating(false);
    }
  }

  function getInitials(name: string) {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img src={logo} alt="Finance Tracker" style={styles.logo} />
        <h1 style={styles.title}>Finance Tracker</h1>
        <p style={styles.subtitle}>Choose an account to continue</p>

        {/* Existing user list */}
        {allUsers.length > 0 && (
          <div style={styles.userList}>
            {allUsers.map((u) => (
              <button key={u.id} style={styles.userRow} onClick={() => handleSignIn(u.id)}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.display_name} style={styles.avatar} />
                ) : (
                  <div style={styles.avatarInitials}>{getInitials(u.display_name)}</div>
                )}
                <div style={styles.userInfo}>
                  <span style={styles.userName}>{u.display_name}</span>
                  <span style={styles.userEmail}>{u.email}</span>
                </div>
                <span style={styles.arrow}>→</span>
              </button>
            ))}
          </div>
        )}

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        {/* Create new account */}
        {!showCreate ? (
          <button style={styles.createBtn} onClick={() => setShowCreate(true)}>
            + Create new account
          </button>
        ) : (
          <form style={styles.form} onSubmit={handleCreateUser}>
            <p style={styles.formTitle}>New Account</p>
            <input
              style={styles.input}
              placeholder="Display name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
            />
            <input
              style={styles.input}
              placeholder="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.formButtons}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => { setShowCreate(false); setError(null); }}
              >
                Cancel
              </button>
              <button type="submit" style={styles.submitBtn} disabled={creating}>
                {creating ? 'Creating…' : 'Create & Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#faf8f4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    background: '#fff',
    border: '1px solid #e8e4de',
    borderRadius: 12,
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    width: 380,
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
  },
  logo: { height: 48, width: 'auto', display: 'block', margin: '0 auto' },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: '#2d2116', textAlign: 'center' },
  subtitle: { margin: 0, fontSize: 14, color: '#7a6a56', textAlign: 'center' },
  userList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    border: '1px solid #e8e4de',
    borderRadius: 8,
    background: '#faf8f4',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  avatar: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  avatarInitials: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#c9a84c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  userInfo: { display: 'flex', flexDirection: 'column', flex: 1 },
  userName: { fontSize: 14, fontWeight: 500, color: '#2d2116' },
  userEmail: { fontSize: 12, color: '#7a6a56' },
  arrow: { fontSize: 14, color: '#c9a84c', flexShrink: 0 },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '4px 0',
  },
  dividerText: {
    fontSize: 12,
    color: '#bbb',
    margin: '0 auto',
  },
  createBtn: {
    padding: '10px',
    border: '1px dashed #c9a84c',
    borderRadius: 8,
    background: 'transparent',
    fontSize: 14,
    color: '#c9a84c',
    cursor: 'pointer',
    fontWeight: 500,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  formTitle: { margin: 0, fontSize: 14, fontWeight: 600, color: '#2d2116' },
  input: {
    padding: '9px 12px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    fontSize: 14,
    color: '#2d2116',
    outline: 'none',
  },
  error: { margin: 0, fontSize: 12, color: '#c0392b' },
  formButtons: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  cancelBtn: {
    padding: '7px 14px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    background: 'transparent',
    fontSize: 13,
    color: '#7a6a56',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '7px 16px',
    border: 'none',
    borderRadius: 6,
    background: '#c9a84c',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
