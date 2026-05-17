import React, { useState, useEffect, useRef } from 'react'

const EMOJI_TOMA = {
  'desayuno':   '☀️',
  'almuerzo':   '🍎',
  'comida':     '🍽️',
  'merienda':   '🫐',
  'cena':       '🌙',
  'pre-entreno':'⚡',
  'post-entreno':'💪',
  'snack':      '🥜',
}

function getEmoji(nombre) {
  if (!nombre) return '🥡'
  const n = nombre.toLowerCase()
  for (const [key, emoji] of Object.entries(EMOJI_TOMA)) {
    if (n.includes(key)) return emoji
  }
  return '🥡'
}

export default function TomaCard({ toma, completada, onToggle, delay = 0 }) {
  const [animando, setAnimando] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const handleToggle = () => {
    clearTimeout(timerRef.current)
    setAnimando(true)
    timerRef.current = setTimeout(() => setAnimando(false), 300)
    onToggle(toma.nombre)
  }

  return (
    <div
      onClick={handleToggle}
      style={{
        ...styles.card,
        ...(completada ? styles.cardCompletada : {}),
        animationDelay: `${delay}ms`,
        transform: animando ? 'scale(0.98)' : 'scale(1)',
      }}
      className="fade-up"
    >
      <div style={styles.row}>
        {/* Icono toma */}
        <div style={styles.emojiWrap}>
          <span style={styles.emojiToma}>{getEmoji(toma.nombre)}</span>
        </div>

        {/* Contenido */}
        <div style={styles.contenido}>
          <div style={styles.nombreRow}>
            <span style={{ ...styles.nombre, ...(completada ? styles.nombreCompletado : {}) }}>
              {toma.nombre}
            </span>
            {toma.calorias > 0 && (
              <span style={styles.cals}>{toma.calorias} kcal</span>
            )}
          </div>

          {/* Alimentos */}
          <div style={styles.alimentos}>
            {toma.alimentos && toma.alimentos.map((alimento, i) => (
              <span key={i} style={styles.alimentoBadge}>
                {alimento.nombre}
                {alimento.cantidad && alimento.cantidad !== 'N/A' && alimento.cantidad !== 'null'
                  ? ` · ${alimento.cantidad}`
                  : ''}
              </span>
            ))}
          </div>

        </div>

        {/* Check */}
        <div style={{
          ...styles.check,
          ...(completada ? styles.checkActivo : {}),
          animation: animando ? 'checkPop 0.3s ease' : 'none',
        }}>
          {completada ? '✓' : ''}
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid #cdd8bc',
    borderRadius: 16,
    padding: '1rem 1.1rem',
    marginBottom: '0.65rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  cardCompletada: {
    background: '#eef1e8',
    opacity: 0.72,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#f3f1ea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiToma: { fontSize: '1.1rem' },
  contenido: { flex: 1, minWidth: 0 },
  nombreRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  nombre: {
    fontSize: '0.85rem',
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#4a5e3a',
  },
  nombreCompletado: {
    textDecoration: 'line-through',
    color: '#9aa08e',
  },
  cals: {
    fontSize: '0.72rem',
    color: '#9aa08e',
    whiteSpace: 'nowrap',
  },
  alimentos: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.3rem',
    marginBottom: 4,
  },
  alimentoBadge: {
    fontSize: '0.78rem',
    fontWeight: 500,
    color: '#2a2e22',
    background: '#f3f1ea',
    borderRadius: 6,
    padding: '2px 7px',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '1.5px solid #cdd8bc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    color: 'white',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    marginTop: 2,
  },
  checkActivo: {
    background: '#4a5e3a',
    borderColor: '#4a5e3a',
  },
}
