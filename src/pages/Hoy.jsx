import React, { useState, useEffect, useCallback } from 'react'
import TomaCard from '../components/TomaCard'
import {
  getDieta,
  getDiaSemanaNombre,
  getCompletadasHoy,
  toggleCompletada,
} from '../utils/storage'

export default function Hoy({ onIrAPerfil }) {
  const [tomas, setTomas]           = useState([])
  const [completadas, setCompletadas] = useState([])
  const [sinDieta, setSinDieta]     = useState(false)

  const cargarDatos = useCallback(() => {
    const dieta = getDieta()
    if (!dieta) { setSinDieta(true); return }

    const diaActual = getDiaSemanaNombre()
    const normalizar = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const diaData = dieta[diaActual]
      ?? Object.entries(dieta).find(([k]) => normalizar(k) === normalizar(diaActual))?.[1]
      ?? null

    if (!diaData) { setSinDieta(true); return }

    setTomas(diaData.tomas || [])
    setSinDieta(false)
    setCompletadas(getCompletadasHoy())
  }, [])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const handleToggle = (nombreToma) => {
    const nuevas = toggleCompletada(nombreToma)
    setCompletadas(nuevas)
  }

  const totalTomas   = tomas.length
  const hechas       = completadas.length
  const progreso     = totalTomas > 0 ? (hechas / totalTomas) * 100 : 0
  const totalCalorias     = tomas.reduce((acc, t) => acc + (t.calorias || 0), 0)
  const totalProteinas    = tomas.reduce((acc, t) => acc + (t.proteinas || 0), 0)
  const totalCarbohidratos = tomas.reduce((acc, t) => acc + (t.carbohidratos || 0), 0)
  const totalGrasas       = tomas.reduce((acc, t) => acc + (t.grasas || 0), 0)
  const hayMacros = totalCalorias > 0 || totalProteinas > 0 || totalCarbohidratos > 0 || totalGrasas > 0

  if (sinDieta) {
    return (
      <div style={styles.sinDieta} className="fade-in">
        <span style={styles.sinDietaEmoji}>🥡</span>
        <p style={styles.sinDietaTitulo}>Sin dieta cargada</p>
        <p style={styles.sinDietaTexto}>
          Ve a <strong>Perfil</strong> y sube tu PDF para empezar.
        </p>
        {onIrAPerfil && (
          <button onClick={onIrAPerfil} style={styles.btnIrPerfil}>
            Ir a Perfil →
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* Cabecera del día */}
      <div style={styles.diaHeader}>
        <h1 style={{ ...styles.titulo, fontFamily: "'Playfair Display', serif" }}>
          Tu menú de hoy
        </h1>

        {/* Progreso */}
        <div style={styles.progresoWrap}>
          <div style={styles.progresoBar}>
            <div style={{ ...styles.progresoFill, width: `${progreso}%` }} />
          </div>
          <div style={styles.progresoInfo}>
            <span style={styles.progresoTexto}>
              {hechas} de {totalTomas} tomas
            </span>
            <span style={{ fontSize: '0.72rem', color: '#4a5e3a', fontWeight: 500 }}>
              {Math.round(progreso)}% completado
            </span>
          </div>
        </div>
      </div>

      {/* Resumen macros del día */}
      {hayMacros && (
        <div style={styles.macrosCard}>
          {[
            { label: 'Calorías', valor: Math.round(totalCalorias), unidad: 'kcal' },
            { label: 'Proteínas', valor: Math.round(totalProteinas), unidad: 'g' },
            { label: 'Carbos', valor: Math.round(totalCarbohidratos), unidad: 'g' },
            { label: 'Grasas', valor: Math.round(totalGrasas), unidad: 'g' },
          ].map(m => (
            <div key={m.label} style={styles.macroItem}>
              <span style={styles.macroValor}>{m.valor}<span style={styles.macroUnidad}>{m.unidad}</span></span>
              <span style={styles.macroLabel}>{m.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tomas */}
      <div>
        {tomas.map((toma, i) => (
          <TomaCard
            key={toma.nombre + i}
            toma={toma}
            completada={completadas.includes(toma.nombre)}
            onToggle={handleToggle}
            delay={i * 60}
          />
        ))}
      </div>

      {/* Mensaje de enhorabuena */}
      {hechas === totalTomas && totalTomas > 0 && (
        <div style={styles.felicidades} className="fade-in">
          <span style={{ fontSize: '1.5rem' }}>🎉</span>
          <p style={styles.felicidadesTexto}>¡Día completado! Así se hace.</p>
        </div>
      )}
    </div>
  )
}

const styles = {
  diaHeader: {
    marginBottom: '1.5rem',
  },
  titulo: {
    fontSize: '1.9rem',
    fontWeight: 500,
    color: '#1c1e18',
    marginBottom: '1rem',
    letterSpacing: '-0.5px',
  },
  progresoWrap: { marginBottom: '0.5rem' },
  progresoBar: {
    height: 8,
    background: '#cdd8bc',
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: '0.4rem',
  },
  progresoFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4a5e3a, #7a9464)',
    borderRadius: 99,
    transition: 'width 0.5s ease',
  },
  progresoInfo: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  progresoTexto: {
    fontSize: '0.72rem',
    color: '#9aa08e',
  },
  sinDieta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    textAlign: 'center',
    gap: '0.5rem',
  },
  sinDietaEmoji: { fontSize: '3rem', marginBottom: '0.5rem' },
  sinDietaTitulo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.3rem',
    color: '#1c1e18',
  },
  sinDietaTexto: {
    fontSize: '0.85rem',
    color: '#9aa08e',
    lineHeight: 1.6,
  },
  btnIrPerfil: {
    marginTop: '0.75rem',
    padding: '0.7rem 1.5rem',
    background: '#4a5e3a',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  macrosCard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.4rem',
    background: '#ffffff',
    border: '1px solid #cdd8bc',
    borderRadius: 14,
    padding: '1rem',
    marginBottom: '1rem',
  },
  macroItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  macroValor: {
    fontSize: '1.1rem',
    fontWeight: 500,
    color: '#4a5e3a',
    letterSpacing: '-0.5px',
  },
  macroUnidad: {
    fontSize: '0.6rem',
    fontWeight: 400,
    marginLeft: 1,
  },
  macroLabel: {
    fontSize: '0.6rem',
    color: '#9aa08e',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  felicidades: {
    marginTop: '1rem',
    background: '#eef1e8',
    border: '1px solid #cdd8bc',
    borderRadius: 14,
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  felicidadesTexto: {
    fontSize: '0.9rem',
    color: '#4a5e3a',
    fontWeight: 500,
  },
}
