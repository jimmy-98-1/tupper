import React, { useState, useEffect } from 'react'
import BottomNav from './components/BottomNav'
import Hoy      from './pages/Hoy'
import Compra   from './pages/Compra'
import Perfil   from './pages/Perfil'
import { getUsuario, setUsuario } from './utils/storage'

function LoginScreen({ onLogin }) {
  const [nombre, setNombre] = useState('')

  const handleSubmit = () => {
    const n = nombre.trim()
    if (!n) return
    setUsuario({ nombre: n })
    onLogin({ nombre: n })
  }

  return (
    <div style={styles.loginWrap} className="fade-in">
      <div style={styles.loginTop}>
        <p style={styles.loginEmoji}>🥡</p>
        <h1 style={{ ...styles.loginLogo, fontFamily: "'Playfair Display', serif" }}>
          Tupper
        </h1>
        <p style={styles.loginTagline}>Tu dieta, al instante</p>
      </div>

      <div style={styles.loginCard}>
        <label style={styles.loginLabel}>¿Cómo te llamas?</label>
        <input
          type="text"
          placeholder="Tu nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={styles.loginInput}
          autoFocus
        />
        <button onClick={handleSubmit} style={styles.loginBtn}>
          Entrar →
        </button>
      </div>

      <p style={styles.loginPie}>Solo para ti. Sin cuentas, sin contraseñas.</p>
    </div>
  )
}

export default function App() {
  const [usuario, setUsuarioState] = useState(null)
  const [pagina, setPagina]        = useState('hoy')
  const [dietaKey, setDietaKey]    = useState(0) // fuerza re-render de Hoy tras subir dieta

  useEffect(() => {
    const u = getUsuario()
    if (u) setUsuarioState(u)
  }, [])

  const handleLogin = (u) => setUsuarioState(u)

  const handleDietaCargada = () => {
    setDietaKey(k => k + 1)
    setPagina('hoy')
  }

  if (!usuario) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <span style={{ ...styles.headerLogo, fontFamily: "'Playfair Display', serif" }}>
          Tupper
        </span>
        <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa08e' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        </span>
      </header>

      {/* Contenido */}
      <main style={styles.main}>
        {pagina === 'hoy'    && <Hoy key={dietaKey} onIrAPerfil={() => setPagina('perfil')} />}
        {pagina === 'compra' && <Compra />}
        {pagina === 'perfil' && <Perfil onDietaCargada={handleDietaCargada} />}
      </main>

      {/* Nav */}
      <BottomNav paginaActual={pagina} onChange={setPagina} />
    </div>
  )
}

const styles = {
  loginWrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
    gap: '1.5rem',
  },
  loginTop: { textAlign: 'center' },
  loginEmoji: { fontSize: '3rem', marginBottom: '0.25rem' },
  loginLogo: {
    fontSize: '2.8rem',
    color: '#4a5e3a',
    letterSpacing: '-1px',
    fontWeight: 500,
  },
  loginTagline: {
    fontSize: '0.78rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#9aa08e',
    marginTop: '0.3rem',
  },
  loginCard: {
    background: '#ffffff',
    borderRadius: 18,
    padding: '1.75rem',
    width: '100%',
    border: '1px solid #cdd8bc',
  },
  loginLabel: {
    display: 'block',
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#5c6052',
    marginBottom: '0.5rem',
  },
  loginInput: {
    width: '100%',
    padding: '0.85rem 1rem',
    border: '1.5px solid #cdd8bc',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    background: '#faf8f3',
    color: '#1c1e18',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  loginBtn: {
    width: '100%',
    marginTop: '1rem',
    padding: '0.9rem',
    background: '#4a5e3a',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'background 0.15s',
  },
  loginPie: {
    fontSize: '0.72rem',
    color: '#9aa08e',
    textAlign: 'center',
  },
  app: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  header: {
    background: '#ffffff',
    borderBottom: '3px solid #4a5e3a',
    padding: '1.1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  headerLogo: {
    fontSize: '1.7rem',
    color: '#4a5e3a',
    letterSpacing: '-0.5px',
    fontWeight: 600,
  },
  main: {
    flex: 1,
    padding: '1.5rem 1.25rem 6rem',
    overflowY: 'auto',
  },
}
