import React, { useState, useRef, useEffect } from 'react'
import {
  getUsuario, setUsuario,
  getDieta, setDieta,
  setCompra, limpiarTodo,
} from '../utils/storage'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function validarEstructuraDieta(obj) {
  if (!obj || typeof obj !== 'object') return false
  return DIAS_SEMANA.some(dia => Array.isArray(obj[dia]?.tomas))
}

async function extraerDietaDelPDF(pdfBase64, signal) {
  const prompt = `Eres un extractor de dietas. Analiza este PDF y extrae la dieta semanal completa.

En el campo "alimentos" de cada toma lista los INGREDIENTES INDIVIDUALES con sus cantidades exactas. Por ejemplo "Bocadillo de pan integral con embutido" → [{nombre: "Pan integral", cantidad: "80g"}, {nombre: "Embutido", cantidad: "40g"}].

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{
  "Lunes": {
    "tomas": [
      {
        "nombre": "Desayuno",
        "alimentos": [
          { "nombre": "Avena", "cantidad": "80g" },
          { "nombre": "Leche semidesnatada", "cantidad": "200ml" }
        ]
      }
    ]
  },
  "Martes": { "tomas": [...] },
  "Miércoles": { "tomas": [...] },
  "Jueves": { "tomas": [...] },
  "Viernes": { "tomas": [...] },
  "Sábado": { "tomas": [...] },
  "Domingo": { "tomas": [...] }
}

Extrae todos los días y todas las tomas con sus ingredientes individuales y cantidades exactas del PDF.`

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
            { text: prompt },
          ],
        }],
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error ${response.status}`)
  }

  const data = await response.json()
  const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  const limpio = texto.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const obj = JSON.parse(limpio)
  if (!validarEstructuraDieta(obj)) {
    throw new Error('La IA no devolvió una dieta válida. Intenta de nuevo.')
  }
  return obj
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Perfil({ onDietaCargada }) {
  const usuario    = getUsuario()
  const dieta      = getDieta()
  const [cargando, setCargando] = useState(false)
  const [estado, setEstado]     = useState(null)
  const fileRef  = useRef()
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const handlePDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setCargando(true)
    setEstado(null)

    try {
      const base64   = await fileToBase64(file)
      const dietaObj = await extraerDietaDelPDF(base64, controller.signal)

      setDieta(dietaObj)
      setCompra([])

      setEstado({ tipo: 'ok', msg: '¡Dieta cargada correctamente! 🎉' })
      if (onDietaCargada) onDietaCargada()
    } catch (err) {
      if (err.name !== 'AbortError') {
        setEstado({ tipo: 'error', msg: `Error al leer el PDF: ${err.message}` })
      }
    } finally {
      setCargando(false)
      e.target.value = ''
    }
  }

  const handleReset = () => {
    if (!window.confirm('⚠️ ¿Seguro? Esto borrará tu dieta, lista de la compra y toda tu configuración. No se puede deshacer.')) return
    limpiarTodo()
    window.location.reload()
  }

  return (
    <div className="fade-in">
      {/* Cabecera usuario */}
      <div style={styles.userHeader}>
        <div style={styles.avatar}>
          <span style={styles.avatarLetra}>
            {usuario?.nombre?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div>
          <h1 style={{ ...styles.nombre, fontFamily: "'Playfair Display', serif" }}>
            {usuario?.nombre || 'Usuario'}
          </h1>
          <p style={styles.subtitulo}>
            {dieta ? '✓ Dieta cargada' : 'Sin dieta'}
          </p>
        </div>
      </div>

      {/* Subir PDF */}
      <div style={styles.seccion}>
        <p style={styles.seccionLabel}>Dieta nutricional</p>
        <div style={styles.card}>
          <p style={styles.cardTitle}>
            {dieta ? '🔄 Actualizar dieta' : '📄 Subir dieta en PDF'}
          </p>
          <p style={styles.cardDesc}>
            Tu novia te ha pasado la dieta en PDF. Súbela aquí y la IA la extraerá automáticamente.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={handlePDF}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={cargando}
            style={{ ...styles.btnPrimario, ...(cargando ? styles.btnDisabled : {}) }}
          >
            {cargando ? '⏳ Leyendo PDF...' : '📤 Seleccionar PDF'}
          </button>
        </div>
      </div>

      {/* Estado feedback */}
      {estado && (
        <div style={{
          ...styles.toast,
          background: estado.tipo === 'ok' ? '#eef1e8' : '#fdf0f0',
          borderColor: estado.tipo === 'ok' ? '#cdd8bc' : '#f5c6c6',
          color: estado.tipo === 'ok' ? '#4a5e3a' : '#c0392b',
        }} className="fade-in">
          {estado.msg}
        </div>
      )}

      {/* Zona peligrosa */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button onClick={handleReset} style={styles.btnReset}>
          🗑️ Borrar todos los datos
        </button>
      </div>

      <div style={{ height: '1rem' }} />
    </div>
  )
}

const styles = {
  userHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.75rem',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    background: '#4a5e3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetra: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.5rem',
    color: 'white',
  },
  nombre: {
    fontSize: '1.6rem',
    fontWeight: 500,
    color: '#1c1e18',
    letterSpacing: '-0.5px',
  },
  subtitulo: {
    fontSize: '0.78rem',
    color: '#9aa08e',
    marginTop: 2,
  },
  seccion: { marginBottom: '1.25rem' },
  seccionLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#9aa08e',
    marginBottom: '0.5rem',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #cdd8bc',
    borderRadius: 16,
    padding: '1.1rem',
  },
  cardTitle: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#1c1e18',
    marginBottom: '0.3rem',
  },
  cardDesc: {
    fontSize: '0.78rem',
    color: '#9aa08e',
    lineHeight: 1.55,
    marginBottom: '0.9rem',
  },
  btnPrimario: {
    width: '100%',
    padding: '0.8rem',
    background: '#4a5e3a',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  btnDisabled: {
    background: '#9aa08e',
    cursor: 'not-allowed',
  },
  toast: {
    padding: '0.85rem 1rem',
    borderRadius: 12,
    border: '1px solid',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginTop: '1rem',
  },
  btnReset: {
    background: 'none',
    border: 'none',
    color: '#c0392b',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    opacity: 0.6,
  },
}
