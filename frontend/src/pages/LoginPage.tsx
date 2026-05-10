import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleSignIn, localSignIn } from '../api/auth';
import { createUser } from '../api/ledgers';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { allUsers, refreshUsers } = useApp();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV && new URLSearchParams(window.location.search).has('dev');

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSignIn(userId: number) {
    signIn(userId);
    navigate('/dashboard', { replace: true });
  }

  // On return from Google redirect, the access_token is in the URL hash
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get('access_token');
    if (!accessToken) return;
    window.history.replaceState({}, '', '/login');
    googleSignIn(accessToken)
      .then(({ token, user }) => {
        localStorage.setItem('auth_token', token);
        handleSignIn(user.id);
      })
      .catch(() => setError('Google Sign-In failed. Please try again.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function googleLogin() {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
      redirect_uri: `${window.location.origin}/login`,
      response_type: 'token',
      scope: 'openid email profile',
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async function handleLocalSignIn(userId: number) {
    try {
      const { token, user } = await localSignIn(userId);
      localStorage.setItem('auth_token', token);
      handleSignIn(user.id);
    } catch {
      setError('Sign-in failed. Please try again.');
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const user = await createUser({ display_name: newName.trim(), email: newEmail.trim() });
      refreshUsers();
      await handleLocalSignIn(user.id);
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
      <div style={styles.card} className="login-card">
        <img src={logo} alt="Finance Tracker" style={styles.logo} />
        <h1 style={styles.title}>Finance Tracker</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        {/* Google Sign-In */}
        <button style={styles.googleSignInBtn} onClick={() => googleLogin()}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        {error && <p style={styles.error}>{error}</p>}

        {isDev && (
          <>
            <div style={styles.divider}>
              <span style={styles.dividerText}>local accounts</span>
            </div>

            {allUsers.filter((u) => u.auth_provider === 'local').length > 0 && (
              <div style={styles.userList}>
                {allUsers.filter((u) => u.auth_provider === 'local').map((u) => (
                  <button key={u.id} style={styles.userRow} onClick={() => handleLocalSignIn(u.id)}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.display_name} style={styles.avatar} referrerPolicy="no-referrer" />
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
              <span style={styles.dividerText}>create local account</span>
            </div>

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
          </>
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
  googleSignInBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '10px 16px',
    border: '1px solid #dadce0',
    borderRadius: 4,
    background: '#fff',
    fontSize: 14,
    fontWeight: 500,
    color: '#3c4043',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'Roboto, Arial, sans-serif',
  },
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
