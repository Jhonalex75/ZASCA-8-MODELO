# ZASCA Simulator App

**Gemelo Digital + HMI** del carrusel paternoster ZASCA. Aplicación React con visualización 3D, interfaz de operación de 6 pestañas, y capacidad PWA para tablets industriales.

```
┌─────────────────────────────────────────────────────┐
│  Simulator App (React + Three.js + Zustand)         │
│  ├─ Gemelo Digital 3D (Three.js / React Three Fiber)│
│  ├─ HMI con 6 pestañas de operación                 │
│  ├─ Simulación PLC interna (Processor.ts)           │
│  ├─ Cliente WebSocket para plc-bridge               │
│  └─ PWA instalable en tablets industriales          │
└─────────────────────────────────────────────────────┘
```

## Instalación

```bash
cd simulator-app
npm install
```

## Ejecución

### Modo Desarrollo (local)
```bash
npm run dev
# → http://localhost:5173
```

### Modo Desarrollo (accesible desde tablet/red)
```bash
npm run dev
# → http://0.0.0.0:5173  (accesible desde cualquier dispositivo en la red)
# En la tablet: http://<IP-de-este-PC>:5173
```

> `vite.config.ts` ya tiene `host: '0.0.0.0'` configurado.

### Build de Producción (con PWA)
```bash
npm run build
# Genera: dist/
#   ├── index.html
#   ├── assets/     (JS, CSS)
#   ├── sw.js       (Service Worker)
#   ├── workbox-*.js
#   ├── manifest.json
#   └── icons/

# Servir la build:
npx serve dist -l 3000
# En la tablet: http://<IP-PC>:3000  → "Instalar ZASCA"
```

## Pestañas del HMI

La interfaz tiene **6 pestañas**, cada una con su componente React:

| Tab | Componente | Descripción |
|-----|-----------|-------------|
| **OVERVIEW** | `OverviewPanel.tsx` | Estado general: LEDs, encoder, velocidad |
| **OPER** | `OperationPanel.tsx` | Control de picking: selección, mover, sacar, retirar |
| **ALARMS** | `AlarmsPanel.tsx` | Historial de alarmas y fallas |
| **MAINT** | `MaintenancePanel.tsx` | Diagnóstico, calibración, acceso nivel 2 |
| **BRIDGE** | `PlcBridgePanel.tsx` | Control vía WebSocket directo al PLC (plc-bridge) |
| **ANIM** | `CarouselSchematicView.tsx` | Animación 2D esquemática del carrusel |

### Diferencia entre OPER y BRIDGE

- **OPER** usa el simulador interno (`Processor.ts`) — no requiere plc-bridge
- **BRIDGE** se conecta al servidor `plc-bridge` vía WebSocket — opera el PLC real o mock

### Diferencia entre 3D y ANIM

- **3D** (Scene3D.tsx) es la visualización Three.js completa del carrusel
- **ANIM** (CarouselSchematicView.tsx) es una vista lateral 2D simplificada, equivalente a `Animate_Carousel.js` de WinCC

## Estructura del Código

```
src/
├── App.tsx                          ← Punto de entrada
├── main.tsx                         ← Montaje React
│
├── components/
│   ├── 3D/                          ← Visualización Three.js
│   │   ├── Scene3D.tsx              ← Escena principal 3D
│   │   ├── CarouselModel.tsx        ← Modelo del carrusel
│   │   ├── TrayModel.tsx            ← Modelo de bandeja
│   │   └── ...
│   └── HMI/                         ← Interfaz de operación
│       ├── HmiLayout.tsx            ← Layout con tabs de navegación
│       ├── OverviewPanel.tsx        ← Tab OVERVIEW
│       ├── OperationPanel.tsx       ← Tab OPER (picking local)
│       ├── PlcBridgePanel.tsx       ← Tab BRIDGE (picking vía WebSocket)
│       ├── CarouselSchematicView.tsx ← Tab ANIM (vista 2D)
│       ├── MaintenancePanel.tsx     ← Tab MAINT
│       └── ...
│
├── services/
│   └── PlcWebSocketService.ts       ← Cliente Socket.IO para plc-bridge
│
├── store/
│   └── usePlcStore.ts               ← Estado global Zustand (tags PLC)
│
└── simulation/
    ├── PLC/
    │   ├── Processor.ts             ← Máquina de estados PLC simulada
    │   └── ProcessorConfig.ts
    ├── Physics/
    │   ├── MotionController.ts      ← Cinemática del carrusel
    │   └── ForceModel.ts
    ├── CalibrationConfig.ts         ← Parámetros de calibración
    └── SimulationLoop.tsx           ← Loop de simulación (60fps)
```

## PWA — Progressive Web App

La app está configurada como PWA, lo que permite:

- ✅ Instalación como app nativa en tablets (Android/Windows)
- ✅ Pantalla completa (sin barra del navegador)
- ✅ Orientación landscape fija
- ✅ Cache offline de assets estáticos
- ✅ Cache inteligente (NetworkFirst) para API del plc-bridge

### Archivos PWA

| Archivo | Función |
|---------|---------|
| `public/manifest.json` | Nombre, icono, orientación, colores |
| `public/icons/icon.svg` | Icono de la app (carrusel esquemático) |
| `vite.config.ts` | Plugin `vite-plugin-pwa` con Workbox |
| `index.html` | Meta tags PWA + Apple mobile web app |

### Instalar en Tablet

1. Hacer build: `npm run build`
2. Servir `dist/` desde un servidor (nginx, serve, IIS)
3. En la tablet, abrir Chrome/Edge → navegar a la URL
4. Tocar "Instalar ZASCA" o menú → "Agregar a pantalla de inicio"
5. La app se abre en fullscreen, landscape, sin barra del navegador

## Conexión con plc-bridge

Para conectar esta app al PLC real a través del plc-bridge:

1. Iniciar el plc-bridge: `cd ../plc-bridge && node server.js`
2. En la app, ir a la pestaña **BRIDGE**
3. Presionar **CONECTAR** → se conecta vía WebSocket a `localhost:3001`

Para cambiar la IP del servidor plc-bridge (si corre en otra máquina):
```typescript
// Archivo: src/services/PlcWebSocketService.ts
// Cambiar la URL de conexión:
this.socket = io('http://192.168.0.X:3001');
```

## Tecnologías

| Paquete | Versión | Uso |
|---------|---------|-----|
| React | 19 | Framework UI |
| Three.js | 0.182 | Motor 3D |
| React Three Fiber | 9.5 | Bridge React ↔ Three.js |
| Zustand | 5.0 | Estado global |
| Socket.IO Client | 4.8 | WebSocket al plc-bridge |
| TailwindCSS | 4.1 | Estilos |
| Vite | 7.2 | Build tool |
| vite-plugin-pwa | 1.2 | Service worker + manifest |

## Notas Importantes

- **Fix del loop (Feb 2026):** Los handlers `handleMove` y `handleRemove` en `OperationPanel.tsx`, `PlcBridgePanel.tsx`, y `CarouselSchematicView.tsx` resetean `M0_2_PosReached`, `M0_1_Moving`, y `M0_0_AutoMode` entre ciclos. Sin estos resets, el segundo ciclo de picking genera un bucle infinito.
- **Simulación dual:** La app puede funcionar en modo simulación (sin plc-bridge) usando el `Processor.ts` interno, o en modo bridge conectándose al PLC real.
- **Multi-pantalla:** Las pestañas OPER y BRIDGE son independientes — no interfieren entre sí.
