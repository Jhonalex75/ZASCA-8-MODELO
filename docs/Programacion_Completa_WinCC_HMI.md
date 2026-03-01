# Programación Completa WinCC — Carrusel Vertical ZASCA
## Guía de Implementación para Panel KTP700 Basic (TIA Portal V17+)

> **Documento de referencia:** Traducción completa de la interfaz React (simulator-app) 
> al entorno Siemens WinCC Comfort/Unified para el panel KTP700 Basic (800×480 px).

---

## Índice de Contenidos

1. [Arquitectura de Pantallas](#1-arquitectura-de-pantallas)
2. [Tabla de Tags HMI ↔ PLC](#2-tabla-de-tags-hmi--plc)
3. [Pantalla 1: INICIO — Encabezado + Estado General](#3-pantalla-1-inicio)
4. [Pantalla 2: OPERACIÓN — Selección y Picking](#4-pantalla-2-operación)
5. [Pantalla 3: INVENTARIO — 20 Bandejas](#5-pantalla-3-inventario)
6. [Pantalla 4: DIAGNÓSTICO — I/O Map + VFD](#6-pantalla-4-diagnóstico)
7. [Pantalla 5: ALARMAS — Historial y Activas](#7-pantalla-5-alarmas)
8. [Scripts JavaScript WinCC](#8-scripts-javascript-wincc)
9. [Configuración de Alarmas](#9-configuración-de-alarmas)
10. [Plantilla de Pantalla (Template)](#10-plantilla-de-pantalla-template)
11. [Instrucciones de Importación en TIA Portal](#11-instrucciones-tia-portal)

---

## 1. Arquitectura de Pantallas

### Equivalencia React → WinCC

| # | React (Tab) | WinCC (Pantalla) | Resolución | Descripción |
|:--|:---|:---|:---|:---|
| 1 | MAIN (HmiLayout) | `Scr_Inicio` | 800×480 | Estado general, indicadores LED, botón inicio ciclo |
| 2 | OPER (OperationPanel) | `Scr_Operacion` | 800×480 | Selección de bandeja, MOVER, picking de arneses |
| 3 | — (InventoryPanel) | `Scr_Inventario` | 800×480 | Tabla de 20 bandejas con conteo y búsqueda |
| 4 | MAINT (IOMap + VFD) | `Scr_Diagnostico` | 800×480 | Mapa I/O digital + parámetros VFD |
| 5 | ALARM (AlarmBar) | `Scr_Alarmas` | 800×480 | Alarmas activas e historial |
| — | BRIDGE (PlcBridgePanel) | *(No aplica)* | — | No se necesita: el HMI se conecta directamente al PLC |

### Navegación Global (Template)

```
┌─────────────────────────────────────────────────┐
│  ZASCA v1.0          [LED STATUS]    12:30:00   │  ← Header (Template)
├─────────────────────────────────────────────────┤
│                                                 │
│              CONTENIDO DE PANTALLA              │  ← 800 × 400 px útiles
│              (Cambia según pantalla)            │
│                                                 │
├──────┬──────┬──────┬──────┬──────┬──────────────┤
│INICIO│ OPER │ INV  │ DIAG │ALARM │  [E-STOP]   │  ← Footer (Template)
└──────┴──────┴──────┴──────┴──────┴──────────────┘
```

---

## 2. Tabla de Tags HMI ↔ PLC

### 2.1 Tags de Lectura (PLC → HMI)

Estos tags se leen del PLC para mostrar estado en pantalla.

| Tag HMI | Dirección PLC | Tipo | Descripción | Pantalla |
|:---|:---|:---|:---|:---|
| `ST_EncoderPos` | `DB2.DBD0` | Real | Posición encoder (°) | Inicio, Oper |
| `ST_VFD_Speed` | `DB2.DBD4` | Real | Velocidad VFD (%) | Inicio, Diag |
| `ST_MotorRunning` | `DB2.DBX8.0` | Bool | Motor encendido | Inicio |
| `ST_BrakeReleased` | `DB2.DBX8.1` | Bool | Freno liberado | Inicio |
| `ST_SystemReady` | `DB2.DBX8.2` | Bool | Sistema listo | Inicio |
| `ST_SystemFault` | `DB2.DBX8.3` | Bool | Falla activa | Inicio, Alarm |
| `ST_AutoMode` | `DB2.DBX8.4` | Bool | Modo automático | Inicio |
| `ST_PosReached` | `DB2.DBX8.5` | Bool | Posición alcanzada | Oper |
| `TEL_Torque` | `DB2.DBD10` | Real | Torque (Nm) | Diag |
| `TEL_Current` | `DB2.DBD14` | Real | Corriente (A) | Diag |
| `TEL_Temperature` | `DB2.DBD18` | Real | Temperatura (°C) | Diag |
| `Q_MotorOn` | `%Q0.0` | Bool | Salida Motor | Diag (IO) |
| `Q_BrakeRelease` | `%Q0.1` | Bool | Salida Freno | Diag (IO) |
| `Q_Ind_Run` | `%Q0.2` | Bool | Indicador Marcha | Inicio |
| `Q_Ind_Ready` | `%Q0.3` | Bool | Indicador Listo | Inicio |
| `Q_Tower_Green` | `%Q0.6` | Bool | Semáforo Verde | Inicio |
| `Q_Tower_Yellow` | `%Q0.7` | Bool | Semáforo Amarillo | Inicio |
| `Q_Tower_Red` | `%Q1.0` | Bool | Semáforo Rojo | Inicio |

### 2.2 Tags de Escritura (HMI → PLC)

Estos tags los escribe el operador desde el HMI.

| Tag HMI | Dirección PLC | Tipo | Descripción | Pantalla |
|:---|:---|:---|:---|:---|
| `CMD_TargetTray` | `DB1.DBW0` | Int | Bandeja objetivo (0-19) | Oper |
| `CMD_Start` | `DB1.DBX4.0` | Bool | Comando START | Oper |
| `CMD_Stop` | `DB1.DBX4.1` | Bool | Comando STOP | Oper |
| `CMD_EStop` | `DB1.DBX4.2` | Bool | Comando E-STOP | Template |
| `CMD_Reset` | `DB1.DBX4.3` | Bool | Reset Fallas | Alarm |
| `CMD_AutoMode` | `DB1.DBX4.4` | Bool | Habilitar Auto | Oper |
| `CMD_SearchRef` | `DB1.DBB6` (String) | String[20] | Búsqueda referencia | Inv |
| `CMD_DoSearch` | `DB1.DBX28.0` | Bool | Ejecutar búsqueda | Inv |

### 2.3 Tags de Inventario (DB3)

Para cada bandeja (0-19), estructura repetida:

| Tag HMI | Dirección PLC | Tipo | Descripción |
|:---|:---|:---|:---|
| `INV_Tray[n]_Ref` | `DB3.DBB[n*30]` | String[20] | Referencia de bandeja n |
| `INV_Tray[n]_Qty` | `DB3.DBW[n*30+22]` | Int | Cantidad actual |
| `INV_Tray[n]_Max` | `DB3.DBW[n*30+24]` | Int | Capacidad máxima |
| `INV_Tray[n]_Status` | `DB3.DBW[n*30+26]` | Int | 0=vacía, 1=parcial, 2=llena |

> **Nota:** `n` va de 0 a 19. Ejemplo: Bandeja 5 → `DB3.DBB150` (5×30=150).

---

## 3. Pantalla 1: INICIO (`Scr_Inicio`)

**Equivalente React:** `HmiLayout.tsx` (pestaña MAIN) + header + `TelemetryPanel.tsx`

### Layout (800 × 400 px área útil)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌───────────────────────────────────────────────────────┐  │
│   │        INDICADORES LED (5 círculos)                   │  │
│   │  (●)LISTO  (●)MOTOR  (●)FRENO  (●)AUTO  (●)FALLA    │  │
│   └───────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌────────────────────┐  ┌────────────────────────────────┐ │
│   │  POSICIÓN           │  │  BARRA DE VELOCIDAD            │ │
│   │  ┌───────────────┐  │  │  ████████░░░░░  65.2%          │ │
│   │  │   1854.5°      │  │  │                                │ │
│   │  └───────────────┘  │  │  TORQUE: 12.3 Nm                │ │
│   │  TARGET: 1200.0°   │  │  CORRIENTE: 3.45 A              │ │
│   │                     │  │  TEMP: 42°C                     │ │
│   └────────────────────┘  └────────────────────────────────┘ │
│                                                              │
│   ┌───────────────────────────────────────────────────────┐  │
│   │  SEMÁFORO:  🟢Verde  🟡Amarillo  🔴Rojo               │  │
│   │  ESTADO:  "LISTO PARA PICKING"                        │  │
│   └───────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌───────────────────────────────────────┐                  │
│   │     ▶  INICIAR CICLO DE PRUEBA        │                  │
│   └───────────────────────────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### Objetos WinCC

| # | Objeto WinCC | Nombre | Tag Asociado | Propiedades |
|:--|:---|:---|:---|:---|
| 1 | Circle | `Led_Listo` | `ST_SystemReady` | BackColor: Verde si TRUE, Gris si FALSE |
| 2 | Circle | `Led_Motor` | `ST_MotorRunning` | BackColor: Cyan si TRUE, Gris |
| 3 | Circle | `Led_Freno` | `ST_BrakeReleased` | BackColor: Amarillo si TRUE, Gris |
| 4 | Circle | `Led_Auto` | `ST_AutoMode` | BackColor: Azul si TRUE, Gris |
| 5 | Circle | `Led_Falla` | `ST_SystemFault` | BackColor: **Rojo parpadeante** si TRUE |
| 6 | I/O Field | `IO_Posicion` | `ST_EncoderPos` | Output, format "#####.#°", Font 24pt |
| 7 | I/O Field | `IO_Velocidad` | `ST_VFD_Speed` | Output, format "###.#%" |
| 8 | Bar Graph | `Bar_Velocidad` | `ST_VFD_Speed` | Min:0, Max:100, Color Verde |
| 9 | I/O Field | `IO_Torque` | `TEL_Torque` | Output, "##.# Nm" |
| 10 | I/O Field | `IO_Corriente` | `TEL_Current` | Output, "#.## A" |
| 11 | I/O Field | `IO_Temperatura` | `TEL_Temperature` | Output, "##°C" |
| 12 | Circle | `Sem_Verde` | `Q_Tower_Green` | Animación color |
| 13 | Circle | `Sem_Amarillo` | `Q_Tower_Yellow` | Animación color |
| 14 | Circle | `Sem_Rojo` | `Q_Tower_Red` | Animación color |
| 15 | Text Field | `Txt_Estado` | — | Controlado por Script |
| 16 | Button | `Btn_InicioCiclo` | — | Evento Press → Script |

### Animaciones (Properties → Animations)

```
Led_Listo:
  - Appearance → BackColor → Dynamic
  - Tag: ST_SystemReady
  - TRUE  → RGB(0, 255, 0)     // Verde vivo
  - FALSE → RGB(100, 100, 100)  // Gris

Led_Falla:
  - Tag: ST_SystemFault
  - TRUE  → RGB(255, 0, 0) + Flashing = Enabled (500ms)
  - FALSE → RGB(100, 100, 100)

Bar_Velocidad:
  - Process → Tag: ST_VFD_Speed
  - Lower Limit: 0
  - Upper Limit: 100
  - Bar Color: RGB(0, 200, 0)
  - Segments: Gradient Green → Yellow → Red
```

### Script: Actualizar Texto de Estado
**Trigger:** Cíclico 500ms o `OnTagChange` de `ST_SystemFault`, `ST_MotorRunning`, `ST_SystemReady`

```javascript
// WinCC Unified JavaScript
// Función: Update_Status_Text
// Asociar a: Screen → Events → Cyclic (500ms)

function Update_Status_Text() {
    var isFault  = Tags("ST_SystemFault").Read();
    var isMoving = Tags("ST_MotorRunning").Read();
    var isReady  = Tags("ST_SystemReady").Read();
    var posOK    = Tags("ST_PosReached").Read();

    var txt = Screen.Items("Txt_Estado");
    var circle = Screen.Items("Led_Estado_General");

    if (isFault) {
        txt.Text = "⚠ FALLA - SISTEMA DETENIDO";
        txt.ForeColor = 0xFF0000;
        if (circle) circle.BackColor = 0xFF0000;
    } else if (isMoving) {
        txt.Text = "▶ MOVIENDO BANDEJA...";
        txt.ForeColor = 0x00FF00;
        if (circle) circle.BackColor = 0x00FF00;
    } else if (posOK) {
        txt.Text = "✓ POSICIÓN ALCANZADA - LISTO";
        txt.ForeColor = 0xFFFF00;
        if (circle) circle.BackColor = 0xFFFF00;
    } else if (isReady) {
        txt.Text = "● SISTEMA LISTO";
        txt.ForeColor = 0x00FFFF;
        if (circle) circle.BackColor = 0x00FFFF;
    } else {
        txt.Text = "○ APAGADO / MANUAL";
        txt.ForeColor = 0x808080;
        if (circle) circle.BackColor = 0x808080;
    }
}
```

### Script: Botón Iniciar Ciclo
**Trigger:** `Btn_InicioCiclo` → Events → Press

```javascript
// WinCC Unified JavaScript
// Función: Btn_InicioCiclo_Press

function Btn_InicioCiclo_Press() {
    // Verificar seguridades antes de arrancar
    var isFault = Tags("ST_SystemFault").Read();
    
    if (isFault) {
        // Mostrar ventana de advertencia
        HMIRuntime.Trace("ERROR: Intento de arranque con falla activa");
        return;
    }
    
    // Habilitar modo automático + enviar START
    Tags("CMD_AutoMode").Write(true);
    Tags("CMD_Start").Write(true);
    
    // Auto-reset del pulso START después de 200ms
    HMIRuntime.SetTimeout(function() {
        Tags("CMD_Start").Write(false);
    }, 200);
}
```

---

## 4. Pantalla 2: OPERACIÓN (`Scr_Operacion`)

**Equivalente React:** `OperationPanel.tsx` — el flujo MOVER → SACAR → RETIRAR

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌─ 1. SELECCIONAR BANDEJA ────────────────────────────┐   │
│   │                                                      │   │
│   │   [▼ BANDEJA 1  ▼]         [ MOVER → ]              │   │
│   │                                                      │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─ 2. ESTADO ─────────────────────────────────────────┐   │
│   │   "GIRANDO..."  /  "POSICIÓN OK"  /  "BLOQUEADO"    │   │
│   │   [═══════════████░░░░░░░░░░]  65%                   │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌─ 3. PICKING DE ARNESES ─────────────────────────────┐   │
│   │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │   │
│   │   │REF A │ │REF B │ │REF C │ │REF D │ │REF E │     │   │
│   │   │ 15ud │ │  8ud │ │ 20ud │ │  0ud │ │ 12ud │     │   │
│   │   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │   │
│   │                                                      │   │
│   │   [ SACAR (2) ]              [ RETIRAR ]             │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Objetos WinCC

| # | Objeto | Nombre | Tag / Acción |
|:--|:---|:---|:---|
| 1 | Symbolic I/O | `Sel_Bandeja` | Input, Tag: `CMD_TargetTray`, Lista: "BANDEJA 0"…"BANDEJA 19" |
| 2 | Button | `Btn_Mover` | Press → `Script_Mover()` |
| 3 | Text Field | `Txt_Estado_Op` | Controlado por script |
| 4 | Bar Graph | `Bar_Progreso` | Tag: variante de distancia calculada |
| 5-9 | Button (×5) | `Btn_Ref_A`…`Btn_Ref_E` | Toggle visual + selección |
| 10 | Button | `Btn_Sacar` | Press → `Script_Sacar()` |
| 11 | Button | `Btn_Retirar` | Press → `Script_Retirar()` |

### Script: Botón MOVER
```javascript
// WinCC Unified JavaScript
// Función: Script_Mover (Equivale a OperationPanel.handleMove)
// Trigger: Btn_Mover → Events → Press
// Condiciones: disabled = isMoving || reflexSensor || !estopOk

function Script_Mover() {
    var trayId = Tags("CMD_TargetTray").Read(); // 0-19

    // ─── Validaciones (mismas que React) ───
    var estopOk = Tags("I0_0_EStop").Read();
    if (!estopOk) {
        Screen.Items("Txt_Estado_Op").Text = "E-STOP ACTIVO - LIBERAR PRIMERO";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF0000;
        return;
    }

    var isFault = Tags("ST_SystemFault").Read();
    if (isFault) {
        Screen.Items("Txt_Estado_Op").Text = "FALLA ACTIVA - RESETEAR PRIMERO";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF0000;
        return;
    }

    var isMoving = Tags("ST_MotorRunning").Read();
    if (isMoving) {
        Screen.Items("Txt_Estado_Op").Text = "ESPERE: MOTOR EN MOVIMIENTO";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFFFF00;
        return;
    }

    var sensor = false;
    try { sensor = Tags("I0_6_ReflexSensor").Read(); } catch(e) {}
    if (sensor) {
        Screen.Items("Txt_Estado_Op").Text = "RETIRE EL ARNES ANTES DE MOVER";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF6600;
        return;
    }

    // ─── Habilitar modo automático + Enviar START ───
    Tags("CMD_AutoMode").Write(true);
    Tags("CMD_Start").Write(true);
    HMIRuntime.SetTimeout(function() {
        Tags("CMD_Start").Write(false);
    }, 200);

    // ─── Feedback visual ───
    Screen.Items("Txt_Estado_Op").Text = "GIRANDO HACIA BANDEJA " + trayId + "...";
    Screen.Items("Txt_Estado_Op").ForeColor = 0x00FF00;
    Screen.Items("Btn_Mover").Enabled = false;
    Screen.Items("Btn_Sacar").Enabled = false;
    Screen.Items("Btn_Retirar").Enabled = false;
}
```

### Script: Estado de Operación — Máquina de Estados (Cíclico 200ms)
```javascript
// WinCC Unified JavaScript  
// Función: Update_Op_Status
// Trigger: Cíclico 200ms
// Máquina de estados: IDLE → MOVING → ARRIVED → EXTRACTED → ARRIVED

function Update_Op_Status() {
    var isMoving = Tags("ST_MotorRunning").Read();
    var posOK    = Tags("ST_PosReached").Read();
    var isFault  = Tags("ST_SystemFault").Read();
    var estopOk  = Tags("I0_0_EStop").Read();
    var sensor   = false;
    try { sensor = Tags("I0_6_ReflexSensor").Read(); } catch(e) {}

    var txt        = Screen.Items("Txt_Estado_Op");
    var btnMover   = Screen.Items("Btn_Mover");
    var btnSacar   = Screen.Items("Btn_Sacar");
    var btnRetirar = Screen.Items("Btn_Retirar");

    if (!estopOk) {
        txt.Text = "E-STOP ACTIVO";
        txt.ForeColor = 0xFF0000;
        btnMover.Enabled = false;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;
    } else if (isFault) {
        txt.Text = "FALLA ACTIVA - RESETEAR PRIMERO";
        txt.ForeColor = 0xFF0000;
        btnMover.Enabled = false;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;
    } else if (sensor) {
        txt.Text = "BLOQUEADO - RETIRE LOS ARNESES";
        txt.ForeColor = 0xFF6600;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = true;
        btnMover.Enabled = false;
    } else if (isMoving && !posOK) {
        txt.Text = "GIRANDO...";
        txt.ForeColor = 0x00FF00;
        btnMover.Enabled = false;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;
    } else if (posOK) {
        txt.Text = "POSICION OK - SELECCIONE ARNESES";
        txt.ForeColor = 0xFFFF00;
        btnMover.Enabled = true;
        btnSacar.Enabled = true;
        btnRetirar.Enabled = false;
    } else {
        txt.Text = "ESPERANDO ORDEN...";
        txt.ForeColor = 0x808080;
        btnMover.Enabled = true;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;
    }
}
```

### Script: Botón SACAR
```javascript
// Función: Script_Sacar — Equivale a handleExtract()
// REQUISITOS: posOK = true, sin falla activa
function Script_Sacar() {
    var posOK = Tags("ST_PosReached").Read();
    if (!posOK) {
        Screen.Items("Txt_Estado_Op").Text = "ESPERE A QUE LLEGUE A POSICION";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF6600;
        return;
    }

    // Activar sensor reflex → bloquea motor
    Tags("I0_6_ReflexSensor").Write(true);
    // Enviar STOP por seguridad adicional
    Tags("CMD_Stop").Write(true);
    HMIRuntime.SetTimeout(function() { Tags("CMD_Stop").Write(false); }, 200);

    Screen.Items("Txt_Estado_Op").Text = "SACANDO ARNES... NO MUEVA LA BANDEJA";
    Screen.Items("Txt_Estado_Op").ForeColor = 0xFFFF00;
    Screen.Items("Btn_Sacar").Enabled = false;
    Screen.Items("Btn_Retirar").Enabled = true;
    Screen.Items("Btn_Mover").Enabled = false;
}
```

### Script: Botón RETIRAR
```javascript
// Función: Script_Retirar — Equivale a handleRemove()
// REQUISITOS: sensor reflex activo (pickStep == EXTRACTED)
function Script_Retirar() {
    var sensor = false;
    try { sensor = Tags("I0_6_ReflexSensor").Read(); } catch(e) {}
    if (!sensor) {
        Screen.Items("Txt_Estado_Op").Text = "NADA QUE RETIRAR";
        return;
    }

    // Limpiar sensor → permite mover de nuevo
    Tags("I0_6_ReflexSensor").Write(false);

    // Descontar inventario (el FB del PLC descuenta automáticamente)
    Tags("CMD_InventoryDecrement").Write(true);
    HMIRuntime.SetTimeout(function() {
        Tags("CMD_InventoryDecrement").Write(false);
    }, 200);

    Screen.Items("Txt_Estado_Op").Text = "RETIRADO - INVENTARIO ACTUALIZADO";
    Screen.Items("Txt_Estado_Op").ForeColor = 0x00FFFF;
    Screen.Items("Btn_Sacar").Enabled = true;
    Screen.Items("Btn_Retirar").Enabled = false;
    Screen.Items("Btn_Mover").Enabled = true;
}
```

---

## 5. Pantalla 3: INVENTARIO (`Scr_Inventario`)

**Equivalente React:** `InventoryPanel.tsx` — grid de 20 bandejas con búsqueda

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ┌─ BÚSQUEDA ────────────────────────────────────────────┐  │
│  │  [______campo de texto______]    [ 🔍 BUSCAR ]        │  │
│  │  Resultado: "ENCONTRADO EN BANDEJA 7"                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ INVENTARIO ──────────────────────────────────────────┐  │
│  │  #  │ REFERENCIA      │ CANT │ MAX │ ESTADO           │  │
│  │─────┼─────────────────┼──────┼─────┼──────────────────│  │
│  │  0  │ ARN-MOT-001     │  15  │ 20  │ ████████░░ 75%   │  │
│  │  1  │ ARN-LUZ-002     │   8  │ 20  │ ████░░░░░░ 40%   │  │
│  │  2  │ ARN-SEN-003     │  20  │ 20  │ ██████████ 100%  │  │
│  │  3  │ ARN-COM-004     │   0  │ 20  │ ░░░░░░░░░░  0%   │  │
│  │  4  │ ...             │  ... │ ... │ ...              │  │
│  │ ... │                 │      │     │                  │  │
│  │ 19  │ ARN-XXX-020     │  12  │ 20  │ ██████░░░░ 60%   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ RESUMEN ─────────────────────────────────────────────┐  │
│  │  Total Items: 243  │  Bandejas Vacías: 2  │  Llenas: 5│  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Implementación en WinCC: Dos Opciones

#### Opción A: Tabla Manual (KTP700 Basic — Recomendada)

El KTP700 Basic **no tiene** objeto tabla nativo. Se implementa con filas de objetos:

Para cada bandeja (0 a 19), crear una fila con:

| Objeto | Nombre | Tag |
|:---|:---|:---|
| Text Field | `Txt_Tray_N_Num` | Texto estático "N" |
| I/O Field | `IO_Tray_N_Ref` | `INV_Tray[N]_Ref` (Output) |
| I/O Field | `IO_Tray_N_Qty` | `INV_Tray[N]_Qty` (Output) |
| I/O Field | `IO_Tray_N_Max` | `INV_Tray[N]_Max` (Output) |
| Bar Graph | `Bar_Tray_N` | `INV_Tray[N]_Qty` (Max = `INV_Tray[N]_Max`) |

> **Tip:** Como la pantalla KTP700 es de **480 px de alto**, no caben 20 filas en una pantalla.
> Se recomiendan **2 sub-pantallas**:
> - `Scr_Inv_Page1` → Bandejas 0-9
> - `Scr_Inv_Page2` → Bandejas 10-19
> - Botones `[◀ Pág 1]` `[Pág 2 ▶]` para navegar

#### Opción B: Recipe View (WinCC Comfort/Unified)

Si usa WinCC Comfort o Unified (no Basic), puede usar el **Recipe View** nativo que permite tablas dinámicas vinculadas a Data Records del PLC.

### Script: Búsqueda de Referencia
```javascript
// WinCC Unified JavaScript
// Función: Script_BuscarRef
// Trigger: Btn_Buscar → Events → Press

function Script_BuscarRef() {
    var searchText = Screen.Items("IO_Search_Field").ProcessValue;
    
    if (!searchText || searchText.length === 0) {
        Screen.Items("Txt_Resultado").Text = "⚠ Ingrese una referencia";
        return;
    }
    
    // Escribir al PLC para búsqueda
    Tags("CMD_SearchRef").Write(searchText);
    Tags("CMD_DoSearch").Write(true);
    
    // Reset pulso
    HMIRuntime.SetTimeout(function() {
        Tags("CMD_DoSearch").Write(false);
        
        // Leer resultado del PLC
        var foundId = Tags("Q_Found_Tray_ID").Read();
        var info = Tags("Q_Ref_Info").Read();
        
        if (foundId >= 0) {
            Screen.Items("Txt_Resultado").Text = "✓ " + info;
            Screen.Items("Txt_Resultado").ForeColor = 0x00FF00;
            // Resaltar la fila encontrada
            Highlight_Tray_Row(foundId);
        } else {
            Screen.Items("Txt_Resultado").Text = "✗ REFERENCIA NO ENCONTRADA";
            Screen.Items("Txt_Resultado").ForeColor = 0xFF0000;
        }
    }, 600);
}

function Highlight_Tray_Row(trayId) {
    // Resetear colores de todas las filas
    for (var i = 0; i < 20; i++) {
        var rowName = "Rect_Row_" + i;
        try {
            Screen.Items(rowName).BackColor = (i % 2 === 0) ? 0x1E1E1E : 0x2D2D2D;
        } catch(e) {}
    }
    // Resaltar la fila encontrada
    try {
        Screen.Items("Rect_Row_" + trayId).BackColor = 0x004400;
    } catch(e) {}
}
```

---

## 6. Pantalla 4: DIAGNÓSTICO (`Scr_Diagnostico`)

**Equivalente React:** `IOMap.tsx` + `VfdPanel.tsx`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌─ ENTRADAS DIGITALES ─────┐  ┌─ SALIDAS DIGITALES ────┐ │
│   │ %I0.0 E_Stop     [TRUE ] │  │ %Q0.0 Motor_On  [TRUE ] │ │
│   │ %I0.1 Btn_Start  [FALSE] │  │ %Q0.1 Brake_Rel [TRUE ] │ │
│   │ %I0.2 Btn_Stop   [TRUE ] │  │ %Q0.2 Ind_Run   [TRUE ] │ │
│   │ %I0.3 Reserva    [FALSE] │  │ %Q0.3 Ind_Ready [FALSE] │ │
│   │ %I0.4 Door       [TRUE ] │  │ %Q0.6 Sem_Verde [TRUE ] │ │
│   │ %I0.5 Curtain    [TRUE ] │  │ %Q0.7 Sem_Amar  [FALSE] │ │
│   │ %I0.6 Reflex     [FALSE] │  │ %Q1.0 Sem_Rojo  [FALSE] │ │
│   └──────────────────────────┘  └──────────────────────────┘ │
│                                                              │
│   ┌─ VARIADOR DE FRECUENCIA (VFD) ──────────────────────┐   │
│   │  MODELO: Sinamics V20 / G120C                        │   │
│   │                                                       │   │
│   │  Frecuencia:  [═══════████░]  35.2 Hz                │   │
│   │  Corriente:   [═══████░░░░░]   3.45 A                │   │
│   │  Temperatura: [██░░░░░░░░░░]  42 °C                  │   │
│   │                                                       │   │
│   │  P1120 (Accel): [ 5.0 ] s     P1121 (Decel): [ 3.0 ] s│  │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Objetos WinCC: Mapa I/O

Para cada señal digital, usar un par de objetos:

| Objeto | Propiedades |
|:---|:---|
| Text Field | Texto estático: "%I0.0 E_Stop_Mush" |
| I/O Field (Output) | Tag: `I0_0_EStop`, Formato: BOOL, BackColor dinámico |

**Animación de color para indicadores Bool:**
```
Appearance → BackColor:
  - Tag: [tag correspondiente]
  - TRUE  → Verde (0x00CC00)
  - FALSE → Gris oscuro (0x333333)
  
Appearance → ForeColor:
  - TRUE  → Blanco (0xFFFFFF), Text: "TRUE"
  - FALSE → Gris (0x666666), Text: "FALSE"
```

### Objetos WinCC: Panel VFD

| # | Objeto | Nombre | Tag |
|:--|:---|:---|:---|
| 1 | Bar Graph | `Bar_VFD_Freq` | `ST_VFD_Speed` (0-50 Hz) |
| 2 | I/O Field | `IO_VFD_Freq` | `ST_VFD_Speed` |
| 3 | Bar Graph | `Bar_VFD_Current` | `TEL_Current` (0-10 A) |
| 4 | I/O Field | `IO_VFD_Current` | `TEL_Current` |
| 5 | Bar Graph | `Bar_VFD_Temp` | `TEL_Temperature` (0-100 °C) |
| 6 | I/O Field | `IO_VFD_Temp` | `TEL_Temperature` |
| 7 | I/O Field | `IO_P1120` | `VFD_P1120_AccTime` (Input/Output) |
| 8 | I/O Field | `IO_P1121` | `VFD_P1121_DecTime` (Input/Output) |

**Barra de Temperatura con colores de alerta:**
```
Bar_VFD_Temp:
  - Segment 1: 0-60°C  → Verde
  - Segment 2: 60-80°C → Amarillo  
  - Segment 3: 80-100°C → Rojo
```

---

## 7. Pantalla 5: ALARMAS (`Scr_Alarmas`)

**Equivalente React:** AlarmBar + panel de alarmas

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌─ ALARMAS ACTIVAS ────────────────────────────────────┐  │
│   │  ⚠ 14:23:05  SOBRECARGA MOTOR - CORRIENTE > 8A       │  │
│   │  ⚠ 14:22:58  PUERTA ABIERTA                          │  │
│   │                                                       │  │
│   │  (vacío si no hay alarmas)                            │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌─ HISTORIAL ──────────────────────────────────────────┐  │
│   │  HORA     │ ALARMA                    │ ESTADO        │  │
│   │ 14:23:05  │ Sobrecarga Motor          │ ACTIVA        │  │
│   │ 14:22:58  │ Puerta Abierta            │ ACTIVA        │  │
│   │ 13:45:12  │ E-Stop Operador           │ RESUELTA      │  │
│   │ 13:30:00  │ Temperatura VFD >80°C     │ RESUELTA      │  │
│   │ 10:15:33  │ Sensor Reflex Bloqueado   │ RESUELTA      │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌──────────────────┐  ┌────────────────────────────────┐  │
│   │  RESET TODAS     │  │  ACK (Acusar recibo)           │  │
│   └──────────────────┘  └────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Implementación: WinCC Alarm View

WinCC tiene un objeto nativo **Alarm View** que maneja todo automáticamente:

**Configuración en TIA Portal:**
1. Ir a **HMI → HMI Alarms** (o Discrete Alarms para Comfort)
2. Crear las alarmas según tabla abajo
3. Arrastrar el objeto **Alarm View** a la pantalla

### Alternativa: Alarm Indicator (Popup)
Para Basic, agregar un **Alarm Indicator** en el Template que se muestre siempre.

---

## 8. Configuración de Alarmas

### Tabla de Alarmas Discretas

| # | ID | Texto de Alarma | Tag Trigger | Clase | Acción |
|:--|:---|:---|:---|:---|:---|
| 1 | 1001 | E-STOP PRESIONADO — SISTEMA DETENIDO | `I0_0_EStop` = FALSE | Error | Detener motor |
| 2 | 1002 | PUERTA DE SEGURIDAD ABIERTA | `I0_4_DoorClosed` = FALSE | Warning | Detener motor |
| 3 | 1003 | CORTINA DE SEGURIDAD ACTIVADA | `I0_5_SafetyCurtain` = FALSE | Warning | Detener motor |
| 4 | 1004 | SENSOR REFLEX OBSTRUIDO | `I0_6_ReflexSensor` = TRUE | Warning | Bloquear picking |
| 5 | 1005 | FALLA GENERAL DEL SISTEMA | `ST_SystemFault` = TRUE | Error | — |
| 6 | 1006 | SOBRECARGA DE MOTOR — CORRIENTE ALTA | `TEL_Current` > 8.0 | Error | — |
| 7 | 1007 | TEMPERATURA MOTOR ALTA (>80°C) | `TEL_Temperature` > 80 | Warning | — |
| 8 | 1008 | TEMPERATURA MOTOR CRÍTICA (>95°C) | `TEL_Temperature` > 95 | Error | — |
| 9 | 1009 | POSICIÓN NO ALCANZADA (TIMEOUT 30s) | `M_PosTimeout` = TRUE | Error | — |
| 10 | 1010 | VARIADOR EN FALLO | `VFD_Fault` = TRUE | Error | — |

### En TIA Portal: Pasos para crear

```
1. Project Tree → [Nombre HMI] → HMI Alarms
2. Click "Discrete Alarms" (pestaña)
3. Para cada alarma de la tabla:
   a. Doble-click en fila vacía
   b. ID: [según tabla]
   c. Alarm Text: [según tabla]
   d. Trigger Tag: [tag PLC]
   e. Trigger Mode: On Rising Edge / On Bit Set
   f. Alarm Class: Error / Warning
   g. Acknowledgment: Requires acknowledgment ✓
```

---

## 9. Plantilla de Pantalla (Template)

El Template es una **capa fija** que aparece en todas las pantallas.

### Objetos del Template

| # | Objeto | Nombre | Posición (x,y) | Tamaño | Función |
|:--|:---|:---|:---|:---|:---|
| 1 | Rectangle | `Rect_Header` | 0, 0 | 800×40 | Fondo negro del encabezado |
| 2 | Text Field | `Txt_Title` | 10, 5 | 200×30 | "ZASCA v1.0" (font 18pt, verde) |
| 3 | I/O Field | `IO_Clock` | 700, 5 | 90×30 | Tag de sistema: `@CurrentTime` |
| 4 | Circle | `Led_Global` | 670, 10 | 20×20 | Tag: `ST_SystemReady` |
| 5 | Rectangle | `Rect_Footer` | 0, 440 | 800×40 | Fondo gris oscuro |
| 6-10 | Button (×5) | `Nav_Inicio`…`Nav_Alarm` | 0-400, 442 | 80×36 | Navegación entre pantallas |
| 11 | Button | `Btn_EStop_Global` | 650, 442 | 140×36 | E-STOP rojo siempre visible |
| 12 | Alarm Indicator | `Alarm_Ind` | 400, 5 | 250×30 | Muestra alarma más reciente |

### Botones de Navegación

```javascript
// Nav_Inicio → Events → Press:
function Nav_Inicio() {
    HMIRuntime.Screens("Scr_Inicio").Show();
}

// Nav_Oper → Events → Press:
function Nav_Oper() {
    HMIRuntime.Screens("Scr_Operacion").Show();
}

// Nav_Inv → Events → Press:
function Nav_Inv() {
    HMIRuntime.Screens("Scr_Inventario").Show();
}

// Nav_Diag → Events → Press:
function Nav_Diag() {
    HMIRuntime.Screens("Scr_Diagnostico").Show();
}

// Nav_Alarm → Events → Press:
function Nav_Alarm() {
    HMIRuntime.Screens("Scr_Alarmas").Show();
}
```

### Botón E-STOP Global del Template (TOGGLE)
```javascript
// Btn_EStop_Global → Events → Press:
// TOGGLE: I0_0_EStop es NC → TRUE = OK, FALSE = ACTIVO
function EStop_Global_Press() {
    var estopOk = Tags("I0_0_EStop").Read();
    var btn = null;
    try { btn = Screen.Items("Btn_EStop_Global"); } catch(e) {}

    if (estopOk) {
        // ACTIVAR E-STOP
        Tags("I0_0_EStop").Write(false);
        Tags("CMD_EStop").Write(true);
        if (btn) { btn.BackColor = 0xFF0000; btn.Text = "EMERGENCY STOP ACTIVE"; }
    } else {
        // LIBERAR E-STOP
        Tags("I0_0_EStop").Write(true);
        Tags("CMD_EStop").Write(false);
        Tags("CMD_Reset").Write(true);
        HMIRuntime.SetTimeout(function() { Tags("CMD_Reset").Write(false); }, 500);
        if (btn) { btn.BackColor = 0x404040; btn.Text = "E-STOP OK"; }
    }
}
```

### Colores del Template (Tema Siemens Industrial)

```
Header Background:    RGB(10, 10, 10)      // Negro
Footer Background:    RGB(30, 30, 30)       // Gris muy oscuro
Screen Background:    RGB(20, 25, 20)       // Negro-verde
Text Primary:         RGB(0, 200, 0)        // Verde Siemens
Text Secondary:       RGB(0, 150, 0)        // Verde oscuro
Text Warning:         RGB(255, 200, 0)      // Amarillo
Text Error:           RGB(255, 0, 0)        // Rojo
Active Button:        RGB(0, 80, 0)         // Verde oscuro (activo)
Inactive Button:      RGB(40, 40, 40)       // Gris
```

---

## 10. Scripts JavaScript WinCC — Referencia Completa

### 10.1 Script de Animación de Tray (Movimiento Vertical)
```javascript
// Trigger: OnTagChange → ST_EncoderPos
// Mueve un símbolo gráfico proporcionalmente a la posición del encoder

function Animate_Tray_Position() {
    var encoderVal = Tags("ST_EncoderPos").Read();
    var TOTAL_CYCLE = 2864.8;      // Grados del ciclo completo
    var DRAW_HEIGHT = 300;          // Píxeles del área de dibujo
    var BASE_Y = 80;                // Offset superior

    // Normalizar posición
    var normalized = (encoderVal % TOTAL_CYCLE) / TOTAL_CYCLE;
    var newY = BASE_Y + (normalized * DRAW_HEIGHT);

    // Mover el símbolo de bandeja principal
    Screen.Items("Rect_Tray_Active").Top = newY;
    
    // Actualizar display numérico  
    Screen.Items("IO_Pos_Display").ProcessValue = encoderVal;
}
```

### 10.2 Script de Color de Barras de Inventario
```javascript
// Trigger: Cíclico 2000ms en Scr_Inventario
// Colorea las barras según nivel: verde (>50%), amarillo (20-50%), rojo (<20%)

function Update_Inventory_Colors() {
    for (var i = 0; i < 10; i++) { // Page 1: 0-9
        try {
            var qty = Tags("INV_Tray" + i + "_Qty").Read();
            var max = Tags("INV_Tray" + i + "_Max").Read();
            var pct = (max > 0) ? (qty / max) * 100 : 0;
            
            var bar = Screen.Items("Bar_Tray_" + i);
            if (pct > 50) {
                bar.BarColor = 0x00CC00;     // Verde
            } else if (pct > 20) {
                bar.BarColor = 0xFFCC00;     // Amarillo
            } else {
                bar.BarColor = 0xFF0000;     // Rojo
            }
        } catch(e) {}
    }
}
```

### 10.3 Script de Protección de Escritura por Nivel de Acceso
```javascript
// Trigger: Screen → Events → OnLoaded
// Los campos de escritura al VFD requieren nivel de acceso de Mantenimiento

function Check_Access_Level() {
    var userLevel = HMIRuntime.CurrentUser.Level;
    
    // Nivel 0 = Operador, Nivel 1 = Técnico, Nivel 2 = Mantenimiento
    var isMaintenanceUser = (userLevel >= 2);
    
    // Campos VFD solo editables para mantenimiento
    Screen.Items("IO_P1120").Enabled = isMaintenanceUser;
    Screen.Items("IO_P1121").Enabled = isMaintenanceUser;
    
    if (!isMaintenanceUser) {
        Screen.Items("Txt_VFD_Lock").Text = "🔒 Requiere nivel Mantenimiento";
        Screen.Items("Txt_VFD_Lock").Visible = true;
    } else {
        Screen.Items("Txt_VFD_Lock").Visible = false;
    }
}
```

---

## 11. Instrucciones de Importación en TIA Portal

### Paso 1: Crear el Proyecto HMI

```
1. TIA Portal → Crear Nuevo Proyecto
2. Agregar dispositivo → HMI → SIMATIC KTP700 Basic PN
3. Asistente de HMI:
   - Conexión PLC: S7-1215C (IP: 192.168.0.1)
   - Diseño Header/Footer: Seleccionar
   - Pantalla Inicial: Scr_Inicio
```

### Paso 2: Crear Conexión al PLC

```
1. HMI → Connections
2. Nueva conexión:
   - Nombre: "PLC_S7_1200"
   - Communication Driver: S7 (Integrada)
   - PLC: [Arrastrar del proyecto]
   - IP: 192.168.0.1
   - Rack: 0, Slot: 1
```

### Paso 3: Importar Tags

```
1. HMI → HMI Tags
2. Para importar masivamente, usar archivo CSV:
   
   Name,Data Type,Connection,PLC Tag,Address,Acquisition Cycle
   ST_EncoderPos,Real,PLC_S7_1200,,DB2.DBD0,100ms
   ST_VFD_Speed,Real,PLC_S7_1200,,DB2.DBD4,100ms
   ST_MotorRunning,Bool,PLC_S7_1200,,DB2.DBX8.0,100ms
   ST_BrakeReleased,Bool,PLC_S7_1200,,DB2.DBX8.1,500ms
   ST_SystemReady,Bool,PLC_S7_1200,,DB2.DBX8.2,500ms
   ST_SystemFault,Bool,PLC_S7_1200,,DB2.DBX8.3,100ms
   ST_AutoMode,Bool,PLC_S7_1200,,DB2.DBX8.4,500ms
   ST_PosReached,Bool,PLC_S7_1200,,DB2.DBX8.5,100ms
   CMD_TargetTray,Int,PLC_S7_1200,,DB1.DBW0,
   CMD_Start,Bool,PLC_S7_1200,,DB1.DBX4.0,
   CMD_Stop,Bool,PLC_S7_1200,,DB1.DBX4.1,
   CMD_EStop,Bool,PLC_S7_1200,,DB1.DBX4.2,
   CMD_Reset,Bool,PLC_S7_1200,,DB1.DBX4.3,
   CMD_AutoMode,Bool,PLC_S7_1200,,DB1.DBX4.4,
   TEL_Torque,Real,PLC_S7_1200,,DB2.DBD10,200ms
   TEL_Current,Real,PLC_S7_1200,,DB2.DBD14,200ms
   TEL_Temperature,Real,PLC_S7_1200,,DB2.DBD18,1000ms
```

### Paso 4: Crear Pantallas

```
1. HMI → Screens
2. Click derecho → "Add New Screen" (×5)
3. Renombrar: Scr_Inicio, Scr_Operacion, Scr_Inventario, 
              Scr_Diagnostico, Scr_Alarmas
4. Para cada pantalla, arrastrar los objetos según los layouts
   descritos en las secciones 3-7 de este documento
```

### Paso 5: Configurar Template

```
1. HMI → Screen Management → Template
2. Doble-click para abrir
3. Agregar los objetos del Template (sección 9)
4. Configurar los botones de navegación con los scripts
```

### Paso 6: Compilar y Transferir

```
1. Click derecho en HMI → "Compile" → "Hardware and Software (rebuild all)"
2. Verificar: 0 Errors (Warnings son normales)
3. Click derecho en HMI → "Download to Device"
4. Seleccionar interfaz de red y confirmar
5. El HMI reiniciará y cargará las pantallas
```

---

## Resumen de Archivos de este Documento

| Sección | Pantalla WinCC | Componente React Equivalente | Scripts |
|:---|:---|:---|:---|
| §3 | `Scr_Inicio` | HmiLayout (MAIN) + TelemetryPanel | 2 scripts |
| §4 | `Scr_Operacion` | OperationPanel | 4 scripts |
| §5 | `Scr_Inventario` | InventoryPanel | 2 scripts |
| §6 | `Scr_Diagnostico` | IOMap + VfdPanel | 1 script |
| §7 | `Scr_Alarmas` | AlarmBar | Nativo (Alarm View) |
| §9 | Template | Header + Footer + NavButtons | 6 scripts |
| **Total** | **5 pantallas + 1 template** | **8 componentes React** | **15 scripts** |

> **Nota importante:** El panel BRIDGE del React (PlcBridgePanel) **no se traduce** al WinCC porque el HMI ya se conecta directamente al PLC — el "puente" es innecesario. Toda la funcionalidad del BRIDGE (conectar, ver estado, enviar comandos) ya está integrada nativamente en WinCC.
