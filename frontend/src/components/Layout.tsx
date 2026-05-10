import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

export default function Layout() {
  const { user, ledgerId } = useApp();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    color: isActive ? '#c9a84c' : '#2d2116',
    background: isActive ? '#f5f0e8' : 'transparent',
  });

  const mobileLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'block',
    padding: '14px 20px',
    textDecoration: 'none',
    fontSize: 16,
    fontWeight: 500,
    color: isActive ? '#c9a84c' : '#2d2116',
    background: isActive ? '#fef9ec' : 'transparent',
    borderBottom: '1px solid #f3f0eb',
  });

  const initials = user
    ? user.displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  function handleSignOut() {
    setMenuOpen(false);
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <img src={logo} alt="Finance Tracker" style={styles.logo} />
        <span style={styles.brand}>Finance Tracker</span>

        {!isMobile && (
          <div style={styles.links}>
            <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
            <NavLink to="/transactions" style={linkStyle}>Transactions</NavLink>
            <NavLink to="/import" style={linkStyle}>Import</NavLink>
            <NavLink to="/categories" style={linkStyle}>Categories</NavLink>
          </div>
        )}

        <div style={styles.userArea}>
          {!isMobile && (
            <>
              <button style={styles.avatarBtn} onClick={() => navigate('/profile')} title="Edit profile">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} style={styles.avatar} referrerPolicy="no-referrer" />
                ) : (
                  <div style={styles.avatarInitials}>{initials}</div>
                )}
              </button>
              <span style={styles.displayName}>{user?.displayName ?? '...'}</span>
              <button style={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
            </>
          )}

          {isMobile && (
            <>
              <button style={styles.avatarBtn} onClick={() => navigate('/profile')} title="Edit profile">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} style={styles.avatar} referrerPolicy="no-referrer" />
                ) : (
                  <div style={styles.avatarInitials}>{initials}</div>
                )}
              </button>
              <button
                style={styles.hamburger}
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </>
          )}
        </div>

        {/* Mobile dropdown */}
        {isMobile && menuOpen && (
          <div style={styles.mobileMenu}>
            <NavLink to="/dashboard" style={mobileLinkStyle}>Dashboard</NavLink>
            <NavLink to="/transactions" style={mobileLinkStyle}>Transactions</NavLink>
            <NavLink to="/import" style={mobileLinkStyle}>Import</NavLink>
            <NavLink to="/categories" style={mobileLinkStyle}>Categories</NavLink>
            <div style={styles.mobileUserRow}>
              <span style={styles.mobileUserName}>{user?.displayName ?? ''}</span>
              <button style={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
            </div>
          </div>
        )}
      </nav>

      {/* Overlay to close menu when clicking outside */}
      {isMobile && menuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMenuOpen(false)} />
      )}

      <main className="app-main" style={styles.main}>
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
    flexWrap: 'wrap',
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
  hamburger: {
    background: 'none',
    border: '1px solid #e8e4de',
    borderRadius: 6,
    fontSize: 18,
    lineHeight: 1,
    padding: '5px 10px',
    cursor: 'pointer',
    color: '#2d2116',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    borderBottom: '1px solid #e8e4de',
    boxShadow: '0 4px 16px rgba(45,33,22,0.1)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
  },
  mobileUserRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderTop: '1px solid #e8e4de',
  },
  mobileUserName: { fontSize: 14, fontWeight: 500, color: '#2d2116' },
  main: { padding: '24px 32px', maxWidth: 1200, margin: '0 auto' },
};
