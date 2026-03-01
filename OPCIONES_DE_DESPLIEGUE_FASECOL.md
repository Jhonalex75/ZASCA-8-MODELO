# Opciones de Despliegue — Carrusel ZASCA para FASECOL

## Resumen Ejecutivo

El sistema ZASCA dispone de **tres capas de código** que cumplen la misma lógica funcional:

| Capa | Lenguaje | Ubicación | Validación |
|------|----------|-----------|------------|
| **Digital Twin (React)** | TypeScript / React | `simulator-app/` | ✅ Probado en navegador |
| **WinCC Scripts** | JavaScript (WinCC Unified) | `wincc-scripts/` | ✅ Listos para integración |
| **PLC Bridge** | Node.js + Socket.IO | `plc-bridge/` | ✅ Probado modo Live |

El cliente FASECOL puede elegir **una o más** de las siguientes opciones para poner en producción el carrusel.

---

## Arquitectura General

```
┌──────────────────────────────────────────────────────────────────┐
│                         PLC Siemens S7-1200                      │
│              (SCL — lógica de control, encoder, VFD)             │
│                            ▲      ▲      ▲                       │
│                            │      │      │                       │
└────────────────────────────┼──────┼──────┼───────────────────────┘
                             │      │      │
          ┌──────────────────┤      │      ├──────────────────┐
          │                  │      │      │                  │
  ┌───────▼───────┐  ┌──────▼──────▼─┐  ┌▼──────────────────▼┐
  │  OPCIÓN A     │  │   OPCIÓN B    │  │     OPCIÓN C        │
  │  OPC UA       │  │   WinCC       │  │     Node.js Tablet  │
  │  (plc-bridge) │  │   (Nativo)    │  │     (plc-bridge)    │
  └───────┬───────┘  └──────┬────────┘  └─────────┬──────────┘
          │                  │                      │
  ┌───────▼───────┐  ┌──────▼────────┐  ┌─────────▼──────────┐
  │ React App /   │  │ Panel KTP700  │  │  Tablet Industrial  │
  │ Tablet Web    │  │ o TP1200      │  │  (Android/Windows)  │
  └───────────────┘  └───────────────┘  └────────────────────┘
```

---

## Pestaña BRIDGE — ¿Qué es?

La pestaña **BRIDGE** del simulador (`PlcBridgePanel.tsx`) es un **panel de operación que se comunica con el PLC real o simulado** a través del servidor `plc-bridge`.

### Funcionalidad

| Sección | Descripción |
|---------|-------------|
| **Conexión** | Conecta vía WebSocket a `localhost:3001` (plc-bridge) |
| **Estado PLC** | LEDs de LISTO/MOTOR/FRENO/AUTO/FALLA + telemetría |
| **Comandos** | MOVER bandeja, START, STOP, E-STOP |
| **Picking** | Selección de arneses → SACAR → RETIRAR (idéntico a OPER) |
| **Log** | Registro de comunicación en tiempo real |

### Flujo de datos

1. **UI React** → `PlcWebSocketService.ts` → Socket.IO → `server.js` → `plcConnection.js` / `mockPlc.js` → **PLC Real**
2. **PLC Real** → `readStatus()` cada 100ms → `plc-state` WebSocket → React Store → **UI actualizada**

### Cuándo usarlo

- Para validación en campo con PLC real conectado
- Para demostración al cliente con Mock (sin PLC)
- Base funcional para Opción A y Opción C

---

## Pestaña ANIM — ¿Qué es?

La pestaña **ANIM** del simulador (`CarouselSchematicView.tsx`) es una **representación esquemática 2D del carrusel** que muestra las bandejas moviéndose verticalmente.

### Funcionalidad

| Característica | Descripción |
|----------------|-------------|
| **Vista lateral** | 7 bandejas visibles, scroll suave basado en encoder |
| **Pick zone** | Indicadores ▶◀ muestran la bandeja en posición de picking |
| **Inventario visual** | Círculos de color por cada tipo de arnés |
| **Controles** | Selector de bandeja + MOVER + SACAR + RETIRAR |
| **Telemetría** | Posición actual, target, ángulo encoder, estado motor |

### Cuándo usarlo

- **Es el equivalente directo al script `Animate_Carousel.js` de WinCC**
- Permite verificar la lógica visual antes de implementar en el panel HMI real
- Útil como referencia para el programador de WinCC

---

## Opción A — OPC UA / plc-bridge (React → PLC)

### Descripción

Usar el servidor **plc-bridge** como middleware entre una interfaz web (React) y el PLC Siemens. La comunicación puede ser vía **nodes7** (protocolo S7) o mediante un servidor **OPC UA** futuro.

### Componentes existentes

| Componente | Estado | Archivo |
|-----------|--------|---------|
| Servidor Express + Socket.IO | ✅ Completo | `plc-bridge/server.js` |
| Driver PLC S7 (nodes7) | ✅ Completo | `plc-bridge/plcConnection.js` |
| Mock PLC (simulador) | ✅ Completo | `plc-bridge/mockPlc.js` |
| Cliente WebSocket React | ✅ Completo | `simulator-app/src/services/PlcWebSocketService.ts` |
| Panel de operación | ✅ Completo | `simulator-app/src/components/HMI/PlcBridgePanel.tsx` |

### API REST disponible

```
GET    /api/status             → Estado completo del PLC
GET    /api/inventory          → Inventario (20 bandejas)
GET    /api/info               → Info del servidor
POST   /api/select-tray        → Seleccionar bandeja {trayId: 0-19}
POST   /api/start              → Iniciar modo automático
POST   /api/stop               → Parada normal
POST   /api/estop              → Parada de emergencia
POST   /api/estop/reset        → Resetear E-Stop
POST   /api/search             → Buscar referencia {reference}
POST   /api/inventory/update   → Actualizar bandeja
```

### WebSocket (Socket.IO)

```
Eventos del cliente → servidor:
  'select-tray' { trayId }
  'start'
  'stop'
  'estop'

Eventos del servidor → cliente (cada 100ms):
  'plc-state' { ST_EncoderPos, ST_VFD_Speed, ST_MotorRunning, ... }
  'bridge-info' { mode, pollMs }
  'command-ack' { command, ok, error? }
```

### Cómo desplegar

1. Instalar Node.js en el PC de planta o servidor industrial
2. Configurar `.env` con la IP del PLC: `MODE=live`, `PLC_IP=192.168.0.X`
3. Ejecutar `npm start` en `plc-bridge/`
4. Abrir la interfaz React desde cualquier navegador en la red

### Ventajas

- ✅ Interfaz moderna y rica visualmente (3D + 2D + picking)
- ✅ Acceso desde cualquier dispositivo con navegador
- ✅ No requiere licencia WinCC
- ✅ Logging y diagnóstico avanzado

### Desventajas

- ⚠️ Requiere PC/servidor con Node.js en planta
- ⚠️ Depende de red Ethernet estable
- ⚠️ No es un HMI certificado industrialmente

### Compatibilidad actual: ✅ LISTA

La interfaz ya está funcional. Solo requiere configurar `MODE=live` y la IP del PLC.

---

## Opción B — WinCC Nativo (Panel Siemens)

### Descripción

Usar los **scripts WinCC generados** directamente en un panel Siemens KTP700 Basic o TP1200 Comfort. El código JavaScript se pega directamente en TIA Portal.

### Componentes existentes

| Pantalla | Scripts | Estado |
|----------|---------|--------|
| **Scr_Inicio** | `Update_Status_Text.js`, `Btn_InicioCiclo_Press.js`, `Animate_Tray_Position.js` | ✅ |
| **Scr_Operacion** | `Script_Mover.js`, `Update_Op_Status.js`, `Script_Sacar.js`, `Script_Retirar.js` | ✅ |
| **Scr_Inventario** | `Script_BuscarRef.js`, `Update_Inventory_Colors.js` | ✅ |
| **Scr_Diagnostico** | `Check_Access_Level.js` | ✅ |
| **Template Global** | `Nav_Screens.js`, `EStop_Global.js` | ✅ |
| **Scr_Animacion** | `Animate_Carousel.js` | ✅ |
| **Tags HMI** | `Tags_Import.csv` | ✅ |

### Equivalencia funcional React → WinCC

| React Component | → WinCC Script |
|----------------|----------------|
| `OperationPanel.tsx` handleMove | → `Script_Mover.js` |
| `OperationPanel.tsx` handleExtract | → `Script_Sacar.js` |
| `OperationPanel.tsx` handleRemove | → `Script_Retirar.js` |
| `OperationPanel.tsx` estado | → `Update_Op_Status.js` |
| `CarouselSchematicView.tsx` | → `Animate_Carousel.js` |
| `HmiLayout.tsx` NavBtns | → `Nav_Screens.js` |
| E-Stop toggle | → `EStop_Global.js` |
| Inventario visual | → `Update_Inventory_Colors.js` |

### Cómo desplegar

1. Abrir TIA Portal con el proyecto del PLC
2. Importar `Tags_Import.csv` en las HMI Tags
3. Crear las pantallas según la estructura del README
4. Pegar cada script `.js` en el evento correspondiente (Press, Cíclico, etc.)
5. Compilar y descargar al panel HMI

### Ventajas

- ✅ Solución industrial certificada
- ✅ Integración directa con PLC — sin middleware
- ✅ Sin dependencia de PC o red adicional
- ✅ Interfaz robusta para entorno de planta

### Desventajas

- ⚠️ Requiere licencia WinCC
- ⚠️ Pantalla limitada (KTP700 = 800×480 px)
- ⚠️ Sin visualización 3D ni gráficas avanzadas

### Compatibilidad actual: ✅ LISTA

Todos los scripts están generados y documentados con el evento `trigger` correspondiente. Falta integrarlos en TIA Portal.

> **Nota importante**: El script `Script_Retirar.js` ya incluye el fix del loop (reset de `ST_AutoMode`). Los scripts WinCC son especulares a los componentes React.

---

## Opción C — Librería Node.js para Tablet Industrial

### Descripción

Reutilizar el **plc-bridge** existente como backend y crear una **aplicación móvil liviana** para tablet industrial (Android o Windows). La tablet se comunica con el plc-bridge por WiFi/Ethernet.

### Componentes existentes REUTILIZABLES

| Componente | Ubicación | Reutilizable |
|-----------|-----------|:------------:|
| REST API completa | `plc-bridge/server.js` | ✅ 100% |
| WebSocket streaming | `plc-bridge/server.js` | ✅ 100% |
| Driver PLC S7 | `plc-bridge/plcConnection.js` | ✅ 100% |
| Mock para pruebas | `plc-bridge/mockPlc.js` | ✅ 100% |
| Lógica de picking React | `PlcBridgePanel.tsx` | 🔄 Adaptar UI |

### Arquitectura propuesta

```
┌────────────────────┐     WiFi/Ethernet      ┌──────────────────────┐
│  Tablet Industrial │  ◄─── Socket.IO ───►   │   plc-bridge         │
│  (PWA o App nativa)│                         │   (Node.js en PC)    │
│                    │  ◄─── REST API ────►    │   ↕                  │
│  - WebView React   │                         │   PLC S7-1200        │
│  - o React Native  │                         │                      │
└────────────────────┘                         └──────────────────────┘
```

### Qué falta construir

| Componente | Esfuerzo | Descripción |
|-----------|:--------:|-------------|
| **PWA (Progressive Web App)** | ✅ **LISTO** | La app React ya está configurada como PWA con `manifest.json` y service worker. Instalable en Android/Windows. |
| **Biblioteca de Control PLC** | ✅ **LISTO** | Implementada en `simulator-app/src/services/PlcWebSocketService.ts`. |
| **SCL Migration Code** | ✅ **LISTO** | Bloques FB y DB generados para TIA Portal (S7-1200). |

### Implementación mínima (PWA)

La ruta más rápida es convertir la app React actual en una **PWA**. Solo requiere:

1. Agregar `manifest.json` al `public/` del simulador
2. Agregar un service worker básico para cacheo offline
3. Acceder desde la tablet vía `http://<IP-PC>:5173` (dev) o `http://<IP-PC>:3000` (build)

### Ventajas

- ✅ Interfaz moderna y portable
- ✅ Acceso desde cualquier tablet con navegador
- ✅ Backend ya existe al 100%
- ✅ Se puede usar sin cambios como PWA

### Desventajas

- ⚠️ Requiere PC con Node.js como backend (plc-bridge)
- ⚠️ Depende de la red WiFi industrial
- ⚠️ Para app nativa requiere desarrollo adicional

### Compatibilidad actual: ✅ 100% LISTA

El backend (`plc-bridge`) está completo. La interfaz React está configurada como PWA y lista para ser instalada en tablets industriales, funcionando incluso offline (cacheo de assets).

---

## Comparativa de Opciones

| Criterio | A: OPC UA / Bridge | B: WinCC Nativo | C: Tablet Node.js |
|----------|:------------------:|:---------------:|:------------------:|
| **Costo de licencia** | Bajo (Node.js gratis) | Alto (WinCC) | Bajo (Node.js gratis) |
| **Robustez industrial** | Media | **Alta** | Media |
| **Facilidad de despliegue** | Media | **Alta** | Media-Baja |
| **Interfaz visual** | **Rica (3D)** | Básica | **Rica (3D/2D)** |
| **Código listo** | ✅ 100% | ✅ 100% | 🔄 90% |
| **Acceso multiusuario** | ✅ Sí | ❌ No | ✅ Sí |
| **Requiere PC adicional** | Sí | **No** | Sí |
| **Funciona offline** | Con mock | **Sí** | Con PWA |
| **Mantenimiento** | Node.js updates | TIA Portal | Node.js updates |

---

## Recomendación

> **Para producción inmediata**: Usar **Opción B (WinCC)** como interfaz principal de operación. Es la más robusta y no requiere infraestructura adicional.
>
> **Como complemento**: Usar **Opción A (plc-bridge)** en un PC de supervisión para monitoreo avanzado, diagnóstico y logging. Funciona en paralelo sin interferir con el panel WinCC.
>
> **Futuro**: Si FASECOL requiere acceso móvil o multiusuario, la **Opción C (Tablet PWA)** se construye sobre Opción A con esfuerzo mínimo.

Las tres opciones son **mutuamente compatibles** y pueden coexistir simultáneamente porque:
- Las Opciones A y C leen/escriben el PLC a través de `plc-bridge` (protocolo S7 o futuro OPC UA)
- La Opción B se comunica directamente con el PLC vía conexión interna HMI↔PLC
- Ambos caminos son independientes y no interfieren entre sí

---

## Archivos Clave por Opción

### Opción A — plc-bridge

```
plc-bridge/
├── server.js              ← Servidor Express + Socket.IO
├── plcConnection.js       ← Driver S7 (nodes7)
├── mockPlc.js             ← Simulador offline
├── package.json
└── .env                   ← Configuración (MODE, PLC_IP, etc.)

simulator-app/src/
├── services/PlcWebSocketService.ts  ← Cliente WebSocket
└── components/HMI/PlcBridgePanel.tsx ← Panel de operación
```

### Opción B — WinCC

```
wincc-scripts/
├── 01_Scr_Inicio/         ← 3 scripts
├── 02_Scr_Operacion/      ← 4 scripts
├── 03_Scr_Inventario/     ← 2 scripts
├── 04_Scr_Diagnostico/    ← 1 script
├── 05_Template/           ← 2 scripts globales
├── 06_Scr_Animacion/      ← 1 script (Animate_Carousel.js)
├── Tags_Import.csv        ← Tags para importar en HMI
└── README.md              ← Instrucciones de integración
```

### Opción C — Tablet (reutiliza A)

```
Requiere de Opción A (plc-bridge/) +
simulator-app/
├── public/manifest.json   ← [NUEVO] Para PWA
├── src/sw.js              ← [NUEVO] Service Worker
└── vite.config.ts         ← Modificar para PWA plugin
```

---

*Documento generado: 2026-02-21*
*Proyecto: ZASCA — Carrusel Paternoster para FASECOL*
