import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogOut, Home, ChevronRight } from 'lucide-react';
import { featureConfig } from '../featureConfig';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentFeature = location.pathname.startsWith('/feature/')
    ? featureConfig.find(f => f.key === location.pathname.split('/feature/')[1])
    : null;

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo} onClick={() => navigate('/')}>
            <Shield size={24} color="#818cf8" />
            <span style={styles.logoText}>BrandVoice AI</span>
          </div>
          {currentFeature && (
            <div style={styles.breadcrumb}>
              <ChevronRight size={16} color="#475569" />
              <span style={styles.breadcrumbText}>{currentFeature.title}</span>
            </div>
          )}
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user?.name?.charAt(0) || 'U'}</div>
            <div>
              <div style={styles.userName}>{user?.name}</div>
              <div style={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} style={styles.logoutBtn}>
            <LogOut size={18} />
          </button>
        </div>
      </header>
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: '100vh',
    background: '#0f172a',
  },
  header: {
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
    padding: '0 32px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  breadcrumbText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px',
    color: 'white',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#e2e8f0',
  },
  userRole: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '10px',
    padding: '8px',
    color: '#f87171',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  main: {
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
};
