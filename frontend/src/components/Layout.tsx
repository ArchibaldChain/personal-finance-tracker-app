import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/logo.png';

export default function Layout() {
  const linkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 6,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    color: isActive ? '#c9a84c' : '#2d2116',
    background: isActive ? '#f5f0e8' : 'transparent',
  });

  return (
    <div style={styles.app}>
      <nav style={styles.nav}>
        <img src={logo} alt="Finance Tracker" style={styles.logo} />
        <span style={styles.brand}>Finance Tracker</span>
        <div style={styles.links}>
          <NavLink to="/dashboard" style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/transactions" style={linkStyle}>
            Transactions
          </NavLink>
          <NavLink to="/import" style={linkStyle}>
            Import
          </NavLink>
          <NavLink to="/categories" style={linkStyle}>
            Categories
          </NavLink>
        </div>
      </nav>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: '#faf8f4' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '12px 24px',
    background: '#fff',
    borderBottom: '1px solid #e8e4de',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: { height: 32, width: 'auto', display: 'block' },
  brand: { fontWeight: 700, fontSize: 16, color: '#2d2116' },
  links: { display: 'flex', gap: 4, marginLeft: 'auto' },
  main: { padding: '24px 32px', maxWidth: 1200, margin: '0 auto' },
};
