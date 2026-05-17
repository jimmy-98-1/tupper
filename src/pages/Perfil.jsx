import React, { useState, useRef, useEffect } from 'react'
import {
  getUsuario, setUsuario,
  getDieta, setDieta,
  getApiKey, setApiKey,
  setCompra, limpiarTodo,
} from '../utils/storage'

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function validarEstructuraDieta(obj) {
  if (!obj || typeof obj !== 'object') return false
  return DIAS_SEMANA.some(dia => Array.isArray(obj[dia]?.tomas))
}

async function extraerDietaDelPDF(pdfBase64, apiKey, signal) {
  const prompt = `Eres un nutricionista experto y extractor de dietas. Analiza este PDF y extrae la dieta semanal completa.

INSTRUCCIONES PARA LAS MACROS:
Calcula las macros con máxima precisión siguiendo estos pasos:
1. Para cada alimento de cada toma, busca sus valores nutricionales exactos por 100g
2. Aplica la cantidad indicada en la dieta para obtener las macros reales de ese alimento
3. Suma todas las tomas del día para obtener el total diario de calorías, proteínas, carbohidratos y grasas
4. Repite para los 7 días
5. Suma los 7 días para obtener el TOTAL SEMANAL y ponlo en el campo "macros"

Valores de referencia que debes usar:
- Avena: 350kcal, 13g prot, 58g carb, 7g grasa por 100g
- Arroz blanco cocido: 130kcal, 2.7g prot, 28g carb, 0.3g grasa por 100g
- Pechuga de pollo: 165kcal, 31g prot, 0g carb, 3.6g grasa por 100g
- Huevo entero: 155kcal, 13g prot, 1.1g carb, 11g grasa por 100g (1 huevo = 60g)
- Yogur griego: 97kcal, 9g prot, 3.6g carb, 5g grasa por 100g
- Pasta cocida: 131kcal, 5g prot, 25g carb, 1.1g grasa por 100g
- Ternera picada: 254kcal, 17g prot, 0g carb, 20g grasa por 100g
- Salmón: 208kcal, 20g prot, 0g carb, 13g grasa por 100g
- Pan integral: 247kcal, 9g prot, 41g carb, 3.4g grasa por 100g
- Atún al natural: 116kcal, 26g prot, 0g carb, 1g grasa por 100g (1 lata = 80g)
- Garbanzos cocidos: 164kcal, 9g prot, 27g carb, 2.6g grasa por 100g
- Proteína en polvo: 400kcal, 80g prot, 5g carb, 5g grasa por 100g (1 scoop = 30g)
- Aceite de oliva: 884kcal, 0g prot, 0g carb, 100g grasa por 100g (1 cucharada = 10g)
- Leche semidesnatada: 46kcal, 3.4g prot, 4.7g carb, 1.6g grasa por 100ml
- Tortilla de maíz: 218kcal, 5g prot, 46g carb, 2.5g grasa por 100g
Para alimentos no listados, usa valores nutricionales estándar de bases de datos oficiales.

IMPORTANTE: En el campo "alimentos" de cada toma lista los INGREDIENTES INDIVIDUALES, no el nombre del plato. Por ejemplo "Bocadillo de pan integral con embutido" → [{nombre: "Pan integral", cantidad: "2 rebanadas"}, {nombre: "Embutido", cantidad: "2 lonchas"}].

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{
  "macros": { "calorias": 14000, "proteinas": 1050, "carbohidratos": 1400, "grasas": 490 },
  "Lunes": {
    "tomas": [
      {
        "nombre": "Desayuno",
        "calorias": 400,
        "proteinas": 30,
        "carbohidratos": 45,
        "grasas": 12,
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

Extrae todos los días y todas las tomas con sus ingredientes individuales y cantidades exactas del PDF. Calcula las macros de cada toma individualmente y suma el total semanal para el campo "macros".`

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: pdfBase64,
              },
            },
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
  const [apiKey, setApiKeyState] = useState(getApiKey())
  const [cargando, setCargando]  = useState(false)
  const [estado, setEstado]      = useState(null) // { tipo: 'ok'|'error', msg: '' }
  const [mostrarApiKey, setMostrarApiKey] = useState(false)
  const fileRef    = useRef()
  const abortRef   = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const macros = dieta?.macros || null

  const handlePDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!apiKey.trim()) {
      setEstado({ tipo: 'error', msg: 'Introduce tu API Key de Gemini primero.' })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setCargando(true)
    setEstado(null)

    try {
      const base64   = await fileToBase64(file)
      const dietaObj = await extraerDietaDelPDF(base64, apiKey.trim(), controller.signal)

      setDieta(dietaObj)

      // Regenerar lista de compra automáticamente
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

  const guardarApiKey = () => {
    setApiKey(apiKey)
    setEstado({ tipo: 'ok', msg: 'API Key guardada.' })
    setTimeout(() => setEstado(null), 2000)
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

      {/* Macros */}
      {macros && (
        <div style={styles.macrosSection}>
          <p style={styles.seccionLabel}>Macros semanales</p>
          <div style={styles.macrosGrid}>
            {[
              { label: 'Calorías', valor: macros.calorias, unidad: 'kcal', color: '#4a5e3a' },
              { label: 'Proteínas', valor: macros.proteinas, unidad: 'g', color: '#5d7349' },
              { label: 'Carbos', valor: macros.carbohidratos, unidad: 'g', color: '#7a9464' },
              { label: 'Grasas', valor: macros.grasas, unidad: 'g', color: '#9aaa84' },
            ].map(m => (
              <div key={m.label} style={styles.macroCard}>
                <p style={{ ...styles.macroValor, color: m.color }}>
                  {m.valor > 9999 ? m.valor.toLocaleString('es-ES') : m.valor}<span style={styles.macroUnidad}>{m.unidad}</span>
                </p>
                <p style={styles.macroLabel}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* API Key */}
      <div style={styles.seccion}>
        <p style={styles.seccionLabel}>Configuración</p>
        <div style={styles.card}>
          <p style={styles.cardTitle}>API Key de Gemini</p>
          <p style={styles.cardDesc}>
            Necesaria para que la IA lea tu PDF. La puedes obtener en{' '}
            <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={styles.link}>
              aistudio.google.com
            </a>
          </p>
          <div style={styles.apiKeyRow}>
            <input
              type={mostrarApiKey ? 'text' : 'password'}
              placeholder="AIza..."
              value={apiKey}
              onChange={e => setApiKeyState(e.target.value)}
              style={styles.apiInput}
            />
            <button
              onClick={() => setMostrarApiKey(v => !v)}
              style={styles.btnOjo}
            >
              {mostrarApiKey ? '🙈' : '👁️'}
            </button>
          </div>
          <button onClick={guardarApiKey} style={styles.btnSecundario}>
            Guardar
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
  macrosSection: { marginBottom: '1.5rem' },
  macrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  macroCard: {
    background: '#ffffff',
    border: '1px solid #cdd8bc',
    borderRadius: 12,
    padding: '0.75rem 0.5rem',
    textAlign: 'center',
  },
  macroValor: {
    fontSize: '1.1rem',
    fontWeight: 500,
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
  btnSecundario: {
    padding: '0.65rem 1.2rem',
    background: 'transparent',
    color: '#4a5e3a',
    border: '1.5px solid #cdd8bc',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  apiKeyRow: {
    display: 'flex',
    gap: '0.4rem',
    marginBottom: '0.5rem',
  },
  apiInput: {
    flex: 1,
    padding: '0.7rem 0.9rem',
    border: '1.5px solid #cdd8bc',
    borderRadius: 10,
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    background: '#faf8f3',
    color: '#1c1e18',
    outline: 'none',
  },
  btnOjo: {
    background: 'none',
    border: '1.5px solid #cdd8bc',
    borderRadius: 10,
    padding: '0 0.7rem',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  link: { color: '#4a5e3a' },
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
