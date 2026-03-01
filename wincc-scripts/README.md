# Scripts WinCC — Carrusel ZASCA
## Listos para copiar-pegar en TIA Portal

### Descripción

Estos scripts JavaScript son **funcionalmente equivalentes** a la interfaz React del Gemelo Digital. Están diseñados para WinCC Unified (Comfort/PC Runtime) y se ejecutan directamente en el panel HMI Siemens.

### Requisitos

- TIA Portal V17+ con WinCC
- Panel HMI: KTP700 Basic, TP900/1200 Comfort, o PC Runtime
- Conexión PLC ↔ HMI configurada (nombre: `PLC_S7_1200`)

---

### Paso 1 — Importar Tags

1. En TIA Portal: **HMI → Tags → Importar**
2. Seleccionar `Tags_Import.csv`
3. Verificar que la conexión se llama `PLC_S7_1200`

> Si el nombre de conexión es diferente, editar la columna `Connection` en el CSV antes de importar.

El CSV incluye **67 tags** organizados por función:
- `ST_*` — Estado del PLC (lectura)
- `CMD_*` — Comandos desde HMI (escritura)
- `TEL_*` — Telemetría (lectura)
- `INV_*` — Inventario de 20 bandejas
- `I0_*` / `Q_*` — Entradas/salidas digitales

---

### Paso 2 — Crear Pantallas y Vincular Scripts

Cada archivo `.js` se copia en el evento indicado del objeto correspondiente:

1. Abra la pantalla en WinCC
2. Seleccione el objeto (botón, pantalla, etc.)
3. Vaya a **Properties → Events**
4. Seleccione el trigger indicado (Press, Cyclic, OnLoaded, etc.)
5. Pegue el contenido del archivo `.js`

---

### Estructura de Archivos

```
wincc-scripts/
│
├── 01_Scr_Inicio/                      ← Pantalla de inicio / estado general
│   ├── Update_Status_Text.js           → Pantalla, Cíclico 500ms
│   ├── Btn_InicioCiclo_Press.js        → Btn_IniciarCiclo, Press
│   └── Animate_Tray_Position.js        → Rect_TrayIndicator, Cíclico 200ms
│
├── 02_Scr_Operacion/                   ← Pantalla de operación / picking
│   ├── Script_Mover.js                 → Btn_Mover, Press
│   ├── Script_Sacar.js                 → Btn_Sacar, Press
│   ├── Script_Retirar.js              → Btn_Retirar, Press
│   └── Update_Op_Status.js            → Pantalla, Cíclico 200ms
│
├── 03_Scr_Inventario/                  ← Pantalla de inventario / búsqueda
│   ├── Script_BuscarRef.js             → Btn_Buscar, Press
│   └── Update_Inventory_Colors.js      → Pantalla, Cíclico 2000ms
│
├── 04_Scr_Diagnostico/                 ← Pantalla de diagnóstico (restringida)
│   └── Check_Access_Level.js           → Pantalla, OnLoaded
│
├── 05_Template/                        ← Template global (todas las pantallas)
│   ├── Nav_Screens.js                  → Botones de navegación, Press
│   └── EStop_Global.js                 → Btn_EStop, Press / Cíclico 200ms
│
├── 06_Scr_Animacion/                   ← Pantalla de animación 2D del carrusel
│   └── Animate_Carousel.js             → Pantalla, Cíclico 100ms
│
├── Tags_Import.csv                     ← Tags para importar en TIA Portal
└── README.md                           ← Este archivo
```

---

### Equivalencia Script ↔ React

| Script WinCC | Función React | Archivo React |
|-------------|---------------|---------------|
| `Script_Mover.js` | `handleMove()` | `OperationPanel.tsx` |
| `Script_Sacar.js` | `handleExtract()` | `OperationPanel.tsx` |
| `Script_Retirar.js` | `handleRemove()` | `OperationPanel.tsx` |
| `Update_Op_Status.js` | Render automático | `OperationPanel.tsx` (JSX) |
| `Animate_Carousel.js` | Componente completo | `CarouselSchematicView.tsx` |
| `Nav_Screens.js` | Tabs de navegación | `HmiLayout.tsx` |
| `EStop_Global.js` | E-Stop toggle | `HmiLayout.tsx` |

---

### Objetos de Pantalla Requeridos

Los scripts referencian objetos por nombre. Crear estos objetos **con los nombres exactos**:

#### Pantalla `Scr_Operacion`

| Nombre | Tipo | Función |
|--------|------|---------|
| `Txt_Estado_Op` | Text Field | Muestra estado (texto + color) |
| `Btn_Mover` | Button | Ejecutar movimiento |
| `Btn_Sacar` | Button | Activar extracción |
| `Btn_Retirar` | Button | Confirmar retiro |

#### Pantalla `Scr_Animacion`

| Nombre | Tipo | Función |
|--------|------|---------|
| `Rect_Tray_0` a `Rect_Tray_6` | Rectangle | Bandejas visibles |
| `Rect_PickZone` | Rectangle | Zona de picking (cambia color) |
| `Txt_TrayLabel_0` a `Txt_TrayLabel_6` | Text Field | Número de bandeja |
| `Txt_PosActual` | Text Field | Posición en grados |

---

### Colores Estándar

```
0xFF0000  → Rojo      (Error, E-Stop, falla)
0xFF6600  → Naranja   (Advertencia, moviendo)
0xFFFF00  → Amarillo  (Espera)
0x00FF00  → Verde     (OK, conectado, posición)
0x00FFFF  → Cyan      (Información, completado)
0x808080  → Gris      (Inactivo)
```

---

### Notas Importantes

- **Fix del loop (Feb 2026):** `Script_Retirar.js` incluye `Tags("CMD_AutoMode").Write(false)` y `Script_Mover.js` incluye reset de `M0_2_PosReached` y `M0_1_Moving`. Sin estos resets, el segundo ciclo de picking genera un bucle infinito.
- **Animate_Carousel.js:** La zona de picking cambia a naranja durante movimiento y verde cuando está en posición.
- **Orden de pantallas:** Los números `01_` a `06_` indican el orden recomendado de navegación, no son obligatorios.
