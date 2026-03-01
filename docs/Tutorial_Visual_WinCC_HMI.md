# Tutorial Visual — Interfaz HMI WinCC para Carrusel ZASCA
## Panel KTP700 Basic (800×480 px) | TIA Portal V17+

> **¿Dónde puedo visualizar esta interfaz?**
>
> La interfaz WinCC se visualiza en **3 lugares**:
>
> | Opción | Herramienta | Requisito |
> |--------|-------------|-----------|
> | 🖥️ **Simulación en PC** | TIA Portal → *Simulate → WinCC RT Advanced* | Licencia TIA Portal V17+ |
> | 📱 **Panel físico** | Transferir desde TIA Portal al KTP700 | Panel + cable Ethernet |
> | 🌐 **Equivalente React** | Abrir `http://localhost:5173` | Ya está corriendo en su PC |
>
> La versión React que ya tiene corriendo es funcionalmente **idéntica** a lo que se verá en WinCC.

---

## Arquitectura: 5 Pantallas + 1 Template

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPLATE (siempre visible)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ZASCA v1.0       [●LED]            14:30:00            │   │ ← Header
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │           CONTENIDO DE PANTALLA (cambia)                 │   │ ← 800×400 px
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────┬──────┬──────┬──────┬──────┬────────────────────┐  │
│  │INICIO│ OPER │ INV  │ DIAG │ALARM │   🔴 E-STOP OK     │  │ ← Footer
│  └──────┴──────┴──────┴──────┴──────┴────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pantalla 1: INICIO (`Scr_Inicio`)

**Equivalente React:** Pestaña MAIN con indicadores LED + telemetría

### Vista de la Pantalla

```
┌──────────────────────────────────────────────────────────────────────┐
│  ZASCA v1.0           ● CONECTADO                      14:30:00    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌────────────────────── INDICADORES ─────────────────────────┐   │
│    │                                                             │   │
│    │   (🟢)        (🔵)        (🟡)        (🔵)        (⚫)    │   │
│    │  LISTO       MOTOR       FRENO       AUTO        FALLA     │   │
│    │                                                             │   │
│    └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│    ┌─── POSICIÓN ─────────┐  ┌─── TELEMETRÍA ──────────────────┐   │
│    │                       │  │                                  │   │
│    │   ╔═══════════════╗   │  │  Velocidad  ████████░░░  65.2%  │   │
│    │   ║   1854.5°     ║   │  │                                  │   │
│    │   ╚═══════════════╝   │  │  Torque:      12.3 Nm            │   │
│    │                       │  │  Corriente:    3.45 A            │   │
│    │   Target: 1200.0°    │  │  Temperatura:  42 °C             │   │
│    │                       │  │                                  │   │
│    └───────────────────────┘  └──────────────────────────────────┘   │
│                                                                      │
│    ┌─── SEMÁFORO ────┐   ┌────────────────────────────────────┐     │
│    │  🟢  🟡  🔴    │   │    ▶  INICIAR CICLO DE PRUEBA      │     │
│    │ Verde Amar Rojo │   │                                    │     │
│    └─────────────────┘   └────────────────────────────────────┘     │
│                                                                      │
├──────┬──────┬──────┬──────┬──────┬───────────────────────────────────┤
│INICIO│ OPER │ INV  │ DIAG │ALARM │          🔴 E-STOP OK            │
└──────┴──────┴──────┴──────┴──────┴───────────────────────────────────┘
```

### Instrucciones TIA Portal — Paso a paso:

1. **Crear pantalla:** `HMI → Screens → Add New Screen → "Scr_Inicio"`
2. **LEDs (5 círculos):**
   - Insertar `Circle` de 30×30 px por cada indicador
   - Propiedades → Animations → Appearance → BackColor → Dynamic
   - Vincular al tag correspondiente: `ST_SystemReady`, `ST_MotorRunning`, etc.
   - TRUE → color vivo (verde/azul/amarillo), FALSE → gris `RGB(100,100,100)`
3. **Posición:** Insertar `I/O Field` (Output) → Tag: `ST_EncoderPos` → Format: `#####.#°`
4. **Barra velocidad:** Insertar `Bar Graph` → Tag: `ST_VFD_Speed` → Min:0, Max:100
5. **Botón Iniciar:** Insertar `Button` → Events → Press → Script: `Btn_InicioCiclo_Press()`

---

## Pantalla 2: OPERACIÓN (`Scr_Operacion`) ⭐ Pantalla principal

**Equivalente React:** Pestaña OPER (picking de arneses)

### Vista de la Pantalla

```
┌──────────────────────────────────────────────────────────────────────┐
│  ZASCA v1.0           ● CONECTADO                      14:30:00    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌─── 1. SELECCIONAR BANDEJA ──────────────────────────────┐      │
│    │                                                          │      │
│    │    ┌──────────────────┐      ┌──────────────────────┐   │      │
│    │    │  ▼ BANDEJA  5    │      │     ▶  MOVER         │   │      │
│    │    └──────────────────┘      └──────────────────────┘   │      │
│    │     (Dropdown 0-19)          (Botón: disabled si          │     │
│    │                               isMoving||sensor||!estop)  │      │
│    └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│    ┌─── 2. ESTADO ───────────────────────────────────────────┐      │
│    │                                                          │      │
│    │    ✓ POSICION OK - SELECCIONE ARNESES                   │      │
│    │    ═══════════════════████████████     100%              │      │
│    │                                                          │      │
│    └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│    ┌─── 3. PICKING DE ARNESES ───────────────────────────────┐      │
│    │                                                          │      │
│    │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐ │      │
│    │   │REF A │ │REF B │ │REF C │ │REF D │ │REF E │ │ F  │ │      │
│    │   │ 🔴1  │ │ 🟢1  │ │ 🔵0  │ │ 🟡1  │ │ 🔵0  │ │ 0  │ │      │
│    │   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └────┘ │      │
│    │    (Botones toggle: fondo resaltado si seleccionado)     │      │
│    │                                                          │      │
│    │   ┌─────────────────┐         ┌────────────────────┐    │      │
│    │   │   📦  SACAR     │         │   ✓  RETIRAR       │    │      │
│    │   └─────────────────┘         └────────────────────┘    │      │
│    │                                                          │      │
│    └──────────────────────────────────────────────────────────┘      │
│                                                                      │
├──────┬──────┬──────┬──────┬──────┬───────────────────────────────────┤
│INICIO│ OPER │ INV  │ DIAG │ALARM │          🔴 E-STOP OK            │
└──────┴──────┴──────┴──────┴──────┴───────────────────────────────────┘
```

### Flujo de Operación (Máquina de Estados)

```
  ┌──────────┐    Btn_Mover     ┌──────────┐    PosReached     ┌──────────┐
  │          │ ───────────────► │          │ ────────────────► │          │
  │   IDLE   │                  │  MOVING  │                   │ ARRIVED  │
  │          │                  │          │                   │          │
  └──────────┘                  └──────────┘                   └─────┬────┘
       ▲                                                             │
       │                                                    Btn_Sacar│
       │                                                             ▼
       │                        ┌──────────┐    ReflexSensor  ┌──────────┐
       │                        │          │ ◄──────────────  │          │
       └────── Btn_Retirar ──── │ ARRIVED  │                  │EXTRACTED │
                                │          │                  │          │
                                └──────────┘                  └──────────┘
```

### Estados del Texto

| Estado | Texto en pantalla | Color | Botones habilitados |
|--------|-------------------|-------|---------------------|
| E-STOP | `E-STOP ACTIVO` | 🔴 Rojo | Ninguno |
| FALLA | `FALLA ACTIVA - RESETEAR PRIMERO` | 🔴 Rojo | Ninguno |
| IDLE | `ESPERANDO ORDEN...` | ⚫ Gris | MOVER |
| MOVING | `GIRANDO...` | 🟢 Verde | Ninguno |
| ARRIVED | `POSICION OK - SELECCIONE ARNESES` | 🟡 Amarillo | MOVER, SACAR |
| EXTRACTED | `BLOQUEADO - RETIRE LOS ARNESES` | 🟠 Naranja | RETIRAR |

### Instrucciones TIA Portal:

1. **Dropdown bandeja:** Insertar `Symbolic I/O` → Tag: `CMD_TargetTray` → Lista: BANDEJA 0...19
2. **Botón MOVER:** `Button` → Press → `Script_Mover()`
3. **Texto estado:** `Text Field` "Txt_Estado_Op" → actualizado por `Update_Op_Status()` (cíclico 200ms)
4. **Chips de referencia:** 6 × `Button` toggle con nombre `Btn_Ref_A`...`Btn_Ref_F`
5. **Botón SACAR:** Press → `Script_Sacar()`
6. **Botón RETIRAR:** Press → `Script_Retirar()`

---

## Pantalla 3: INVENTARIO (`Scr_Inventario`)

**Equivalente React:** Panel de inventario con grid de 20 bandejas

### Vista de la Pantalla

```
┌──────────────────────────────────────────────────────────────────────┐
│  ZASCA v1.0           ● CONECTADO                      14:30:00    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌─── BÚSQUEDA ────────────────────────────────────────────┐      │
│    │  [________________campo________________]   [ 🔍 BUSCAR ] │     │
│    │  Resultado: "ENCONTRADO EN BANDEJA 7"                    │      │
│    └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│    ┌─── INVENTARIO ── Página 1 de 2 ─────────────────────────┐      │
│    │  #  │ REFERENCIA        │ CANT │ MAX │ ESTADO            │      │
│    │─────┼───────────────────┼──────┼─────┼───────────────────│      │
│    │  0  │ ARN-MOT-001       │  15  │ 20  │ ████████░░ 75%   │      │
│    │  1  │ ARN-LUZ-002       │   8  │ 20  │ ████░░░░░░ 40%   │      │
│    │  2  │ ARN-SEN-003       │  20  │ 20  │ ██████████ 100%  │      │
│    │  3  │ ARN-COM-004       │   0  │ 20  │ ░░░░░░░░░░   0%  │      │
│    │  4  │ ARN-POT-005       │  12  │ 20  │ ██████░░░░  60%  │      │
│    │ ... │                   │      │     │                   │      │
│    │  9  │ ARN-CAB-010       │   5  │ 20  │ ██░░░░░░░░  25%  │      │
│    └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│    ┌── RESUMEN ──┐     ┌─────────────┐  ┌──────────────┐           │
│    │ Total: 243  │     │ ◄ Página 1  │  │  Página 2 ►  │           │
│    └─────────────┘     └─────────────┘  └──────────────┘           │
│                                                                      │
├──────┬──────┬──────┬──────┬──────┬───────────────────────────────────┤
│INICIO│ OPER │ INV  │ DIAG │ALARM │          🔴 E-STOP OK            │
└──────┴──────┴──────┴──────┴──────┴───────────────────────────────────┘
```

> **Nota:** El KTP700 Basic no tiene tabla nativa. Se implementa con **filas de objetos** (10 por página) y 2 sub-pantallas con botones de paginación.

---

## Pantalla 4: DIAGNÓSTICO (`Scr_Diagnostico`)

**Equivalente React:** Pestaña MAINT (IOMap + VFD)

### Vista de la Pantalla

```
┌──────────────────────────────────────────────────────────────────────┐
│  ZASCA v1.0           ● CONECTADO                      14:30:00    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─── ENTRADAS DIGITALES ─────────┐ ┌─── SALIDAS DIGITALES ───────┐│
│  │                                 │ │                              ││
│  │ %I0.0  E_Stop_Mush  [●  TRUE ] │ │ %Q0.0  Motor_On   [●  TRUE ]││
│  │ %I0.1  Btn_Start    [○ FALSE ] │ │ %Q0.1  Brake_Rel  [●  TRUE ]││
│  │ %I0.2  Btn_Stop     [●  TRUE ] │ │ %Q0.2  Ind_Run    [●  TRUE ]││
│  │ %I0.3  Reserva      [○ FALSE ] │ │ %Q0.3  Ind_Ready  [○ FALSE ]││
│  │ %I0.4  Door_Closed  [●  TRUE ] │ │ %Q0.6  Sem_Verde  [●  TRUE ]││
│  │ %I0.5  Safety_Curt  [●  TRUE ] │ │ %Q0.7  Sem_Amar   [○ FALSE ]││
│  │ %I0.6  Reflex_Sens  [○ FALSE ] │ │ %Q1.0  Sem_Rojo   [○ FALSE ]││
│  │                                 │ │                              ││
│  └─────────────────────────────────┘ └──────────────────────────────┘│
│                                                                      │
│  ┌─── VARIADOR DE FRECUENCIA (VFD) ─────────────────────────────┐  │
│  │  Sinamics V20 / G120C                                         │  │
│  │                                                                │  │
│  │  Frecuencia:  [═══════████░]  35.2 Hz                         │  │
│  │  Corriente:   [═══████░░░░░]   3.45 A                         │  │
│  │  Temperatura: [██░░░░░░░░░░]  42 °C  (🟢 Normal)              │  │
│  │                                                                │  │
│  │  P1120 (Accel): [ 5.0 ] s          P1121 (Decel): [ 3.0 ] s  │  │
│  │               🔒 Requiere nivel Mantenimiento                  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
├──────┬──────┬──────┬──────┬──────┬───────────────────────────────────┤
│INICIO│ OPER │ INV  │ DIAG │ALARM │          🔴 E-STOP OK            │
└──────┴──────┴──────┴──────┴──────┴───────────────────────────────────┘
```

---

## Pantalla 5: ALARMAS (`Scr_Alarmas`)

**Equivalente React:** Barra de alarmas

### Vista de la Pantalla

```
┌──────────────────────────────────────────────────────────────────────┐
│  ZASCA v1.0           ● CONECTADO                      14:30:00    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌─── ALARMAS ACTIVAS ─────────────────────────────────────┐      │
│    │  ⚠ 14:23:05  SOBRECARGA MOTOR - CORRIENTE > 8A          │      │
│    │  ⚠ 14:22:58  PUERTA DE SEGURIDAD ABIERTA                │      │
│    │                                                          │      │
│    │  (Se usa el objeto nativo "Alarm View" de WinCC)         │      │
│    └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│    ┌─── HISTORIAL ───────────────────────────────────────────┐      │
│    │  HORA     │ ALARMA                      │ ESTADO         │      │
│    │───────────┼─────────────────────────────┼────────────────│      │
│    │ 14:23:05  │ Sobrecarga Motor            │ 🔴 ACTIVA     │      │
│    │ 14:22:58  │ Puerta Abierta              │ 🔴 ACTIVA     │      │
│    │ 13:45:12  │ E-Stop Operador             │ 🟢 RESUELTA   │      │
│    │ 13:30:00  │ Temperatura VFD >80°C       │ 🟢 RESUELTA   │      │
│    │ 10:15:33  │ Sensor Reflex Bloqueado     │ 🟢 RESUELTA   │      │
│    └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│    ┌──────────────────┐    ┌─────────────────────────────────┐      │
│    │   RESET TODAS    │    │   ACK (Acusar Recibo)           │      │
│    └──────────────────┘    └─────────────────────────────────┘      │
│                                                                      │
├──────┬──────┬──────┬──────┬──────┬───────────────────────────────────┤
│INICIO│ OPER │ INV  │ DIAG │ALARM │          🔴 E-STOP OK            │
└──────┴──────┴──────┴──────┴──────┴───────────────────────────────────┘
```

---

## Template (Footer con E-STOP Toggle)

El botón E-STOP cambia de apariencia según su estado:

```
Estado NORMAL (E-Stop liberado):
┌────────────────────────────────────────────────────────────────┐
│INICIO│ OPER │ INV  │ DIAG │ALARM │   ┌───────────────────────┐│
│      │      │      │      │      │   │ 🔴 E-STOP OK          ││
│      │      │      │      │      │   │ (fondo gris oscuro)   ││
│      │      │      │      │      │   └───────────────────────┘│
└──────┴──────┴──────┴──────┴──────┴────────────────────────────┘

Estado ACTIVO (E-Stop presionado):
┌────────────────────────────────────────────────────────────────┐
│INICIO│ OPER │ INV  │ DIAG │ALARM │   ┌───────────────────────┐│
│      │      │      │      │      │   │ ⚠ EMERGENCY STOP      ││
│      │      │      │      │      │   │    ACTIVE              ││
│      │      │      │      │      │   │ (fondo ROJO pulsante) ││
│      │      │      │      │      │   └───────────────────────┘│
└──────┴──────┴──────┴──────┴──────┴────────────────────────────┘
```

---

## Tabla de Alarmas Configuradas

| ID | Texto | Trigger Tag | Clase |
|----|-------|-------------|-------|
| 1001 | E-STOP PRESIONADO | `I0_0_EStop` = FALSE | Error |
| 1002 | PUERTA ABIERTA | `I0_4_DoorClosed` = FALSE | Warning |
| 1003 | CORTINA ACTIVADA | `I0_5_SafetyCurtain` = FALSE | Warning |
| 1004 | SENSOR OBSTRUIDO | `I0_6_ReflexSensor` = TRUE | Warning |
| 1005 | FALLA GENERAL | `ST_SystemFault` = TRUE | Error |
| 1006 | SOBRECARGA MOTOR | `TEL_Current` > 8.0 A | Error |
| 1007 | TEMP MOTOR ALTA | `TEL_Temperature` > 80°C | Warning |
| 1008 | TEMP MOTOR CRÍTICA | `TEL_Temperature` > 95°C | Error |

---

## Guía Rápida: Crear Todo en TIA Portal

### Paso 1: Proyecto
```
TIA Portal → Nuevo Proyecto → Agregar HMI → SIMATIC KTP700 Basic PN
→ Conexión PLC: S7-1215C (192.168.0.1)
```

### Paso 2: Importar Tags
```
HMI → HMI Tags → Import → Seleccionar "Tags_Import.csv"
(El archivo CSV ya incluye los 67 tags listos para importar)
```

### Paso 3: Crear las 5 Pantallas
```
HMI → Screens → Add New Screen (×5)
Nombres: Scr_Inicio, Scr_Operacion, Scr_Inventario, Scr_Diagnostico, Scr_Alarmas
```

### Paso 4: Template (Header + Footer)
```
HMI → Screen Management → Template
→ Agregar Header (título + reloj + LED)
→ Agregar Footer (5 botones navegación + E-STOP)
```

### Paso 5: Scripts
```
Para cada pantalla, agregar los scripts desde wincc-scripts/:
  01_Scr_Inicio/     → Update_Status_Text, Btn_InicioCiclo_Press
  02_Scr_Operacion/  → Script_Mover, Update_Op_Status, Script_Sacar, Script_Retirar
  03_Scr_Inventario/ → Script_BuscarRef, Update_Inventory_Colors
  04_Scr_Diagnostico/→ Check_Access_Level
  05_Template/        → EStop_Global_Press, Nav_Inicio...Nav_Alarm
```

### Paso 6: Compilar y Transferir
```
Click derecho en HMI → Compile → Hardware and Software
Verificar: 0 Errors
Click derecho → Download to Device → Confirmar
```

---

## Archivos de Referencia

| Archivo | Ubicación | Contenido |
|---------|-----------|-----------|
| Guía completa | `docs/Programacion_Completa_WinCC_HMI.md` | 934 líneas, todo documentado |
| Tags CSV | `wincc-scripts/Tags_Import.csv` | 67 tags listos para importar |
| Scripts Inicio | `wincc-scripts/01_Scr_Inicio/` | 3 archivos JavaScript |
| Scripts Operación | `wincc-scripts/02_Scr_Operacion/` | 4 archivos JavaScript |
| Scripts Inventario | `wincc-scripts/03_Scr_Inventario/` | 2 archivos JavaScript |
| Scripts Diagnóstico | `wincc-scripts/04_Scr_Diagnostico/` | 1 archivo JavaScript |
| Scripts Template | `wincc-scripts/05_Template/` | 2 archivos JavaScript |
