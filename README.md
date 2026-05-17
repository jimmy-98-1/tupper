# 🥡 Tupper

Tu dieta semanal, al instante. Sin buscar, sin liar.

## Instalación y uso local

```bash
# 1. Instalar dependencias
npm install

# 2. Arrancar en local
npm run dev
```

Abre `http://localhost:5173/tupper/` en el navegador.

## Cómo funciona

1. **Entra con tu nombre** (se guarda en localStorage)
2. Ve a **Perfil** y añade tu API Key de Anthropic (la consigues en [console.anthropic.com](https://console.anthropic.com))
3. Sube el **PDF de tu dieta** — la IA lo lee automáticamente
4. ¡Listo! Cada día verás tus tomas en la pantalla **Hoy**

## Deploy en GitHub Pages

```bash
# 1. Cambia "base" en vite.config.js con el nombre de tu repo
#    base: '/nombre-de-tu-repo/'

# 2. Despliega
npm run deploy
```

## Estructura

```
src/
├── components/
│   ├── BottomNav.jsx     # Navegación inferior
│   └── TomaCard.jsx      # Tarjeta de cada toma
├── pages/
│   ├── Hoy.jsx           # Página principal (menú del día)
│   ├── Compra.jsx        # Lista de la compra
│   └── Perfil.jsx        # Subir PDF + configuración
├── utils/
│   └── storage.js        # Todo el localStorage en un sitio
├── App.jsx               # Router + login
└── index.css             # Variables y animaciones
```

## Notas

- Todo se guarda en `localStorage` del navegador (nada en servidores)
- La API Key de Anthropic es necesaria solo para leer el PDF (no se comparte)
- Para actualizar la dieta, vuelve a Perfil y sube el nuevo PDF
