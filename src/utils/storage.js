const KEYS = {
  USUARIO:      'tupper_usuario',
  DIETA:        'tupper_dieta',
  COMPLETADAS:  'tupper_completadas',
  COMPRA:       'tupper_compra',
  API_KEY:      'tupper_api_key',
  COMPRA_FECHA: 'tupper_compra_fecha',
  NUTRICION:    'tupper_nutricion',
}

// ── Usuario ──
export const getUsuario = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.USUARIO)) }
  catch { return null }
}
export const setUsuario = (usuario) =>
  localStorage.setItem(KEYS.USUARIO, JSON.stringify(usuario))

// ── Dieta completa (7 días) ──
export const getDieta = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.DIETA)) }
  catch { return null }
}
export const setDieta = (dieta) =>
  localStorage.setItem(KEYS.DIETA, JSON.stringify(dieta))

// ── Tomas completadas hoy ──
// Formato: { '2025-07-14': ['desayuno', 'almuerzo', ...] }
export const getCompletadasHoy = () => {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.COMPLETADAS)) || {}
    const hoy  = getFechaHoy()
    return data[hoy] || []
  } catch { return [] }
}
export const toggleCompletada = (nombreToma) => {
  try {
    const data = JSON.parse(localStorage.getItem(KEYS.COMPLETADAS)) || {}
    const hoy  = getFechaHoy()
    const lista = data[hoy] || []
    if (lista.includes(nombreToma)) {
      data[hoy] = lista.filter(t => t !== nombreToma)
    } else {
      data[hoy] = [...lista, nombreToma]
    }
    localStorage.setItem(KEYS.COMPLETADAS, JSON.stringify(data))
    return data[hoy]
  } catch { return [] }
}

// ── Lista de la compra ──
export const getCompra = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.COMPRA)) || [] }
  catch { return [] }
}
export const setCompra = (items) =>
  localStorage.setItem(KEYS.COMPRA, JSON.stringify(items))

// ── Fecha de la última lista de compra generada ──
export const getCompraFecha = () => localStorage.getItem(KEYS.COMPRA_FECHA) || ''
export const setCompraFecha = (fecha) => localStorage.setItem(KEYS.COMPRA_FECHA, fecha)
export const removeCompraFecha = () => localStorage.removeItem(KEYS.COMPRA_FECHA)

// ── API Key ──
export const getApiKey = () => localStorage.getItem(KEYS.API_KEY) || ''
export const setApiKey = (key) => localStorage.setItem(KEYS.API_KEY, key)

// ── Nutrición escaneada (valores por 100g por alimento) ──
// Formato: { 'aceite de oliva': { kcal: 884, proteinas: 0, carbohidratos: 0, grasas: 100 } }
export const getNutricion = () => {
  try { return JSON.parse(localStorage.getItem(KEYS.NUTRICION)) || {} }
  catch { return {} }
}
export const setNutricionAlimento = (nombre, datos) => {
  const actual = getNutricion()
  actual[nombre.toLowerCase().trim()] = datos
  localStorage.setItem(KEYS.NUTRICION, JSON.stringify(actual))
}

// ── Helpers ──
export const getFechaHoy = () => new Date().toISOString().split('T')[0]

export const getDiaSemanaNombre = () => {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  return dias[new Date().getDay()]
}

export const getFechaLegible = () => {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

export const limpiarTodo = () => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
