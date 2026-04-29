'use client';

import { useApp } from './AppProvider';

const VIEWS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'someday', label: 'Someday' },
  { id: 'history', label: 'History' },
  { id: 'manage', label: 'Manage' },
];

export default function TopBar() {
  const { view, setView, theme, mode, toggleTheme, toggleMode, searchQuery, setSearchQuery, signOut, user } = useApp();

  return (
    <header className="topbar" style={topbarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={brandMarkStyle}>DD</span>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
          DayDesk
        </h1>
      </div>

      <nav style={navStyle}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`nav-btn${view === v.id ? ' active' : ''}`}
            style={{
              ...navBtnStyle,
              background: view === v.id ? 'var(--surface)' : 'transparent',
              color: view === v.id ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: view === v.id ? 600 : 500,
              boxShadow: view === v.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="topbar-search" style={searchBoxStyle}>
          <span style={searchIconStyle}>⌕</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value && view !== 'search') setView('search');
              else if (!e.target.value && view === 'search') setView('today');
            }}
            placeholder="Search tasks..."
            style={searchInputStyle}
          />
        </div>

        <button
          onClick={toggleMode}
          title={mode === 'focused' ? 'Exit Focused mode' : 'Enter Focused mode'}
          style={{
            ...toggleBtnStyle,
            background: mode === 'focused' ? 'var(--accent)' : 'var(--surface-alt)',
            color: mode === 'focused' ? 'white' : 'var(--text-muted)',
            borderColor: mode === 'focused' ? 'var(--accent)' : 'var(--border)',
            boxShadow: mode === 'focused' ? '0 2px 8px var(--accent-glow)' : 'none',
          }}
        >
          ◐
        </button>

        <button onClick={toggleTheme} title="Toggle theme" style={toggleBtnStyle}>
          {theme === 'dark' ? '☾' : '☀'}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={signOut}
            title={`Sign out (${user?.email})`}
            style={{
              ...toggleBtnStyle,
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {user?.email?.[0] || '?'}
          </button>
        </div>
      </div>
    </header>
  );
}

const topbarStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  padding: '12px 24px',
  borderBottom: '1px solid var(--border)',
  gap: 24,
  position: 'sticky',
  top: 0,
  zIndex: 50,
  backdropFilter: 'blur(10px)',
  background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
};

const brandMarkStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'grid',
  placeItems: 'center',
  background: 'linear-gradient(135deg, var(--accent) 0%, var(--must) 100%)',
  color: 'white',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.05em',
  borderRadius: 'var(--radius-sm)',
  boxShadow: '0 2px 8px var(--accent-glow)',
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 2,
  background: 'var(--surface-alt)',
  padding: 4,
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  justifySelf: 'center',
};

const navBtnStyle: React.CSSProperties = {
  padding: '7px 16px',
  fontSize: 13,
  borderRadius: 'var(--radius-sm)',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
  border: 'none',
  cursor: 'pointer',
};

const searchBoxStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 10,
  color: 'var(--text-faint)',
  fontSize: 14,
};

const searchInputStyle: React.CSSProperties = {
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '6px 10px 6px 30px',
  fontSize: 13,
  width: 200,
  outline: 'none',
  color: 'var(--text)',
  fontFamily: 'inherit',
};

const toggleBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  display: 'grid',
  placeItems: 'center',
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  color: 'var(--text-muted)',
  fontSize: 16,
};
