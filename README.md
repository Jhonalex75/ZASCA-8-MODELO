# ZASCA — Carrusel Paternoster | Gemelo Digital & Automatización Industrial

> **Cliente:** FASECOL S.A.S  
> **Versión:** 3.0 | **Última actualización:** Marzo 2026  
> **Repositorio:** [github.com/Jhonalex75/ZASCA-8-MODELO](https://github.com/Jhonalex75/ZASCA-8-MODELO)

Sistema completo de **Gemelo Digital, Análisis Estructural, Automatización PLC y HMI** para el carrusel paternoster vertical ZASCA de 20 bandejas, con capacidad de carga de **1.200 N por bandeja**.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ZASCA — Stack Tecnológico                        │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────┐    ┌────────────────────┐ │
│  │  simulator-app  │    │  plc-bridge  │    │   wincc-scripts    │ │
│  │  React + Three.js│◄──►│  Node.js     │◄──►│   TIA Portal HMI  │ │
│  │  Gemelo Digital │    │  OPC-UA/S7   │    │   KTP700 / TP900   │ │
│  └─────────────────┘    └──────┬───────┘    └────────────────────┘ │
│                                │                                    │
│                    ┌───────────▼──────────┐                         │
│                    │  PLC Siemens S7-1200 │                         │
│                    │  Motor 5HP + VFD     │                         │
│                    │  Encoder + Sensores  │                         │
│                    └──────────────────────┘                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  docs/Analisis_Estructural_ZASCA.py  (Flask + FEA + 3D)    │   │
│  │  Dashboard Web: FEA Analítico · Transmisión · Visualización │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Repositorio

```
ZASCA-8-MODELO/
│
├── 📂 simulator-app/          ← Gemelo Digital React (HMI + 3D + PWA)
├── 📂 plc-bridge/             ← Middleware Node.js → PLC S7-1200
├── 📂 wincc-scripts/          ← Scripts JS para TIA Portal / WinCC
├── 📂 docs/                   ← Análisis Estructural, manuales, informes
├── 📂 modelo-mecanico/        ← Modelo 3D Inventor (planos PDF + SAT)
├── 📂 Informes/               ← Informes técnicos FASECOL (INF-ZAS-FAS-*)
│
├── GUIA_INTEGRACION_AUTOMATIZADOR.md      ← Guía completa de integración PLC↔HMI
├── MANUAL_TECNICO_INTEGRACION_Y_FISICO.md ← Manual de implementación física
├── OPCIONES_DE_DESPLIEGUE_FASECOL.md      ← Opciones de despliegue productivo
├── HOJA_DE_RUTA_IMPLEMENTACION_FISICA.md  ← Hoja de ruta física
│
├── Diagrama_Entradas_P001.png             ← Diagrama de cargas y entradas
├── Diagrama_Salidas_P002.png              ← Diagrama de reacciones
├── Distribuccion_Fuerzas_P002.png         ← Distribución de fuerzas
└── .gitignore
```

---

## 🚀 Módulos del Proyecto

### 1. `simulator-app/` — Gemelo Digital React

**Aplicación React + TypeScript + Three.js** que es el gemelo digital completo del carrusel.

| Característica | Detalle |
|---|---|
| Framework | React 19 + Vite 7 + TypeScript |
| Visualización 3D | Three.js 0.182 + React Three Fiber |
| Estado global | Zustand 5 |
| Comunicación PLC | Socket.IO client (WebSocket) |
| PWA | Instalable en tablets industriales |
| Puerto desarrollo | `http://localhost:5173` |

**Inicio rápido:**
```bash
cd simulator-app
npm install
npm run dev
```

📖 Ver [simulator-app/README.md](simulator-app/README.md) para documentación completa.

---

### 2. `plc-bridge/` — Middleware PLC

**Servidor Node.js** que conecta la interfaz React con el PLC Siemens S7-1200 via protocolo S7comm/RFC1006.

| Característica | Detalle |
|---|---|
| Protocolo | nodes7 (RFC 1006 / S7comm) |
| API REST | Puerto 3001 (Express) |
| Tiempo real | Socket.IO WebSocket (polling 100ms) |
| Modo mock | Simulación sin hardware PLC |
| Modo live | Conexión real S7-1200 |

**Inicio rápido:**
```bash
cd plc-bridge
npm install
npm start          # Modo mock (sin PLC)
```

**Configuración PLC real (`.env`):**
```env
MODE=live
PLC_IP=192.168.0.1
```

📖 Ver [plc-bridge/README.md](plc-bridge/README.md) para API completa, mapa de tags y diagnóstico.

---

### 3. `wincc-scripts/` — HMI Siemens WinCC

**Scripts JavaScript** listos para copiar-pegar en TIA Portal. Funcionalmente equivalentes al `simulator-app` pero ejecutándose directamente en el panel HMI Siemens.

| Pantalla | Carpeta | Función |
|---|---|---|
| Inicio / Estado | `01_Scr_Inicio/` | LEDs de estado, encoder, inicio de ciclo |
| Operación | `02_Scr_Operacion/` | Picking: Mover → Sacar → Retirar |
| Inventario | `03_Scr_Inventario/` | Búsqueda de referencias, colores por stock |
| Diagnóstico | `04_Scr_Diagnostico/` | Acceso nivel 2, contadores, estado |
| Template Global | `05_Template/` | Navegación + E-Stop global |
| Animación 2D | `06_Scr_Animacion/` | Vista esquemática del carrusel (100ms) |

**Paso 1 — Importar tags:**
```
TIA Portal → HMI → Tags → Importar → Tags_Import.csv
```
> El CSV incluye **67 tags** ST_*, CMD_*, TEL_*, INV_* y I/O.

📖 Ver [wincc-scripts/README.md](wincc-scripts/README.md) para estructura completa de objetos.

---

### 4. `docs/` — Análisis Estructural y Documentación Técnica

**Motor de análisis Python Flask** con FEA analítico, simulación de transmisión y visualización 3D WebGL.

| Archivo clave | Descripción |
|---|---|
| `Analisis_Estructural_ZASCA.py` | App Flask: FEA + Transmisión + 3D (3.170 líneas) |
| `Programacion_Completa_WinCC_HMI.md` | Referencia completa de programación WinCC |
| `Manual_Tecnico_Gemelo_Virtual.md` | Manual técnico del gemelo digital |
| `Codigo_Fuente_Siemens_SCL.md` | Código SCL para PLC S7-1200 |
| `functional_requirements.md` | Requisitos funcionales del sistema |
| `kinematics_and_physics_model.md` | Modelo cinemático y físico del paternoster |

**Ejecutar análisis estructural:**
```bash
cd docs
pip install flask numpy matplotlib
python Analisis_Estructural_ZASCA.py
# → http://localhost:5000
```

📖 Ver [docs/README.md](docs/README.md) para detalles del motor FEA y APIs.

---

### 5. `modelo-mecanico/` — Modelo 3D Mecánico (Autodesk Inventor)

**Diseño mecánico 3D completo** del carrusel paternoster ZASCA, modelado íntegramente en Autodesk Inventor Professional.

| Contenido | Descripción |
|---|---|
| Ensamble principal | `Conjunto_Carrusell_v1` — Modelo paramétrico completo |
| Plano P-001 | Plano general del conjunto (PDF) |
| Plano P-002 | Plano de detalle — cortes, secciones, tolerancias (PDF) |
| Archivo SAT | Formato de intercambio universal ACIS (~810 MB, externo) |

**Componentes principales del modelo:**

| Sub-ensamble | Función |
|---|---|
| Sistema Estructural | Frame principal, patas laterales, refuerzos transversales |
| Cadena y Sprockets | Transmisión DIN ISO 20A-1, paso 1.25", relación 3:1 |
| Ejes de transmisión | Eje principal Ø50.8mm SAE 1045, eje superior, eje acople |
| Bandejas y seguidores | 20 bandejas con seguidores, deslizadores y bocines |
| Guiado y sujeción | Rieles guía rectos/curvos, anillos, platinas, placas de anclaje |
| Motor-reductor | NORD SK 672.1, 7.5 kW, reductor corona 40:1 |

**Interoperabilidad:** El archivo SAT permite importar el modelo completo en SolidWorks, Fusion 360, FreeCAD, CATIA, NX, Creo y OnShape.

📖 Ver [modelo-mecanico/README.md](modelo-mecanico/README.md) para jerarquía de ensambles, materiales y guía de importación.

---

## ⚙️ Especificaciones Técnicas del Carrusel

| Parámetro | Valor |
|---|---|
| **Estructura** | Perfil DIN 100×50×6.3 mm, ASTM A36 |
| **Dimensiones** | 2.779 mm alto × 2.443 mm ancho × 946 mm prof. |
| **Capacidad** | 20 bandejas × 1.200 N carga viva |
| **Carga total** | 32 kN (diseño) |
| **Motor** | 5 HP @ 1.750 RPM |
| **Reductor** | Corona sin fin 40:1 (η = 0.85) |
| **Transmisión** | Cadena paso 20A-1 (1.25"), relación 3:1 |
| **Velocidad lineal** | ~0.15 m/s |
| **Encoder** | Rotativo en eje principal → posición 0–360° |
| **Factor de seguridad global** | FS ≥ 3.0 (fluencia, fatiga, pandeo) |

---

## 🔗 Flujo de Comunicación

```
Tablet/PC                PLC Bridge              PLC S7-1200
   │                         │                       │
   │ ← WebSocket (100ms) ─── │ ← S7comm RFC1006 ─── │
   │                         │  DB1: Comandos        │
   │                         │  DB2: Estado          │
   │                         │  DB3: Inventario      │
   │ ─ REST POST /select ─►  │ ─ Write DB1,INT0 ──►  │
```

---

## 📋 Inicio Rápido (Stack Completo)

```bash
# Terminal 1 — PLC Bridge (mock)
cd plc-bridge && npm install && npm start

# Terminal 2 — Gemelo Digital React
cd simulator-app && npm install && npm run dev

# Terminal 3 — Análisis Estructural (opcional)
cd docs && python Analisis_Estructural_ZASCA.py
```

Luego abrir:
- **Gemelo Digital:** http://localhost:5173 → pestaña **BRIDGE** → Conectar
- **Análisis Estructural:** http://localhost:5000

---

## 📄 Documentos Principales

| Documento | Descripción |
|---|---|
| [GUIA_INTEGRACION_AUTOMATIZADOR.md](GUIA_INTEGRACION_AUTOMATIZADOR.md) | Integración completa PLC ↔ HMI ↔ SCADA |
| [MANUAL_TECNICO_INTEGRACION_Y_FISICO_ZASCA.md](MANUAL_TECNICO_INTEGRACION_Y_FISICO_ZASCA.md) | Manual físico e implementación en sitio |
| [OPCIONES_DE_DESPLIEGUE_FASECOL.md](OPCIONES_DE_DESPLIEGUE_FASECOL.md) | Estrategias de despliegue productivo |
| [docs/Codigo_Fuente_Siemens_SCL.md](docs/Codigo_Fuente_Siemens_SCL.md) | Código SCL completo para TIA Portal |

---

## ⚠️ Notas Importantes

- **Fix del loop (Feb 2026):** Los handlers de picking resetean `M0_2_PosReached`, `M0_1_Moving` y `M0_0_AutoMode` entre ciclos. Sin estos resets, el segundo ciclo genera un bucle infinito. Implementado en `simulator-app`, `plc-bridge` y `wincc-scripts`.
- **Seguridad de red:** El `plc-bridge` no tiene autenticación. Debe operar en una VLAN industrial aislada.
- **PLC Access:** Habilitar PUT/GET en TIA Portal → Propiedades PLC → Protección.

---

## 👤 Autor

**Jhonalex75** — Ingeniería ZASCA / FASECOL S.A.S  
[github.com/Jhonalex75](https://github.com/Jhonalex75)
