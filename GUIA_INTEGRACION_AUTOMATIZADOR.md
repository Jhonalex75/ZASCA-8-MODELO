# Guía de Integración para Empresa de Automatización
## Sistema ZASCA — Carrusel Paternoster para FASECOL  
**Versión 2.0 | Febrero 2026**

---

## 1. Introducción

Este documento está dirigido al **integrador de automatización** encargado de poner en producción el sistema de control del carrusel paternoster ZASCA. El proyecto incluye un **gemelo digital completo** (React + Three.js), un **puente de comunicación** con el PLC (Node.js), y **scripts nativos para WinCC**.

El código fuente implementa tres capas paralelas que cumplen la misma lógica funcional, permitiendo elegir una o varias opciones de despliegue según las necesidades del proyecto.

### Alcance

| Opción | Tecnología | Uso Principal |
|--------|-----------|---------------|
| **A** — Bridge Web | Node.js + React | Supervisión desde PC o navegador |
| **B** — WinCC Nativo | JavaScript (WinCC Unified) | Panel HMI Siemens en campo |
| **C** — Tablet PWA | React (Progressive Web App) | Tablet industrial portátil |

### Documentación Complementaria

Cada opción tiene su propio README autónomo dentro de su carpeta. Consulte estos documentos para instrucciones detalladas:

| Documento | Ruta completa | Descripción |
|-----------|---------------|-------------|
| **README Opción A** | `plc-bridge/README.md` | API REST, WebSocket, mapa de tags, diagnóstico |
| **README Opción B** | `wincc-scripts/README.md` | Importar tags, crear pantallas, vincular scripts |
| **README Opción C** | `simulator-app/README.md` | Pestañas HMI, PWA, build, conexión plc-bridge |
| **Comparativa de Opciones** | `OPCIONES_DE_DESPLIEGUE_FASECOL.md` | Costos, ventajas, estado de cada opción |
| **Esta guía** | `GUIA_INTEGRACION_AUTOMATIZADOR.md` | Referencia técnica completa (este documento) |

---

## 2. Directorio Raíz del Entregable

Toda la información del proyecto se encuentra dentro de la carpeta raíz:

```
📁 8. MODELO/
```

El integrador debe copiar esta carpeta completa a su equipo de trabajo. Todas las rutas en este documento son **relativas a esta carpeta raíz**.

### 2.1. Estructura Completa del Proyecto

```
8. MODELO/                                  ← DIRECTORIO RAÍZ
│
├── 📄 GUIA_INTEGRACION_AUTOMATIZADOR.md    ← ESTE DOCUMENTO
├── 📄 OPCIONES_DE_DESPLIEGUE_FASECOL.md    ← Comparativa de opciones A/B/C
│
│   ┌─────────────────────────────────────────────────────────────┐
│   │  OPCIÓN A: PLC Bridge (Node.js — Backend)                  │
│   └─────────────────────────────────────────────────────────────┘
├── 📁 plc-bridge/                          ← Servidor puente PLC ↔ Web
│   ├── 📄 README.md                        ← ★ Instrucciones del bridge
│   ├── 📄 server.js                        ← API REST + WebSocket + Inventario
│   ├── 📄 plcConnection.js                 ← Conexión S7comm al PLC
│   ├── 📄 mockPlc.js                       ← Simulador de PLC (modo mock)
│   ├── 📄 inventoryLogger.js               ← ★ NUEVO: Logger de movimientos de inventario
│   ├── 📄 reportGenerator.js               ← ★ NUEVO: Generador de reportes Excel (.xlsx)
│   ├── 📄 .env                             ← Configuración (IP, modo, puerto)
│   ├── 📄 package.json                     ← Dependencias (nodes7, xlsx, etc.)
│   └── 📁 data/                            ← ★ NUEVO: Datos persistentes (auto-creado)
│       └── 📄 inventory_log.json           ← Log de movimientos (JSON)
│
│   ┌─────────────────────────────────────────────────────────────┐
│   │  OPCIÓN C: Aplicación React (Gemelo Digital + PWA)         │
│   └─────────────────────────────────────────────────────────────┘
├── 📁 simulator-app/                       ← Aplicación React + PWA
│   ├── 📄 README.md                        ← ★ Instrucciones de la app React
│   ├── 📄 package.json                     ← Dependencias npm
│   ├── 📄 vite.config.ts                   ← Build + PWA plugin + host 0.0.0.0
│   ├── 📄 index.html                       ← HTML con meta tags PWA y Apple
│   ├── 📁 public/
│   │   ├── 📄 manifest.json               ← Config PWA (nombre, icono, orientación)
│   │   └── 📁 icons/
│   │       └── 📄 icon.svg                 ← Icono de la app (carrusel esquemático)
│   └── 📁 src/
│       ├── 📄 App.tsx                      ← Punto de entrada React
│       ├── 📄 main.tsx                     ← Montaje React
│       ├── 📁 components/
│       │   ├── 📁 3D/                      ← Visualización Three.js
│       │   │   ├── 📄 Scene3D.tsx          ← Escena 3D principal
│       │   │   ├── 📄 CarouselModel.tsx    ← Modelo 3D del carrusel
│       │   │   ├── 📄 TrayModel.tsx        ← Modelo 3D de bandeja
│       │   │   └── ...
│       │   └── 📁 HMI/                     ← Interfaz de operación (6 tabs)
│       │       ├── 📄 HmiLayout.tsx        ← Layout principal + navegación tabs
│       │       ├── 📄 OverviewPanel.tsx    ← Tab OVERVIEW: Estado general
│       │       ├── 📄 OperationPanel.tsx   ← Tab OPER: Control de picking (local)
│       │       ├── 📄 PlcBridgePanel.tsx   ← Tab BRIDGE: Picking vía WebSocket
│       │       ├── 📄 CarouselSchematicView.tsx ← Tab ANIM: Vista 2D animada
│       │       ├── 📄 MaintenancePanel.tsx ← Tab MAINT: Diagnóstico
│       │       └── ...
│       ├── 📁 services/
│       │   └── 📄 PlcWebSocketService.ts   ← Cliente WebSocket (Socket.IO)
│       ├── 📁 store/
│       │   └── 📄 usePlcStore.ts           ← Estado global Zustand (tags PLC)
│       └── 📁 simulation/
│           ├── 📁 PLC/
│           │   ├── 📄 Processor.ts         ← Máquina de estados PLC simulada
│           │   └── 📄 ProcessorConfig.ts
│           ├── 📁 Physics/
│           │   ├── 📄 MotionController.ts  ← Cinemática del carrusel
│           │   └── 📄 ForceModel.ts
│           └── 📄 CalibrationConfig.ts     ← Parámetros de calibración
│
│   ┌─────────────────────────────────────────────────────────────┐
│   │  OPCIÓN A: Servidor de comunicación PLC ↔ Web              │
│   └─────────────────────────────────────────────────────────────┘
├── 📁 plc-bridge/                          ← Middleware Node.js
│   ├── 📄 README.md                        ← ★ Instrucciones del bridge
│   ├── 📄 server.js                        ← Express REST API + Socket.IO
│   ├── 📄 plcConnection.js                 ← Driver nodes7 + mapa de tags
│   ├── 📄 mockPlc.js                       ← Simulador PLC (modo sin hardware)
│   ├── 📄 test-connection.js               ← Script diagnóstico de conexión
│   ├── 📄 .env                             ← Config: IP, modo, puerto
│   └── 📄 package.json                     ← Dependencias npm
│
│   ┌─────────────────────────────────────────────────────────────┐
│   │  OPCIÓN B: Scripts nativos para WinCC                      │
│   └─────────────────────────────────────────────────────────────┘
└── 📁 wincc-scripts/                       ← Scripts JavaScript para WinCC
    ├── 📄 README.md                        ← ★ Instrucciones para TIA Portal
    ├── 📄 Tags_Import.csv                  ← 187 tags para importar en HMI (Act. Feb 2026)
    ├── 📁 01_Scr_Inicio/                   ← Pantalla de inicio
    │   ├── 📄 Btn_InicioCiclo_Press.js     ← Btn → Press
    │   ├── 📄 Update_Status_Text.js        ← Pantalla → Cíclico 500ms
    │   └── 📄 Animate_Tray_Position.js     ← Rect → Cíclico 200ms
    ├── 📁 02_Scr_Operacion/                ← Pantalla de operación
    │   ├── 📄 Script_Mover.js              ← Btn_Mover → Press
    │   ├── 📄 Script_Sacar.js              ← Btn_Sacar → Press
    │   ├── 📄 Script_Retirar.js            ← Btn_Retirar → Press
    │   └── 📄 Update_Op_Status.js          ← Pantalla → Cíclico 200ms
    ├── 📁 03_Scr_Inventario/               ← Pantalla de inventario
    │   ├── 📄 Script_BuscarRef.js          ← Btn_Buscar → Press
    │   └── 📄 Update_Inventory_Colors.js   ← Pantalla → Cíclico 2000ms
    ├── 📁 04_Scr_Diagnostico/              ← Diagnóstico (restringido)
    │   └── 📄 Check_Access_Level.js        ← Pantalla → OnLoaded
    ├── 📁 05_Template/                     ← Scripts globales
    │   ├── 📄 Nav_Screens.js               ← Botones navegación → Press
    │   └── 📄 EStop_Global.js              ← Btn_EStop → Press / Cíclico
    └── 📁 06_Scr_Animacion/                ← Animación 2D carrusel
        └── 📄 Animate_Carousel.js          ← Pantalla → Cíclico 100ms
```

### 2.2. Índice Rápido — ¿Qué Archivo Busco?

| Necesito... | Abrir archivo | Ruta desde raíz |
|------------|---------------|------------------|
| **Configurar la IP del PLC** | `.env` | `plc-bridge/.env` |
| **Cambiar las direcciones de los DB** | `plcConnection.js` | `plc-bridge/plcConnection.js` (líneas 35-72) |
| **Ver la lógica del mock PLC** | `mockPlc.js` | `plc-bridge/mockPlc.js` |
| **Ver los endpoints REST** | `server.js` | `plc-bridge/server.js` |
| **Probar la conexión al PLC** | `test-connection.js` | `plc-bridge/test-connection.js` |
| **Importar tags en WinCC** | `Tags_Import.csv` | `wincc-scripts/Tags_Import.csv` (187 tags) |
| **Pegar un script en WinCC** | Script `.js` | `wincc-scripts/0X_Scr_*/archivo.js` |
| **Instrucciones de WinCC** | `README.md` | `wincc-scripts/README.md` |
| **Cambiar la URL del WebSocket** | `PlcWebSocketService.ts` | `simulator-app/src/services/PlcWebSocketService.ts` |
| **Configurar la PWA** | `manifest.json` | `simulator-app/public/manifest.json` |
| **Cambiar el icono de la app** | `icon.svg` | `simulator-app/public/icons/icon.svg` |
| **Configurar Vite + PWA** | `vite.config.ts` | `simulator-app/vite.config.ts` |
| **Ver la lógica de picking React** | `OperationPanel.tsx` | `simulator-app/src/components/HMI/OperationPanel.tsx` |
| **Ver la lógica de bridge React** | `PlcBridgePanel.tsx` | `simulator-app/src/components/HMI/PlcBridgePanel.tsx` |
| **Ver la animación 2D React** | `CarouselSchematicView.tsx` | `simulator-app/src/components/HMI/CarouselSchematicView.tsx` |
| **Ver la máquina de estados PLC** | `Processor.ts` | `simulator-app/src/simulation/PLC/Processor.ts` |
| **Ver calibración del carrusel** | `CalibrationConfig.ts` | `simulator-app/src/simulation/CalibrationConfig.ts` |
| **Ver estado global (Zustand)** | `usePlcStore.ts` | `simulator-app/src/store/usePlcStore.ts` |

---

## 3. Mapa de Variables del PLC

> **📂 Archivos fuente de esta información:**
> - **Mapa de tags nodes7:** `plc-bridge/plcConnection.js` (líneas 35-72)
> - **Tags para WinCC (CSV):** `wincc-scripts/Tags_Import.csv` (187 tags)
> - **Simulador de tags:** `plc-bridge/mockPlc.js`

El PLC Siemens S7-1200 utiliza **tres bloques de datos (DB)** organizados por función:

### 3.1. DB1 — Comandos (HMI → PLC)

> 📂 Definidos en `plc-bridge/plcConnection.js` líneas 36-43

Estos tags se escriben desde la interfaz hacia el PLC.

| Tag | Tipo | Dirección PLC | Dirección nodes7 | Descripción |
|-----|------|--------------|-------------------|-------------|
| `CMD_TargetTray` | INT | DB1.DBW0 | `DB1,INT0` | Bandeja objetivo (0-19) |
| `CMD_Start` | BOOL | DB1.DBX4.0 | `DB1,X2.0` | Arranque (pulso 200ms) |
| `CMD_Stop` | BOOL | DB1.DBX4.1 | `DB1,X2.1` | Parada normal |
| `CMD_EStop` | BOOL | DB1.DBX4.2 | `DB1,X2.2` | Parada de emergencia software |
| `CMD_Reset` | BOOL | DB1.DBX4.3 | — | Reset de fallas (pulso) |
| `CMD_AutoMode` | BOOL | DB1.DBX4.4 | — | Habilitar modo automático |
| `CMD_InventoryDecrement` | BOOL | DB1.DBX4.5 | — | Descontar inventario (pulso 200ms) |
| `CMD_SearchRef` | STRING | DB1.DBB4 (len 20) | `DB1,S4.20` | Texto de búsqueda de referencia |
| `CMD_DoSearch` | BOOL | DB1.DBX26.0 | `DB1,X26.0` | Ejecutar búsqueda |

### 3.2. DB2 — Estado (PLC → HMI)

> 📂 Definidos en `plc-bridge/plcConnection.js` líneas 44-54

Estos tags se leen desde el PLC hacia la interfaz.

| Tag | Tipo | Dirección PLC | Ciclo | Descripción |
|-----|------|--------------|-------|-------------|
| `ST_EncoderPos` | REAL | DB2.DBD0 | 100ms | Posición encoder en grados (0-360°) |
| `ST_VFD_Speed` | REAL | DB2.DBD4 | 100ms | Velocidad variador (%) |
| `ST_MotorRunning` | BOOL | DB2.DBX8.0 | 100ms | Motor principal encendido |
| `ST_BrakeReleased` | BOOL | DB2.DBX8.1 | 500ms | Freno mecánico liberado |
| `ST_SystemReady` | BOOL | DB2.DBX8.2 | 500ms | Sistema listo |
| `ST_SystemFault` | BOOL | DB2.DBX8.3 | 100ms | Falla activa |
| `ST_AutoMode` | BOOL | DB2.DBX8.4 | 500ms | Modo automático habilitado |
| `ST_PosReached` | BOOL | DB2.DBX8.5 | 100ms | Posición objetivo alcanzada |
| `ST_FaultCode` | INT | DB2.DBW10 | — | Código de falla activa |
| `ST_TargetPos` | REAL | DB2.DBD12 | — | Posición objetivo (grados) |
| `ST_ErrorPos` | REAL | DB2.DBD16 | — | Error de posición (grados) |

### 3.3. DB2 — Telemetría (PLC → HMI)

> 📂 Definidos en `plc-bridge/plcConnection.js` líneas 56-59

| Tag | Tipo | Dirección PLC | Ciclo | Descripción |
|-----|------|--------------|-------|-------------|
| `TEL_Torque` | REAL | DB2.DBD20 | 200ms | Torque motor (Nm) |
| `TEL_Current` | REAL | DB2.DBD24 | 200ms | Corriente motor (A) |
| `TEL_Temperature` | REAL | DB2.DBD28 | 1000ms | Temperatura motor (°C) |
| `VFD_P1120_AccTime` | REAL | DB2.DBD22 | 5s | Parámetro VFD rampa de aceleración |
| `VFD_P1121_DecTime` | REAL | DB2.DBD26 | 5s | Parámetro VFD rampa de deceleración |

### 3.4. DB3 — Inventario DETALLADO (20 bandejas × 30 bytes)

> **📂 Generado dinámicamente en:** `plc-bridge/plcConnection.js`
> **📂 Tags WinCC correspondientes en:** `wincc-scripts/Tags_Import.csv` (120 tags nuevos)

Cada bandeja ocupa 30 bytes (24 bytes base + 6 bytes de refs) con la siguiente estructura:

| Offset | Tipo | Tag | Descripción |
|--------|------|-----|-------------|
| +0 | STRING[20] | `INV_Ref_N` | Referencia principal del arnés |
| +22 | INT | `INV_Qty_N` | Cantidad total acumulada |
| +24 | INT | `INV_T[N]_RefA` | Cantidad de Referencia A |
| +26 | INT | `INV_T[N]_RefB` | Cantidad de Referencia B |
| +28 | INT | `INV_T[N]_RefC` | Cantidad de Referencia C |
| +30 | INT | `INV_T[N]_RefD` | Cantidad de Referencia D |
| +32 | INT | `INV_T[N]_RefE` | Cantidad de Referencia E |
| +34 | INT | `INV_T[N]_RefF` | Cantidad de Referencia F |

**Fórmula de direcciones (Modo WinCC Detallado):**
Para la bandeja N (0-19):
- `INV_T[N]_RefA` → `DB3.DBW(22 + N*30 + 4)`
- `INV_T[N]_RefF` → `DB3.DBW(22 + N*30 + 14)`

> [!IMPORTANT]
> A partir de febrero 2026, el script `Animate_Carousel.js` utiliza estos tags individuales para iluminar los indicadores de colores en la vista de animación.

### 3.5. Entradas y Salidas Digitales

> 📂 Definidos en `wincc-scripts/Tags_Import.csv` líneas 20-32

| Tag | Dirección | Tipo | Descripción |
|-----|-----------|------|-------------|
| `I0_0_EStop` | %I0.0 | Entrada (NC) | Seta de emergencia |
| `I0_1_Start` | %I0.1 | Entrada | Botón Start físico |
| `I0_2_Stop` | %I0.2 | Entrada | Botón Stop físico |
| `I0_4_DoorClosed` | %I0.4 | Entrada | Sensor puerta cerrada |
| `I0_5_SafetyCurtain` | %I0.5 | Entrada | Cortina de seguridad |
| `I0_6_ReflexSensor` | %I0.6 | Entrada | Sensor reflex (picking) |
| `Q_MotorOn` | %Q0.0 | Salida | Motor principal |
| `Q_BrakeRelease` | %Q0.1 | Salida | Freno mecánico |
| `Q_Ind_Run` | %Q0.2 | Salida | Indicador marcha |
| `Q_Ind_Ready` | %Q0.3 | Salida | Indicador listo |
| `Q_Tower_Green` | %Q0.6 | Salida | Semáforo torre verde |
| `Q_Tower_Yellow` | %Q0.7 | Salida | Semáforo torre amarillo |
| `Q_Tower_Red` | %Q1.0 | Salida | Semáforo torre rojo |

---

## 4. Lógica de Operación — Ciclo de Picking

> **📂 Archivos donde está implementada esta lógica:**
> - **React (Opción A/C):** `simulator-app/src/components/HMI/OperationPanel.tsx` (funciones handleMove, handleExtract, handleRemove)
> - **React Bridge:** `simulator-app/src/components/HMI/PlcBridgePanel.tsx` (funciones handleSelectTray, handleExtract, handleRemove)
> - **WinCC (Opción B):** `wincc-scripts/02_Scr_Operacion/Script_Mover.js`, `Script_Sacar.js`, `Script_Retirar.js`
> - **Motor de simulación:** `simulator-app/src/simulation/PLC/Processor.ts` (máquina de estados)
> - **Mock PLC:** `plc-bridge/mockPlc.js` (simulador de lógica PLC)

El ciclo de picking es la operación principal del sistema. Es idéntico en las tres capas de código:

```
                    ┌───────────┐
                    │   IDLE    │
                    │ (Reposo)  │
                    └─────┬─────┘
                          │ Operador selecciona Bandeja N
                          ▼
                    ┌───────────┐    CMD_TargetTray = N
                    │  MOVING   │    CMD_AutoMode = true
                    │ (Girando) │    CMD_Start = true (pulso 200ms)
                    └─────┬─────┘
                          │ ST_PosReached == true
                          │ (posición alcanzada)
                          ▼
                    ┌───────────┐    
                    │  ARRIVED  │    Motor detenido
                    │(En posic.)│    Bandeja N en zona de picking
                    └─────┬─────┘
                          │ Operador presiona SACAR
                          │ I0_6_ReflexSensor = true
                          ▼
                    ┌───────────┐
                    │ EXTRACTED │    Sensor reflex detecta arnés
                    │(Sacando)  │    Botón RETIRAR habilitado
                    └─────┬─────┘
                          │ Operador presiona RETIRAR
                          ▼
                    ┌───────────┐    I0_6_ReflexSensor = false
                    │  REMOVED  │    CMD_InventoryDecrement = true (pulso)
                    │(Retirado) │    CMD_AutoMode = false  ← CRÍTICO
                    └─────┬─────┘
                          │ Automático
                          ▼
                    ┌───────────┐
                    │   IDLE    │    Listo para nuevo ciclo
                    └───────────┘
```

> **⚠️ NOTA CRÍTICA:** Al finalizar cada ciclo (RETIRAR), se debe resetear `CMD_AutoMode = false`. Sin este reset, el segundo movimiento genera un **bucle infinito** de movimiento. Este fix está implementado en las tres capas de código.

### Flags que se resetean entre ciclos

| Flag | Dónde se resetea | Archivo que lo implementa | Cuándo |
|------|------------------|---------------------------|--------|
| `CMD_AutoMode` | En RETIRAR | `OperationPanel.tsx` línea 78 / `Script_Retirar.js` línea 32 / `mockPlc.js` línea 210 | Desactiva automático |
| `CMD_Start` | En el PLC o mock | `mockPlc.js` línea 211 | Pulso 200ms, se auto-apaga |
| `M0_2_PosReached` | En MOVER | `OperationPanel.tsx` línea 42 / `Script_Mover.js` línea 57 | Permite re-calcular |
| `M0_1_Moving` | En MOVER | `OperationPanel.tsx` línea 43 / `Script_Mover.js` línea 58 | Permite re-activar motor |

---

## 5. Opción A — Integración Web (plc-bridge)

> **📂 Carpeta principal:** `plc-bridge/`
> **📄 README detallado:** `plc-bridge/README.md`

### 5.1. Descripción General

El **plc-bridge** es un servidor Node.js que actúa como middleware entre la interfaz web y el PLC Siemens. Expone:
- Una **REST API** para comandos e inventario → definida en `plc-bridge/server.js`
- Un **WebSocket (Socket.IO)** para streaming de estado en tiempo real → definida en `plc-bridge/server.js`

### 5.2. Requisitos

| Requisito | Detalle |
|-----------|---------|
| Hardware | PC industrial o mini-PC con Ethernet |
| Software | Node.js v18+ |
| Red | Ethernet cableado al PLC (192.168.0.X) |
| Puerto PLC | 102 (ISO-on-TCP / S7comm) |
| Puerto Web | 3001 (HTTP + WebSocket) |

### 5.3. Configuración

> **📄 Archivo:** `plc-bridge/.env`

```env
# --- Conexión PLC Siemens S7 ---
PLC_IP=192.168.0.1        ← Cambiar a la IP del PLC real
PLC_RACK=0                ← S7-1200 siempre Rack=0
PLC_SLOT=1                ← S7-1200 siempre Slot=1
PLC_PORT=102              ← Puerto estándar S7comm

# --- Servidor Web ---
HTTP_PORT=3001            ← Puerto de la API y WebSocket
WS_POLL_INTERVAL_MS=100   ← Frecuencia de polling (ms)

# --- Modo de Operación ---
MODE=live                 ← Cambiar de "mock" a "live" para PLC real
```

### 5.4. Instalación y Arranque

```bash
# 1. Instalar dependencias
cd plc-bridge
npm install

# 2. Modo prueba (SIN PLC)
set MODE=mock
node server.js
# Servidor arranca en http://localhost:3001

# 3. Modo producción (CON PLC)
set MODE=live
set PLC_IP=192.168.0.1
node server.js
# Si la conexión falla, ver sección 5.8
```

### 5.5. API REST — Referencia Completa

> **📄 Implementada en:** `plc-bridge/server.js` (líneas ~100-350)

| Método | Endpoint | Body | Respuesta | Descripción |
|--------|----------|------|-----------|-------------|
| GET | `/api/status` | — | `{ST_EncoderPos, ST_MotorRunning, ...}` | Estado completo del PLC |
| GET | `/api/inventory` | — | `[{trayId, ref, qty, weight}, ...]` | Inventario de 20 bandejas |
| GET | `/api/info` | — | `{mode, pollMs, version}` | Info del servidor (v2.0) |
| POST | `/api/select-tray` | `{trayId: 0-19}` | `{ok, message}` | Seleccionar bandeja objetivo |
| POST | `/api/start` | — | `{ok}` | Arrancar modo automático |
| POST | `/api/stop` | — | `{ok}` | Parada normal |
| POST | `/api/estop` | — | `{ok}` | Parada de emergencia |
| POST | `/api/estop/reset` | — | `{ok}` | Resetear E-Stop |
| POST | `/api/search` | `{reference: "REF-001"}` | `{found, trayId, qty}` | Buscar referencia |
| POST | `/api/inventory/update` | `{trayId, ref, qty, weight}` | `{ok}` | Actualizar bandeja |
| | | | | |
| **API INVENTARIO AVANZADA (v2.0)** | | | | |
| GET | `/api/inventory/history` | Query: `from, to, operator, shift, type, trayId` | `{ok, count, history[]}` | Historial de movimientos filtrable |
| GET | `/api/inventory/:trayId` | — | `{ok, tray: {id, slots[]}}` | Detalle de una bandeja |
| POST | `/api/inventory/load` | `{trayId, reference, quantity, weight, operator, supervisor, location}` | `{ok, record}` | Cargar material + log |
| POST | `/api/inventory/unload` | `{trayId, reference, quantity, operator}` | `{ok, record}` | Descargar material + log |
| POST | `/api/inventory/bulk-load` | `[{trayId, reference, quantity, weight, operator}, ...]` | `{ok, results[]}` | Carga masiva (ERP) |
| GET | `/api/report/shift` | Query: `date, shift, supervisor, location` | Archivo `.xlsx` | Reporte Excel del turno |

### 5.6. WebSocket — Eventos en Tiempo Real

> **📄 Server side:** `plc-bridge/server.js` (sección Socket.IO)
> **📄 Client side:** `simulator-app/src/services/PlcWebSocketService.ts`

**Conexión:**
```javascript
import { io } from 'socket.io-client';
const socket = io('http://<IP-PC>:3001');
```

**Eventos del servidor → cliente (cada 100ms):**
```javascript
socket.on('plc-state', (state) => {
    // state = {
    //   ST_EncoderPos: 127.5,     // grados (0-360)
    //   ST_VFD_Speed: 45.2,       // porcentaje
    //   ST_MotorRunning: true,
    //   ST_SystemReady: true,
    //   ST_SystemFault: false,
    //   ST_BrakeReleased: true,
    //   ST_AutoMode: true,
    //   ST_PosReached: false,
    //   TEL_Torque: 12.3,         // Nm
    //   TEL_Current: 3.2,         // A
    //   TEL_Temperature: 42.1,    // °C
    // }
});

socket.on('bridge-info', (info) => {
    // { mode: 'live', pollMs: 100 }
});

socket.on('command-ack', (ack) => {
    // { command: 'select-tray', ok: true }
    // { command: 'start', ok: false, error: 'PLC no conectado' }
});
```

**Eventos del cliente → servidor:**
```javascript
socket.emit('select-tray', { trayId: 5 });
socket.emit('start');
socket.emit('stop');
socket.emit('estop');
```

### 5.7. Driver de Comunicación S7 — plcConnection.js

> **📄 Archivo:** `plc-bridge/plcConnection.js`

Este archivo contiene el **driver de comunicación S7** con el mapa de tags. Si el integrador necesita cambiar las direcciones del PLC (por ejemplo, usar DB diferentes), debe modificar el `tagMap`:

```javascript
// plc-bridge/plcConnection.js — Líneas 35-72
this.tagMap = {
    // DB1: COMANDOS (HMI → PLC)
    'CMD_TargetTray':    'DB1,INT0',       // ← Cambiar si usa otro DB
    'CMD_Start':         'DB1,X2.0',
    // ...
    
    // DB2: ESTADO (PLC → HMI)
    'ST_EncoderPos':     'DB2,REAL0',      // ← Cambiar si usa otro DB
    // ...
};
```

**Formato de direcciones nodes7:**
```
DB1,INT0     → DB1, Integer en offset 0
DB2,REAL4    → DB2, Real (Float32) en offset 4
DB2,X8.0     → DB2, Bit 0 del byte 8
DB1,S4.20    → DB1, String de 20 chars desde offset 4
```

### 5.8. Diagnóstico de Conexión

> **📄 Script de diagnóstico:** `plc-bridge/test-connection.js`

Si la conexión al PLC falla:

```bash
# Ejecutar diagnóstico automático
node plc-bridge/test-connection.js

# Verificar conectividad de red
ping 192.168.0.1

# Verificar puerto 102 (PowerShell)
Test-NetConnection -ComputerName 192.168.0.1 -Port 102
```

**Errores comunes:**

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` | PLC apagado o IP incorrecta | Verificar IP y alimentación |
| `ETIMEDOUT` | Firewall o subred diferente | PC y PLC en la misma subred |
| `Tag desconocido` | DB no existe en PLC | Crear DB1/DB2/DB3 según §3 |
| `Access denied` | Protección de acceso | TIA Portal → Propiedades PLC → Protección → Permitir PUT/GET |

### 5.9. Adaptaciones del Integrador — Opción A

| Tarea | Archivo (ruta desde raíz) | Qué Cambiar |
|-------|---------------------------|-------------|
| Cambiar IP del PLC | `plc-bridge/.env` | Variable `PLC_IP` |
| Cambiar DBs del PLC | `plc-bridge/plcConnection.js` | Objeto `tagMap` (líneas 35-72) |
| Agregar variables nuevas | `plc-bridge/plcConnection.js` + `plc-bridge/server.js` | Agregar al tagMap y exponer en la API |
| Cambiar puerto web | `plc-bridge/.env` | Variable `HTTP_PORT` |
| Frecuencia de polling | `plc-bridge/.env` | Variable `WS_POLL_INTERVAL_MS` (mín. 50ms) |
| Interfaz customizada | `simulator-app/src/components/HMI/*.tsx` | Modificar los componentes React |

---

## 6. Opción B — WinCC Nativo (Panel Siemens)

> **📂 Carpeta principal:** `wincc-scripts/`
> **📄 README detallado:** `wincc-scripts/README.md`

### 6.1. Descripción General

Los scripts JavaScript están diseñados para pegarse directamente en los eventos de los objetos de pantalla en **TIA Portal WinCC (Unified o Comfort)**. Son funcionalmente equivalentes a los componentes React.

### 6.2. Requisitos

| Requisito | Detalle |
|-----------|---------|
| Software | TIA Portal V17+ con WinCC |
| Panel HMI | KTP700 Basic, TP900/1200 Comfort, o PC Runtime |
| Conexión | Integrada PLC ↔ HMI (PROFINET o MPI) |
| Runtime | WinCC Runtime Unified o Comfort |

### 6.3. Paso 1 — Importar Tags

> **📄 Archivo CSV:** `wincc-scripts/Tags_Import.csv` (187 tags, 187 líneas)

1. En TIA Portal, abrir el proyecto del PLC
2. Ir a **HMI → Tags → Importar**
3. Seleccionar `wincc-scripts/Tags_Import.csv`
4. Verificar que el nombre de conexión sea `PLC_S7_1200` (o cambiar en el CSV, columna `Connection`)

**Formato del CSV:**
```csv
Name,Data Type,Connection,PLC Tag,Address,Acquisition Cycle,Comment
ST_EncoderPos,Real,PLC_S7_1200,,DB2.DBD0,100ms,Posicion encoder en grados
CMD_TargetTray,Int,PLC_S7_1200,,DB1.DBW0,,Bandeja objetivo (0-19)
...
```

### 6.4. Paso 2 — Crear Pantallas

Crear las siguientes pantallas en el proyecto HMI:

| # | Nombre Pantalla | Función | Objetos Principales |
|---|----------------|---------|---------------------|
| 1 | `Scr_Inicio` | Inicio / Estado | LED de estado, botón Start, indicador de posición |
| 2 | `Scr_Operacion` | Operación / Picking | Dropdown de bandejas, botones MOVER/SACAR/RETIRAR, texto de estado |
| 3 | `Scr_Inventario` | Inventario | Buscador por referencia, tabla de colores por bandeja |
| 4 | `Scr_Diagnostico` | Diagnóstico | Acceso restringido, info de fallas |
| 5 | `Scr_Animacion` | Animación 2D | Vista lateral del carrusel |

### 6.5. Paso 3 — Vincular Scripts a Eventos

#### Pantalla `Scr_Inicio`

| Objeto | Evento | Script (ruta desde raíz) |
|--------|--------|--------------------------|
| `Btn_IniciarCiclo` | Press | `wincc-scripts/01_Scr_Inicio/Btn_InicioCiclo_Press.js` |
| Pantalla completa | Cyclic (500ms) | `wincc-scripts/01_Scr_Inicio/Update_Status_Text.js` |
| `Rect_TrayIndicator` | Cyclic (200ms) | `wincc-scripts/01_Scr_Inicio/Animate_Tray_Position.js` |

#### Pantalla `Scr_Operacion`

| Objeto | Evento | Script (ruta desde raíz) |
|--------|--------|--------------------------|
| `Btn_Mover` | Press | `wincc-scripts/02_Scr_Operacion/Script_Mover.js` |
| `Btn_Sacar` | Press | `wincc-scripts/02_Scr_Operacion/Script_Sacar.js` |
| `Btn_Retirar` | Press | `wincc-scripts/02_Scr_Operacion/Script_Retirar.js` |
| Pantalla completa | Cyclic (200ms) | `wincc-scripts/02_Scr_Operacion/Update_Op_Status.js` |

#### Pantalla `Scr_Inventario`

| Objeto | Evento | Script (ruta desde raíz) |
|--------|--------|--------------------------|
| `Btn_Buscar` | Press | `wincc-scripts/03_Scr_Inventario/Script_BuscarRef.js` |
| Pantalla completa | Cyclic (2000ms) | `wincc-scripts/03_Scr_Inventario/Update_Inventory_Colors.js` |

#### Pantalla `Scr_Diagnostico`

| Objeto | Evento | Script (ruta desde raíz) |
|--------|--------|--------------------------|
| Pantalla | Loaded | `wincc-scripts/04_Scr_Diagnostico/Check_Access_Level.js` |

#### Template Global (todas las pantallas)

| Objeto | Evento | Script (ruta desde raíz) |
|--------|--------|--------------------------|
| Navegación | Press | `wincc-scripts/05_Template/Nav_Screens.js` |
| Indicador E-Stop | Cyclic (200ms) | `wincc-scripts/05_Template/EStop_Global.js` |

#### Pantalla `Scr_Animacion`

| Objeto | Evento | Script (ruta desde raíz) |
|--------|--------|--------------------------|
| Pantalla completa | Cyclic (100ms) | `wincc-scripts/06_Scr_Animacion/Animate_Carousel.js` |

### 6.6. Equivalencia Script ↔ React

Para cada script WinCC existe un componente React equivalente que el integrador puede consultar como referencia funcional:

| Script WinCC (ruta desde raíz) | Función React | Archivo React (ruta desde raíz) |
|-------------------------------|---------------|--------------------------------|
| `wincc-scripts/02_Scr_Operacion/Script_Mover.js` | `handleMove()` | `simulator-app/src/components/HMI/OperationPanel.tsx` |
| `wincc-scripts/02_Scr_Operacion/Script_Sacar.js` | `handleExtract()` | `simulator-app/src/components/HMI/OperationPanel.tsx` |
| `wincc-scripts/02_Scr_Operacion/Script_Retirar.js` | `handleRemove()` | `simulator-app/src/components/HMI/OperationPanel.tsx` |
| `wincc-scripts/02_Scr_Operacion/Update_Op_Status.js` | Render JSX | `simulator-app/src/components/HMI/OperationPanel.tsx` |
| `wincc-scripts/06_Scr_Animacion/Animate_Carousel.js` | Componente completo | `simulator-app/src/components/HMI/CarouselSchematicView.tsx` |
| `wincc-scripts/05_Template/Nav_Screens.js` | Tabs navegación | `simulator-app/src/components/HMI/HmiLayout.tsx` |
| `wincc-scripts/05_Template/EStop_Global.js` | Toggle E-Stop | `simulator-app/src/components/HMI/HmiLayout.tsx` |

### 6.7. Objetos de Pantalla Requeridos

> **📄 Los nombres se definen dentro de cada script:**  buscar `Screen.Items("...")` en los archivos `.js`

Cada script referencia objetos de pantalla por nombre. Crear estos objetos con los nombres **exactos**:

#### Pantalla `Scr_Operacion`

| Nombre del Objeto | Tipo | Propósito |
|-------------------|------|-----------|
| `Txt_Estado_Op` | Text Field | Muestra estado actual (texto + color) |
| `Btn_Mover` | Button | Ejecutar movimiento |
| `Btn_Sacar` | Button | Activar extracción |
| `Btn_Retirar` | Button | Confirmar retiro |
| `Dropdown_Bandejas` | Dropdown | Selección de bandeja (0-19) |

#### Pantalla `Scr_Animacion`

| Nombre del Objeto | Tipo | Propósito |
|-------------------|------|-----------|
| `Rect_Tray_0` a `Rect_Tray_6` | Rectangles | Las 7 bandejas visibles |
| `Rect_PickZone` | Rectangle | Zona de picking (cambia color) |
| `Txt_TrayLabel_0` a `Txt_TrayLabel_6` | Text Fields | Número de bandeja |
| `Txt_PosActual` | Text Field | Posición actual en grados |

### 6.8. Adaptaciones del Integrador — Opción B

| Tarea | Archivo (ruta desde raíz) | Qué Cambiar |
|-------|---------------------------|-------------|
| Cambiar nombre de conexión PLC | `wincc-scripts/Tags_Import.csv` | Columna `Connection` |
| Cambiar direcciones de DB | `wincc-scripts/Tags_Import.csv` | Columna `Address` |
| Renombrar objetos de pantalla | `wincc-scripts/0X_Scr_*/*.js` | Buscar `Screen.Items("...")` |
| Cambiar colores | `wincc-scripts/0X_Scr_*/*.js` | Buscar valores `0x` hexadecimales |
| Cambiar frecuencia de animación | Configuración del evento Cyclic | Ajustar en TIA Portal |

### 6.9. Colores utilizados en los scripts

> **📄 Definidos dentro de cada archivo `.js`** como valores hexadecimales en `ForeColor` y `BackColor`

```
0xFF0000  → Rojo      (Error, E-Stop, falla)
0xFF6600  → Naranja   (Advertencia, movimiento)
0xFFFF00  → Amarillo  (Espera)
0x00FF00  → Verde     (OK, conectado)
0x00FFFF  → Cyan      (Información, completado)
0x808080  → Gris      (Inactivo)
```

---

## 7. Opción C — Tablet Industrial (PWA)

> **📂 Carpeta principal:** `simulator-app/`
> **📄 README detallado:** `simulator-app/README.md`
> **⚡ Requiere también:** `plc-bridge/` corriendo como backend (Opción A)

### 7.1. Descripción General

La aplicación React ya está configurada como **Progressive Web App (PWA)**, lo que permite instalarla como app nativa en cualquier tablet con navegador Chrome/Edge.

### 7.2. Requisitos

| Requisito | Detalle |
|-----------|---------|
| Backend | PC con Node.js ejecutando `plc-bridge/` (Opción A) |
| Tablet | Android 8+ o Windows 10+ con Chrome/Edge |
| Red | WiFi industrial en la misma subred que el PC |
| Resolución | Mínimo 1024×600 (landscape recomendado) |

### 7.3. Despliegue en Modo Desarrollo

```bash
# En el PC (debe tener Node.js instalado):
cd simulator-app
npm install
npm run dev
# → Servidor arranca en http://0.0.0.0:5173
# → Accesible desde la tablet en http://<IP-PC>:5173
```

> **📄 El host `0.0.0.0` está configurado en:** `simulator-app/vite.config.ts` (propiedad `server.host`)

### 7.4. Despliegue en Modo Producción (Recomendado)

```bash
# 1. Construir la aplicación
cd simulator-app
npm run build
# Genera la carpeta simulator-app/dist/ con:
#   - index.html
#   - assets/ (JS, CSS)
#   - sw.js (Service Worker)
#   - workbox-*.js (Cache library)
#   - manifest.json
#   - icons/

# 2. Servir con cualquier servidor estático
npx serve dist -l 3000
# O usar nginx, Apache, IIS, etc.

# 3. En la tablet, abrir Chrome/Edge:
#    http://<IP-PC>:3000
#    → Aparecerá banner "Instalar ZASCA"
#    → Tocar "Instalar" → Se agrega al home screen
```

### 7.5. Archivos PWA

| Archivo (ruta desde raíz) | Función |
|----------------------------|---------|
| `simulator-app/vite.config.ts` | Plugin `vite-plugin-pwa` con Workbox, `host: '0.0.0.0'` |
| `simulator-app/index.html` | Meta tags PWA + Apple mobile web app |
| `simulator-app/public/manifest.json` | Nombre, icono, orientación landscape, colores |
| `simulator-app/public/icons/icon.svg` | Icono de la app (carrusel esquemático) |

### 7.6. Configuración del Service Worker

> **📄 Configurado en:** `simulator-app/vite.config.ts` (plugin VitePWA)

| Funcionalidad | Configuración | Archivo (ruta desde raíz) |
|---------------|--------------|---------------------------|
| Cache de assets | `globPatterns: ['**/*.{js,css,html,png,svg}']` | `simulator-app/vite.config.ts` |
| Cache de API | `NetworkFirst` para `/api/*` del plc-bridge | `simulator-app/vite.config.ts` |
| Auto-actualización | `registerType: 'autoUpdate'` | `simulator-app/vite.config.ts` |
| Timeout de red | 3 segundos antes de usar cache | `simulator-app/vite.config.ts` |

### 7.7. Configuración de Red Industrial

```
┌─────────────────────────────────────────────────┐
│            Red Industrial (192.168.0.0/24)       │
│                                                  │
│   PLC S7-1200 ──────── Switch ──────── PC        │
│   192.168.0.1            │            192.168.0.X │
│                          │            ├─ plc-bridge :3001
│                          │            └─ web app   :3000
│                          │                         │
│                     Access Point (WiFi)            │
│                          │                         │
│                     Tablet Industrial              │
│                     192.168.0.Y                    │
│                     Chrome → http://192.168.0.X:3000
└─────────────────────────────────────────────────┘
```

> **⚠️ Seguridad:** La red WiFi industrial debe ser **aislada** de la red corporativa. Usar WPA2-Enterprise o VLAN dedicada.

### 7.8. Conectar la Tablet al plc-bridge

> **📄 Archivo a modificar:** `simulator-app/src/services/PlcWebSocketService.ts`

Buscar la línea de conexión y cambiar a la IP del PC:

```typescript
// simulator-app/src/services/PlcWebSocketService.ts
this.socket = io('http://192.168.0.X:3001');
```

### 7.9. Adaptaciones del Integrador — Opción C

| Tarea | Archivo (ruta desde raíz) | Qué Cambiar |
|-------|---------------------------|-------------|
| URL del plc-bridge | `simulator-app/src/services/PlcWebSocketService.ts` | URL del Socket.IO |
| Puerto del servidor web | `simulator-app/vite.config.ts` | Propiedad `server.port` |
| Nombre de la app | `simulator-app/public/manifest.json` | Campos `name`, `short_name` |
| Colores de la app | `simulator-app/public/manifest.json` | Campos `theme_color`, `background_color` |
| Icono de la app | `simulator-app/public/icons/icon.svg` | Reemplazar el SVG |
| Orientación | `simulator-app/public/manifest.json` | Campo `orientation` |

---

## 8. API de Inventario Avanzada y Reportes Excel (v2.0)

> **📂 Archivos principales:**
> - **Logger:** `plc-bridge/inventoryLogger.js` — Registro persistente de todos los movimientos
> - **Reportes:** `plc-bridge/reportGenerator.js` — Generador de archivos Excel
> - **Endpoints:** `plc-bridge/server.js` — 6 nuevos endpoints REST
> - **Dependencia:** `xlsx` (SheetJS) — Instalada en `plc-bridge/package.json`

### 8.1. Descripción General

La v2.0 del plc-bridge incluye un sistema completo de **gestión de inventario** con trazabilidad y **reportes por turno** en formato Excel (.xlsx). Diseñado para integrarse con el ERP de FASECOL.

### 8.2. Flujo de Datos

```
                  ┌─────────────┐     ┌──────────────────┐
   ERP / HMI ────→│  server.js  │────→│ inventoryLogger  │
   (HTTP POST)    │ (Endpoints) │     │   .js            │
                  └──────┬──────┘     └────────┬─────────┘
                         │                     │
                         │              ┌──────▼─────────┐
                         │              │  data/          │
                         │              │  inventory_     │
                         │              │  log.json       │
                         │              └──────┬─────────┘
                         │                     │
                  ┌──────▼──────┐     ┌────────▼─────────┐
                  │    PLC      │     │ reportGenerator  │
                  │ (DB3 tags)  │     │   .js            │
                  └─────────────┘     └──────────────────┘
                                              │
                                       ┌──────▼─────────┐
                                       │  reporte.xlsx  │
                                       │  (3 hojas)     │
                                       └────────────────┘
```

### 8.3. Turnos Reconocidos

| Turno | Código | Horario |
|-------|--------|---------|
| Mañana | `morning` | 06:00 — 14:00 |
| Tarde | `afternoon` | 14:00 — 22:00 |
| Noche | `night` | 22:00 — 06:00 |

### 8.4. Cargar Material — `POST /api/inventory/load`

> **📄 Implementado en:** `plc-bridge/server.js`

**Request:**
```json
{
    "trayId": 5,
    "reference": "REF-A01",
    "quantity": 10,
    "weight": 2.5,
    "operator": "Juan Pérez",
    "supervisor": "Carlos López",
    "location": "Planta Bogotá"
}
```

**Efecto:**
1. Actualiza los tags de inventario en el PLC (DB3)
2. Registra el movimiento en `data/inventory_log.json`
3. Retorna confirmación con el registro creado

**Ejemplo con curl:**
```bash
curl -X POST http://192.168.0.X:3001/api/inventory/load \
  -H "Content-Type: application/json" \
  -d '{"trayId":5,"reference":"REF-A01","quantity":10,"weight":2.5,"operator":"Juan Pérez","supervisor":"Carlos López"}'
```

### 8.5. Descargar Material — `POST /api/inventory/unload`

**Request:**
```json
{
    "trayId": 5,
    "reference": "REF-A01",
    "quantity": 3,
    "operator": "María García"
}
```

### 8.6. Carga Masiva desde ERP — `POST /api/inventory/bulk-load`

Permite cargar múltiples bandejas en una sola petición:

```json
[
    {"trayId": 0, "reference": "REF-001", "quantity": 5, "weight": 1.2, "operator": "Sistema"},
    {"trayId": 1, "reference": "REF-002", "quantity": 8, "weight": 0.8, "operator": "Sistema"},
    {"trayId": 2, "reference": "REF-003", "quantity": 3, "weight": 2.1, "operator": "Sistema"}
]
```

**Respuesta:**
```json
{
    "ok": true,
    "message": "3/3 bandejas actualizadas",
    "results": [{"trayId":0,"ok":true}, {"trayId":1,"ok":true}, {"trayId":2,"ok":true}]
}
```

### 8.7. Historial de Movimientos — `GET /api/inventory/history`

Devuelve el historial filtrado por cualquier combinación de parámetros:

```bash
# Todos los movimientos de un operador en una fecha
curl "http://192.168.0.X:3001/api/inventory/history?from=2026-02-21&to=2026-02-21&operator=Juan"

# Solo cargas del turno de la mañana
curl "http://192.168.0.X:3001/api/inventory/history?shift=morning&type=load"

# Historial de una bandeja específica
curl "http://192.168.0.X:3001/api/inventory/history?trayId=5"
```

**Parámetros de filtro (todos opcionales):**

| Parámetro | Tipo | Ejemplo | Descripción |
|-----------|------|---------|-------------|
| `from` | YYYY-MM-DD | `2026-02-21` | Fecha inicio |
| `to` | YYYY-MM-DD | `2026-02-21` | Fecha fin |
| `operator` | string | `Juan` | Filtro por operador |
| `shift` | string | `morning` | Turno: `morning`, `afternoon`, `night` |
| `type` | string | `load` | Tipo: `load` o `unload` |
| `trayId` | int | `5` | Bandeja específica |

### 8.8. Reporte Excel por Turno — `GET /api/report/shift`

> **📄 Implementado en:** `plc-bridge/reportGenerator.js` (usa librería `xlsx` / SheetJS)

**Generar y descargar reporte:**
```bash
curl "http://192.168.0.X:3001/api/report/shift?date=2026-02-21&shift=afternoon&supervisor=Carlos%20López&location=Planta%20Bogotá" -o reporte_turno.xlsx
```

**Parámetros:**

| Parámetro | Requerido | Ejemplo | Descripción |
|-----------|-----------|---------|-------------|
| `date` | ✅ | `2026-02-21` | Fecha del turno |
| `shift` | ✅ | `afternoon` | Código del turno |
| `supervisor` | Opcional | `Carlos López` | Supervisor del turno |
| `location` | Opcional | `Planta Bogotá` | Ubicación de la planta |

**Contenido del archivo Excel (3 hojas):**

| Hoja | Contenido |
|------|----------|
| **Resumen Turno** | Fecha, turno, supervisor, ubicación, totales de ingresos y salidas, balance neto, lista de operadores |
| **Movimientos** | Detalle fila a fila: hora, operador, tipo, bandeja, referencia, cantidad, peso |
| **Inventario Cierre** | Estado actual de las 20 bandejas al momento de generar el reporte |

### 8.9. Logger de Inventario — Referencia Técnica

> **📄 Archivo:** `plc-bridge/inventoryLogger.js`

| Función | Descripción |
|---------|-------------|
| `logMovement(entry)` | Registra un movimiento (load/unload) con timestamp, turno y todos los datos |
| `getHistory(filters)` | Retorna historial filtrado (fecha, operador, turno, tipo, bandeja) |
| `getShiftSummary(date, shift)` | Calcula resumen del turno: totales, balance, operadores |
| `getCurrentInventory()` | Lee el estado actual de las 20 bandejas desde el PLC |

**Persistencia:** Los datos se guardan automáticamente en `plc-bridge/data/inventory_log.json`. Este archivo se crea automáticamente la primera vez que se registra un movimiento.

### 8.10. Integración con ERP de FASECOL

Para integrar el sistema de inventario con el ERP:

1. **Sincronización inicial:** Usar `POST /api/inventory/bulk-load` para cargar el inventario completo desde el ERP
2. **Movimientos en tiempo real:** Las operaciones de picking del HMI quedan registradas automáticamente
3. **Reportes periódicos:** Programar `GET /api/report/shift` al final de cada turno
4. **Consultas:** Usar `GET /api/inventory/history` para auditorías o dashboards del ERP

**Diagrama de integración ERP:**
```
    ┌──────────────┐         ┌───────────────────┐         ┌──────────┐
    │  ERP FASECOL │ ──POST──│  plc-bridge:3001  │──S7comm──│ PLC S7-  │
    │              │  /bulk- │  (server.js)      │         │  1200    │
    │ Inventario   │  load   │                   │         │          │
    │ Contable     │         │  inventoryLogger   │         │ DB3:     │
    │              │ ◀──GET──│  reportGenerator   │         │ Inventario│
    │ Reporte      │  /report│                   │         │          │
    │ Turno (.xlsx)│  /shift │                   │         │          │
    └──────────────┘         └───────────────────┘         └──────────┘
```

---

## 9. Validación y Pruebas

### 9.1. Secuencia de Pruebas Recomendada

| Paso | Descripción | Modo | Resultado Esperado |
|------|-------------|------|-------------------|
| 1 | Arrancar plc-bridge en modo mock | `MODE=mock` | Servidor en :3001, sin PLC real |
| 2 | Abrir React app en navegador | Dev | Las 6 pestañas visibles |
| 3 | Tab BRIDGE: Conectar WebSocket | Mock | LEDs de estado se encienden |
| 4 | BRIDGE: Seleccionar Bandeja 5 | Mock | Estado cambia a MOVING |
| 5 | BRIDGE: Esperar llegada | Mock | ST_PosReached = true, estado ARRIVED |
| 6 | BRIDGE: Presionar SACAR | Mock | Sensor reflex se activa |
| 7 | BRIDGE: Presionar RETIRAR | Mock | Inventario descuenta, vuelve a IDLE |
| 8 | **Repetir pasos 4-7 tres veces** | Mock | **NO debe haber loop en el 2° o 3° ciclo** |
| 9 | Cambiar a `MODE=live` en `plc-bridge/.env` | Live | Conexión real al PLC |
| 10 | Repetir pasos 4-7 con PLC real | Live | Carrusel físico se mueve |

### 9.2. Ciclo de Picking — Checklist

Para cada ciclo, verificar:

- [ ] Bandeja seleccionada correctamente (`CMD_TargetTray` == N)
- [ ] Motor arranca (`ST_MotorRunning` == true)
- [ ] Motor se detiene al llegar (`ST_PosReached` == true)
- [ ] AutoMode se desactiva al RETIRAR (`ST_AutoMode` == false)
- [ ] Estado vuelve a IDLE (listo para nuevo ciclo)
- [ ] Inventario descuenta correctamente

### 9.3. Test de Regresión — Bug del Loop

Este test específico verifica que el bug del bucle infinito (corregido en febrero 2026) no se reproduce:

1. Seleccionar Bandeja 0 → Mover → Sacar → Retirar ✓
2. Seleccionar Bandeja 5 → Mover → **Verificar que NO entre en loop** ✓
3. Esperar llegada → Sacar → Retirar ✓
4. Seleccionar Bandeja 10 → Mover → **Verificar que NO entre en loop** ✓

Si en el paso 2 o 4 el motor se mueve sin detenerse, el fix de AutoMode no está aplicado correctamente. Verificar:

| Qué verificar | Archivo (ruta desde raíz) | Línea a buscar |
|---------------|---------------------------|----------------|
| Reset AutoMode (WinCC) | `wincc-scripts/02_Scr_Operacion/Script_Retirar.js` | `Tags("CMD_AutoMode").Write(false);` |
| Reset PosReached (WinCC) | `wincc-scripts/02_Scr_Operacion/Script_Mover.js` | `Tags("M0_2_PosReached").Write(false);` |
| Reset AutoMode (React) | `simulator-app/src/components/HMI/OperationPanel.tsx` | `updateTags({ M0_0_AutoMode: false });` |
| Reset AutoMode (Mock) | `plc-bridge/mockPlc.js` | `s.ST_AutoMode = false;` |
| Reset AutoMode (Processor) | `simulator-app/src/simulation/PLC/Processor.ts` | `newMarkers.M0_0_AutoMode = false;` |

---

## 10. Soporte y Referencia

### 10.1. Documentos del Proyecto

| Documento | Ruta desde raíz | Descripción |
|-----------|-----------------|-------------|
| Esta guía | `GUIA_INTEGRACION_AUTOMATIZADOR.md` | Referencia técnica completa |
| Opciones de despliegue | `OPCIONES_DE_DESPLIEGUE_FASECOL.md` | Costos, ventajas, recomendación |
| README plc-bridge | `plc-bridge/README.md` | Instrucciones detalladas Opción A |
| README WinCC | `wincc-scripts/README.md` | Instrucciones detalladas Opción B |
| README Simulator | `simulator-app/README.md` | Instrucciones detalladas Opción C |

### 10.2. Convenciones de Nombres

| Prefijo | Significado | Ejemplo | Dónde se usa |
|---------|------------|---------|--------------|
| `CMD_` | Comando (HMI → PLC) | `CMD_Start` | DB1 |
| `ST_` | Estado (PLC → HMI) | `ST_MotorRunning` | DB2 |
| `TEL_` | Telemetría (PLC → HMI) | `TEL_Torque` | DB2 |
| `INV_` | Inventario | `INV_Qty_5` | DB3 |
| `I0_` | Entrada digital | `I0_0_EStop` | %I |
| `Q_` | Salida digital | `Q_MotorOn` | %Q |
| `M0_` | Marca interna (simulador) | `M0_1_Moving` | Solo en simulación |

### 10.3. Resumen de Archivos por Prioridad

**Si solo tiene tiempo para revisar 5 archivos, lea estos:**

| # | Archivo (ruta desde raíz) | Por qué es crítico |
|---|---------------------------|-------------------|
| 1 | `plc-bridge/plcConnection.js` | Mapa completo de tags PLC con direcciones |
| 2 | `wincc-scripts/Tags_Import.csv` | Tags para importar directamente en WinCC |
| 3 | `plc-bridge/.env` | Configurar IP, modo, y puerto |
| 4 | `plc-bridge/server.js` | API REST y WebSocket completa |
| 5 | `wincc-scripts/02_Scr_Operacion/Script_Mover.js` | Referencia de lógica de operación |

---

*Documento preparado por: Equipo de Ingeniería ZASCA*  
*Fecha: Febrero 2026*  
*Versión del código: v2.0 — API Inventario + Reportes Excel (Feb 2026)*  
*Proyecto: Carrusel Paternoster ZASCA para FASECOL*
