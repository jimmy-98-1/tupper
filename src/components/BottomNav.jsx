import React from 'react'

const TABS = [
  { id: 'hoy',    label: 'Hoy',    emoji: '🥗' },
  { id: 'compra', label: 'Compra', emoji: '🛒' },
  { id: 'perfil', label: 'Perfil', emoji: '👤' },
]

export default function BottomNav({ paginaActual, onChange }) {
  return (
    <nav style={styles.nav}>
      {TABS.map(tab => {
        const activo = tab.id === paginaActual
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              ...styles.btn,
              ...(activo ? styles.btnActivo : {}),
            }}
            aria-label={tab.label}
          >
            <span style={styles.emoji}>{tab.emoji}</span>
            <span style={{ ...styles.label, ...(activo ? styles.labelActivo : {}) }}>
              {tab.label}
            </span>
            <span style={{
              ...styles.dot,
              opacity: activo ? 1 : 0,
            }} />
          </button>
        )
      })}
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    background: '#ffffff',
    borderTop: '1px solid #cdd8bc',
    display: 'flex',
    zIndex: 50,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  btn: {
    flex: 1,
    padding: '10px 0 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    transition: 'all 0.15s',
  },
  btnActivo: {},
  emoji: {
    fontSize: '1.3rem',
    lineHeight: 1,
  },
  label: {
    fontSize: '0.62rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#9aa08e',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
  },
  labelActivo: {
    color: '#4a5e3a',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: '#4a5e3a',
    transition: 'opacity 0.15s',
  },
}
