import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, ledgerId } = useApp();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    color: isActive ? '#c9a84c' : '#2d2116',
    background: isActive ? '#f5f0e8' : 'transparent',
  });

  const initials = user
    ? user.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <img src={logo} alt="Finance Tracker" style={styles.logo} />
        <span style={styles.brand}>Finance Tracker</span>
        <div style={styles.links}>
          <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
          <NavLink to="/transactions" style={linkStyle}>Transactions</NavLink>
          <NavLink to="/import" style={linkStyle}>Import</NavLink>
          <NavLink to="/categories" style={linkStyle}>Categories</NavLink>
        </div>

        <div style={styles.userArea}>
          <button style={styles.avatarBtn} onClick={() => navigate('/profile')} title="Edit profile">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} style={styles.avatar} />
            ) : (
              <div style={styles.avatarInitials}>{initials}</div>
            )}
          </button>
          <span style={styles.displayName}>{user?.displayName ?? '...'}</span>
          <button style={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      {/* key forces full remount of all page components when the active user/ledger changes */}
      <main style={styles.main}>
        <div key={ledgerId ?? 'loading'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: '#faf8f4' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 24px',
    background: '#fff',
    borderBottom: '1px solid #e8e4de',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: { height: 32, width: 'auto', display: 'block' },
  brand: { fontWeight: 700, fontSize: 16, color: '#2d2116' },
  links: { display: 'flex', gap: 4 },
  userArea: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' },
  avatarBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    borderRadius: '50%',
  },
  avatar: { width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' },
  avatarInitials: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#c9a84c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
  },
  displayName: { fontSize: 14, fontWeight: 500, color: '#2d2116' },
  signOutBtn: {
    padding: '5px 12px',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    background: 'transparent',
    fontSize: 13,
    color: '#7a6a56',
    cursor: 'pointer',
  },
  main: { padding: '24px 32px', maxWidth: 1200, margin: '0 auto' },
};
