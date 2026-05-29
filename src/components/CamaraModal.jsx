import React, { useState, useEffect, useRef, useCallback } from 'react'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_CAMARA_KEY
const GEMINI_MODEL   = 'gemini-2.5-flash'

export default function CamaraModal({ item, onClose, onGuardar }) {
  const [fase, setFase]           = useState('camara')
  const [fotoBase64, setFoto]     = useState(null)
  const [resultado, setResultado] = useState(null)
  const [errorMsg, setErrorMsg]   = useState('')

  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const iniciarCamara = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setErrorMsg('No se pudo acceder a la cámara. Comprueba los permisos.')
      setFase('error')
    }
  }, [])

  const pararCamara = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    iniciarCamara()
    return pararCamara
  }, [iniciarCamara, pararCamara])

  const capturar = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
    setFoto(base64)
    pararCamara()
    setFase('preview')
  }

  const analizar = async () => {
    setFase('analizando')
    try {
      const prompt = `Analiza esta etiqueta de información nutricional y extrae los valores por 100g de producto.
Devuelve SOLO un JSON sin markdown con este formato exacto:
{"kcal": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0}
Todos los valores son números. kcal en kilocalorías, el resto en gramos por 100g. Si no puedes leer un valor con certeza, pon 0.`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: fotoBase64 } },
                { text: prompt },
              ],
            }],
          }),
        }
      )
      if (!res.ok) throw new Error(`Error API: ${res.status}`)
      const json  = await res.json()
      const texto = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const match = texto.match(/\{[\s\S]*?\}/)
      if (!match) throw new Error('No se pudo leer la respuesta')
      setResultado(JSON.parse(match[0]))
      setFase('resultado')
    } catch (e) {
      setErrorMsg(e.message || 'Error al analizar la imagen')
      setFase('error')
    }
  }

  const repetir = () => {
    setFoto(null)
    setResultado(null)
    setErrorMsg('')
    setFase('camara')
    iniciarCamara()
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal} className="fade-in">

        <div style={s.header}>
          <span style={s.titulo}>📷 Escanear etiqueta</span>
          <button onClick={onClose} style={s.btnX}>✕</button>
        </div>
        <p style={s.sub}>{item.nombre}</p>

        {fase === 'camara' && (
          <>
            <div style={{ ...s.videoWrap, flex: 1 }}>
              <video ref={videoRef} autoPlay playsInline muted style={s.video} />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button onClick={capturar} style={s.btnPrimario}>📸 Hacer foto</button>
          </>
        )}

        {fase === 'preview' && fotoBase64 && (
          <>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ ...s.videoWrap, flex: 1 }}>
              <img src={`data:image/jpeg;base64,${fotoBase64}`} alt="preview" style={s.video} />
            </div>
            <div style={s.fila}>
              <button onClick={repetir} style={s.btnSecundario}>🔄 Repetir</button>
              <button onClick={analizar} style={s.btnPrimario}>✨ Analizar</button>
            </div>
          </>
        )}

        {fase === 'analizando' && (
          <div style={s.centrado}>
            <div style={s.spinner} />
            <p style={s.hint}>Analizando etiqueta...</p>
          </div>
        )}

        {fase === 'resultado' && resultado && (
          <>
            <div style={s.resultCard}>
              <p style={s.resultLabel}>Valores por 100 g</p>
              <div style={s.macrosGrid}>
                {[
                  { label: 'Calorías',  valor: resultado.kcal,          unidad: 'kcal' },
                  { label: 'Proteínas', valor: resultado.proteinas,      unidad: 'g' },
                  { label: 'Carbos',    valor: resultado.carbohidratos,  unidad: 'g' },
                  { label: 'Grasas',    valor: resultado.grasas,         unidad: 'g' },
                ].map(m => (
                  <div key={m.label} style={s.macroItem}>
                    <span style={s.macroValor}>
                      {m.valor}<span style={s.macroUnidad}>{m.unidad}</span>
                    </span>
                    <span style={s.macroLabel}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.fila}>
              <button onClick={repetir} style={s.btnSecundario}>🔄 Repetir</button>
              <button onClick={() => onGuardar(item.nombre, resultado)} style={s.btnPrimario}>
                💾 Guardar
              </button>
            </div>
          </>
        )}

        {fase === 'error' && (
          <div style={s.centrado}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <p style={{ ...s.hint, color: '#c0392b', textAlign: 'center' }}>{errorMsg}</p>
            <button onClick={repetir} style={s.btnSecundario}>🔄 Intentar de nuevo</button>
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modal: {
    background: '#faf8f3',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 480,
    padding: '1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom))',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.2rem',
  },
  titulo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.15rem',
    color: '#1c1e18',
    fontWeight: 500,
  },
  btnX: {
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    color: '#9aa08e',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
  },
  sub: {
    fontSize: '0.75rem',
    color: '#9aa08e',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '1rem',
  },
  videoWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    background: '#000',
    width: '100%',
    height: '42vh',
    marginBottom: '1rem',
    flexShrink: 0,
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  fila: {
    display: 'flex',
    gap: '0.5rem',
  },
  btnPrimario: {
    flex: 2,
    padding: '0.85rem',
    background: '#4a5e3a',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnSecundario: {
    flex: 1,
    padding: '0.85rem',
    background: 'white',
    color: '#4a5e3a',
    border: '1.5px solid #cdd8bc',
    borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  centrado: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '2rem 0',
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '3px solid #cdd8bc',
    borderTopColor: '#4a5e3a',
    animation: 'spin 0.8s linear infinite',
  },
  hint: {
    fontSize: '0.88rem',
    color: '#4a5e3a',
    fontWeight: 500,
  },
  resultCard: {
    background: 'white',
    border: '1px solid #cdd8bc',
    borderRadius: 14,
    padding: '1rem',
    marginBottom: '1rem',
  },
  resultLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#9aa08e',
    marginBottom: '0.75rem',
  },
  macrosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.4rem',
  },
  macroItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  macroValor: {
    fontSize: '1.05rem',
    fontWeight: 500,
    color: '#4a5e3a',
    letterSpacing: '-0.5px',
  },
  macroUnidad: {
    fontSize: '0.58rem',
    fontWeight: 400,
    marginLeft: 1,
  },
  macroLabel: {
    fontSize: '0.58rem',
    color: '#9aa08e',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
}
