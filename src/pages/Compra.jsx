import React, { useState, useEffect, useMemo } from 'react'
import {
  getCompra, setCompra, getDieta,
  getCompraFecha, setCompraFecha, removeCompraFecha,
} from '../utils/storage'

function parseCantidad(str) {
  if (!str) return null
  const m = str.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  return m ? { valor: parseFloat(m[1].replace(',', '.')), unidad: m[2].trim().toLowerCase() } : null
}

function generarListaDesde(dieta) {
  if (!dieta) return []
  const mapa = {}

  Object.values(dieta).forEach(dia => {
    if (!dia.tomas) return
    dia.tomas.forEach(toma => {
      if (!toma.alimentos) return
      toma.alimentos.forEach(alimento => {
        if (!alimento?.nombre) return
        const clave = alimento.nombre.toLowerCase().trim()
        const cantidadLimpia = alimento.cantidad && alimento.cantidad !== 'N/A' && alimento.cantidad !== 'null' ? alimento.cantidad : ''
        if (mapa[clave]) {
          mapa[clave].menciones += 1
          if (cantidadLimpia) mapa[clave]._cantidades.push(cantidadLimpia)
        } else {
          mapa[clave] = {
            id: clave,
            nombre: alimento.nombre,
            cantidad: cantidadLimpia,
            menciones: 1,
            hecho: false,
            supermercado: 'sin-asignar',
            _cantidades: cantidadLimpia ? [cantidadLimpia] : [],
          }
        }
      })
    })
  })

  return Object.values(mapa).map(item => {
    let totalSemana = ''
    if (item._cantidades.length > 0) {
      const parsed = item._cantidades.map(parseCantidad).filter(Boolean)
      if (parsed.length === item._cantidades.length) {
        const unidades = [...new Set(parsed.map(p => p.unidad))]
        if (unidades.length === 1) {
          const total = parsed.reduce((s, p) => s + p.valor, 0)
          const u = unidades[0]
          const totalStr = Number.isInteger(total) ? total : +total.toFixed(1)
          totalSemana = `Total semana: ${totalStr}${u ? ' ' + u : ''}`
        }
      }
    }
    const { _cantidades, ...rest } = item
    return { ...rest, totalSemana }
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export default function Compra() {
  const [items, setItems]               = useState([])
  const [nuevoTexto, setNuevoTexto]     = useState('')
  const [nuevoSuper, setNuevoSuper]     = useState(null)
  const [editandoId, setEditandoId]     = useState(null)
  const [editTexto, setEditTexto]       = useState('')
  const [selectorId, setSelectorId]     = useState(null)
  const [nuevaSemana, setNuevaSemana]   = useState(false)

  useEffect(() => {
    const guardada = getCompra()
    if (guardada && guardada.length > 0) {
      setItems(guardada)
    } else {
      const dieta = getDieta()
      const generada = generarListaDesde(dieta)
      setItems(generada)
      setCompra(generada)
      setCompraFecha(new Date().toISOString())
    }

    const fechaGuardada = getCompraFecha()
    if (fechaGuardada) {
      const ultima = new Date(fechaGuardada)
      const hoy = new Date()
      const esLunes = hoy.getDay() === 1
      const esSemanaDistinta = hoy.getTime() - ultima.getTime() > 6 * 24 * 60 * 60 * 1000
      if (esLunes && esSemanaDistinta) setNuevaSemana(true)
    }
  }, [])

  const guardar = (nuevos) => {
    setItems(nuevos)
    setCompra(nuevos)
  }

  const toggleHecho = (id) => {
    guardar(items.map(i => i.id === id ? { ...i, hecho: !i.hecho } : i))
  }

  const eliminar = (id) => {
    guardar(items.filter(i => i.id !== id))
  }

  const cambiarSuper = (id, supermercado) => {
    guardar(items.map(i => i.id === id ? { ...i, supermercado } : i))
    setSelectorId(null)
  }

  const agregarItem = (superOverride) => {
    const texto = nuevoTexto.trim()
    if (!texto) return
    const super_ = superOverride || nuevoSuper || 'sin-asignar'
    const nuevo = {
      id: Date.now().toString(),
      nombre: texto,
      cantidad: '',
      totalSemana: '',
      menciones: 1,
      hecho: false,
      supermercado: super_,
    }
    guardar([...items, nuevo])
    setNuevoTexto('')
    setNuevoSuper(null)
  }

  const iniciarEdicion = (item) => {
    setEditandoId(item.id)
    setEditTexto(item.nombre + (item.cantidad ? ` · ${item.cantidad}` : ''))
  }

  const guardarEdicion = (id) => {
    const partes = editTexto.split('·')
    const nombre   = partes[0].trim()
    const cantidad = partes[1] ? partes[1].trim() : ''
    guardar(items.map(i => i.id === id ? { ...i, nombre, cantidad } : i))
    setEditandoId(null)
  }

  const regenerar = () => {
    const reiniciados = items.map(i => ({ ...i, hecho: false }))
    guardar(reiniciados)
    setCompraFecha(new Date().toISOString())
  }

  const sinAsignar = useMemo(() => items.filter(i => i.supermercado === 'sin-asignar'), [items])
  const mercadona  = useMemo(() => items.filter(i => i.supermercado === 'mercadona'), [items])
  const lidl       = useMemo(() => items.filter(i => i.supermercado === 'lidl'), [items])

  const itemProps = { editandoId, editTexto, selectorId, onToggle: toggleHecho, onEliminar: eliminar, onEditar: iniciarEdicion, onGuardarEdicion: guardarEdicion, onChangeEdit: setEditTexto, onAbrirSelector: setSelectorId, onCambiarSuper: cambiarSuper }

  return (
    <div className="fade-in">
      {/* Cabecera */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ ...styles.titulo, fontFamily: "'Playfair Display', serif" }}>
            La compra
          </h1>
          {(() => {
              const hechos = items.filter(i => i.hecho).length
              const total = items.length
              const todo = hechos === total && total > 0
              return (
                <span style={{
                  background: todo ? '#4a5e3a' : '#eef1e8',
                  color: todo ? 'white' : '#4a5e3a',
                  fontSize: '0.72rem', fontWeight: 500,
                  padding: '3px 10px', borderRadius: 99,
                  border: `1px solid ${todo ? '#4a5e3a' : '#cdd8bc'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {todo ? '🎉 ¡Todo en el carro!' : hechos === 0 ? `🛒 0 / ${total} productos` : `🛒 ${hechos} / ${total} en el carro`}
                </span>
              )
            })()}
        </div>
        <button onClick={regenerar} style={styles.btnRegenerar} title="Regenerar desde dieta">
          🔄
        </button>
      </div>

      {/* Banner nueva semana */}
      {nuevaSemana && (
        <div style={styles.bannerNuevaSemana} className="fade-in">
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>📅</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 500, color: '#5a4a1a', fontSize: '0.9rem', marginBottom: 2 }}>¡Nueva semana!</p>
            <p style={{ color: '#9aa08e', fontSize: '0.78rem', lineHeight: 1.4 }}>¿Regeneramos la lista de la compra desde tu dieta?</p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <button
              onClick={() => setNuevaSemana(false)}
              style={styles.btnBannerNo}
            >Ahora no</button>
            <button
              onClick={() => { regenerar(); setNuevaSemana(false); removeCompraFecha() }}
              style={styles.btnBannerSi}
            >Regenerar 🔄</button>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div style={styles.vacio} className="fade-in">
          <span style={{ fontSize: '2.5rem' }}>🛒</span>
          <p style={styles.vacioTexto}>Sube tu dieta en Perfil para generar la lista automáticamente.</p>
        </div>
      )}

      {/* Sin asignar */}
      {sinAsignar.length > 0 && (
        <div style={styles.seccion}>
          <p style={styles.seccionLabel}>Sin asignar</p>
          {sinAsignar.map(item => <ItemCompra key={item.id} item={item} {...itemProps} />)}
        </div>
      )}

      {/* Mercadona */}
      {mercadona.length > 0 && (
        <div style={{ marginTop: sinAsignar.length > 0 ? '1.25rem' : 0 }}>
          <div style={styles.cabeceraMercadona}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>Mercadona</span>
            <span style={styles.pillaMercadona}>{mercadona.length}</span>
          </div>
          {mercadona.map(item => <ItemCompra key={item.id} item={item} {...itemProps} />)}
        </div>
      )}

      {/* Lidl */}
      {lidl.length > 0 && (
        <div style={{ marginTop: (sinAsignar.length > 0 || mercadona.length > 0) ? '1.25rem' : 0 }}>
          <div style={styles.cabeceraLidl}>
            <span style={{ fontWeight: 600 }}>Lidl</span>
            <span style={styles.pillaLidl}>{lidl.length}</span>
          </div>
          {lidl.map(item => <ItemCompra key={item.id} item={item} {...itemProps} />)}
        </div>
      )}

      {/* Celebración cuando todo está hecho */}
      {items.length > 0 && items.every(i => i.hecho) && (
        <div style={{
          background: '#eef1e8', border: '1px solid #cdd8bc',
          borderRadius: 14, padding: '1rem', marginTop: '1.25rem',
          textAlign: 'center',
        }} className="fade-in">
          <p style={{ color: '#4a5e3a', fontWeight: 500, fontSize: '0.95rem' }}>
            ¡Compra lista! Buen provecho 🥗
          </p>
        </div>
      )}

      {/* Añadir item */}
      <div style={{ marginTop: '1.25rem' }}>
        <div style={styles.addRow}>
          <input
            type="text"
            placeholder="Añadir producto..."
            value={nuevoTexto}
            onChange={e => setNuevoTexto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarItem()}
            style={styles.addInput}
          />
        </div>
        {nuevoTexto.trim() && (
          <div style={styles.addSuperRow}>
            <button onClick={() => agregarItem('mercadona')} style={styles.btnAddMercadona}>🟢 Mercadona</button>
            <button onClick={() => agregarItem('lidl')} style={styles.btnAddLidl}>🔵 Lidl</button>
            <button onClick={() => agregarItem('sin-asignar')} style={styles.btnAddSinAsignar}>➕ Sin asignar</button>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemCompra({ item, editandoId, editTexto, selectorId, onToggle, onEliminar, onEditar, onGuardarEdicion, onChangeEdit, onAbrirSelector, onCambiarSuper }) {
  const editando    = editandoId === item.id
  const selectorAbierto = selectorId === item.id

  return (
    <div style={{ ...styles.item, ...(item.hecho ? styles.itemHecho : {}) }}>
      <button onClick={() => onToggle(item.id)} style={styles.checkBtn}>
        <span style={{ ...styles.checkCircle, ...(item.hecho ? styles.checkCircleActivo : {}) }}>
          {item.hecho ? '✓' : ''}
        </span>
      </button>

      <div style={styles.itemContenido}>
        {editando ? (
          <input
            autoFocus
            value={editTexto}
            onChange={e => onChangeEdit(e.target.value)}
            onBlur={() => onGuardarEdicion(item.id)}
            onKeyDown={e => e.key === 'Enter' && onGuardarEdicion(item.id)}
            style={styles.editInput}
          />
        ) : (
          <>
            <div
              onClick={() => selectorAbierto ? onAbrirSelector(null) : onAbrirSelector(item.id)}
              style={{ cursor: 'pointer' }}
            >
              <span style={{ ...styles.itemNombre, ...(item.hecho ? styles.itemNombreHecho : {}) }}>
                {item.nombre}
              </span>
              {item.totalSemana ? (
                <span style={styles.itemCantidad}> · {item.totalSemana}</span>
              ) : item.cantidad ? (
                <span style={styles.itemCantidad}> · {item.cantidad}</span>
              ) : null}
            </div>
            {selectorAbierto && (
              <div style={styles.selectorSuper}>
                {[
                  { key: 'mercadona', label: '🟢 Mercadona' },
                  { key: 'lidl',      label: '🔵 Lidl' },
                  { key: 'sin-asignar', label: '⚪ Sin asignar' },
                ].map(op => (
                  <button
                    key={op.key}
                    onClick={() => onCambiarSuper(item.id, op.key)}
                    style={{
                      ...styles.btnSelector,
                      ...(item.supermercado === op.key ? styles.btnSelectorActivo : {}),
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => onEditar(item)}
        style={styles.editarBtn}
        title="Editar cantidad"
      >
        ✏️
      </button>
      <button onClick={() => onEliminar(item.id)} style={styles.eliminarBtn}>✕</button>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  titulo: {
    fontSize: '1.9rem',
    fontWeight: 500,
    color: '#1c1e18',
    letterSpacing: '-0.5px',
  },
  btnRegenerar: {
    background: 'none',
    border: '1px solid #cdd8bc',
    borderRadius: 10,
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#4a5e3a',
  },
  seccion: { display: 'flex', flexDirection: 'column' },
  seccionLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#9aa08e',
    marginBottom: '0.5rem',
  },
  cabeceraMercadona: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#00855B',
    color: 'white',
    borderRadius: 12,
    padding: '10px 16px',
    marginBottom: '0.5rem',
    fontSize: '0.95rem',
  },
  pillaMercadona: {
    background: 'white',
    color: '#00855B',
    borderRadius: 99,
    padding: '2px 9px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  cabeceraLidl: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0050AA',
    color: 'white',
    borderRadius: 12,
    padding: '10px 16px',
    marginBottom: '0.5rem',
    fontSize: '0.95rem',
    borderLeft: '4px solid #FFD700',
  },
  pillaLidl: {
    background: 'white',
    color: '#0050AA',
    borderRadius: 99,
    padding: '2px 9px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    background: '#ffffff',
    border: '1px solid #cdd8bc',
    borderRadius: 12,
    padding: '0.75rem 0.9rem',
    marginBottom: '0.4rem',
    transition: 'all 0.15s',
  },
  itemHecho: {
    background: '#eef1e8',
    opacity: 0.65,
  },
  checkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    marginTop: 2,
  },
  checkCircle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '1.5px solid #cdd8bc',
    fontSize: '0.65rem',
    color: 'white',
    transition: 'all 0.15s',
  },
  checkCircleActivo: {
    background: '#4a5e3a',
    borderColor: '#4a5e3a',
  },
  itemContenido: { flex: 1, minWidth: 0 },
  itemNombre: {
    fontSize: '0.9rem',
    color: '#1c1e18',
  },
  itemNombreHecho: {
    textDecoration: 'line-through',
    color: '#9aa08e',
  },
  itemCantidad: {
    fontSize: '0.8rem',
    color: '#6b7f5a',
    fontWeight: 500,
  },
  selectorSuper: {
    display: 'flex',
    gap: '0.3rem',
    marginTop: '0.45rem',
    flexWrap: 'wrap',
  },
  btnSelector: {
    fontSize: '0.72rem',
    padding: '3px 10px',
    borderRadius: 99,
    border: '1px solid #cdd8bc',
    background: '#faf8f3',
    color: '#4a5e3a',
    cursor: 'pointer',
    transition: 'all 0.12s',
  },
  btnSelectorActivo: {
    background: '#4a5e3a',
    color: 'white',
    borderColor: '#4a5e3a',
  },
  editInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    color: '#1c1e18',
  },
  editarBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.7rem',
    padding: '0 0.1rem',
    flexShrink: 0,
    opacity: 0.4,
  },
  eliminarBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#cdd8bc',
    fontSize: '0.75rem',
    padding: '0 0.2rem',
    transition: 'color 0.15s',
    flexShrink: 0,
  },
  addRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  addInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    border: '1.5px solid #cdd8bc',
    borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    background: '#ffffff',
    color: '#1c1e18',
    outline: 'none',
  },
  addSuperRow: {
    display: 'flex',
    gap: '0.4rem',
    marginTop: '0.5rem',
  },
  btnAddMercadona: {
    flex: 1,
    padding: '0.55rem 0',
    background: '#00855B',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnAddLidl: {
    flex: 1,
    padding: '0.55rem 0',
    background: '#0050AA',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnAddSinAsignar: {
    flex: 1,
    padding: '0.55rem 0',
    background: '#f3f1ea',
    color: '#4a5e3a',
    border: '1px solid #cdd8bc',
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  vacio: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '3rem 0',
    textAlign: 'center',
  },
  vacioTexto: {
    fontSize: '0.85rem',
    color: '#9aa08e',
    lineHeight: 1.6,
    maxWidth: 260,
  },
  bannerNuevaSemana: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#faf3e0',
    border: '1.5px solid #e8c96a',
    borderRadius: 14,
    padding: '0.9rem 1rem',
    marginBottom: '1rem',
  },
  btnBannerNo: {
    padding: '0.45rem 0.75rem',
    background: 'transparent',
    border: '1px solid #cdd8bc',
    borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    color: '#9aa08e',
    cursor: 'pointer',
  },
  btnBannerSi: {
    padding: '0.45rem 0.75rem',
    background: '#4a5e3a',
    border: 'none',
    borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    color: 'white',
    fontWeight: 500,
    cursor: 'pointer',
  },
}
