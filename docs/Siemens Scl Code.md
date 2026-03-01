# Código Fuente para Migración a Siemens (SCL)
**Plataforma:** TIA Portal V16+ (S7-1200 / S7-1500)
**Lenguaje:** SCL (Structured Control Language)
**Propósito:** Replicar la lógica del Gemelo Digital (`Processor.ts`) para controlar el HMI WinCC.

---

## 1. Bloque de Datos de Configuración (DB_Config)
Este bloque almacena los parámetros de ingeniería definidos en el *Documento de Parametrización Lógica*.

```scl
DATA_BLOCK "DB_Config"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
   VAR
      // VFD - Velocidades (0-100%)
      Speed_Cruise : Real := 100.0;   // 80Hz
      Speed_Approach : Real := 50.0;  // 40Hz
      Speed_Crawl : Real := 15.0;     // 12Hz

      // Distancias (Bandejas)
      Dist_Approach : Real := 2.0;    // Inicio desaceleración
      Dist_Crawl : Real := 0.5;       // Inicio gateo
      Dist_DeadZone : Real := 0.02;   // Zona mecánica

      // Timers
      Time_Startup : Time := T#10s;
      Time_Watchdog : Time := T#30s;
   END_VAR
BEGIN
END_DATA_BLOCK
```

---

## 2. Bloque de Función Principal (FB_Paternoster_Control)
Copie y pegue este código en un nuevo bloque SCL.

```scl
FUNCTION_BLOCK "FB_Paternoster_Control"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
   VAR_INPUT 
      I_Start : Bool;           // Botón Start
      I_Stop : Bool;            // Botón Stop (NC)
      I_EStop : Bool;           // Parada Emergencia (NC)
      I_SafetyCurtain : Bool;   // Cortina luz (NC)
      I_TargetTray : Int;       // Bandeja solicitada (0-19)
      I_CurrentPos_Enc : Real;  // Posición actual (Encoder)
   END_VAR

   VAR_OUTPUT 
      Q_Motor_Run : Bool;       // Contactor Motor
      Q_Brake_Release : Bool;   // Freno Mecánico
      Q_VFD_Ref : Real;         // 0-100% Velocidad
      Q_Ready : Bool;           // Luz Verde / Listo
      Q_Fault : Bool;           // Luz Roja / Falla
   END_VAR

   VAR 
      // Variables Internas
      Stat_AutoMode : Bool;
      Stat_Moving : Bool;
      Stat_TargetPos : Real;
      Stat_Error : Real;
      Stat_Fault_Code : Int;
      
      // Instancias de Timers
      tmr_Startup {InstructionName := 'TON_TIME'; LibVersion := '1.0'} : TON_TIME;
      tmr_Watchdog {InstructionName := 'TON_TIME'; LibVersion := '1.0'} : TON_TIME;
   END_VAR

BEGIN
	// =============================================================
	// RUNG 1: SEGURIDAD Y PARADA DE EMERGENCIA
	// =============================================================
	IF NOT #I_EStop OR NOT #I_SafetyCurtain THEN
	    #Stat_AutoMode := FALSE;
	    #Stat_Moving := FALSE;
	    #Q_Motor_Run := FALSE;
	    #Q_Brake_Release := FALSE;
	    #Q_VFD_Ref := 0.0;
	    #Q_Fault := TRUE;
	    RETURN; // Abortar ejecución
	ELSE
	    #Q_Fault := FALSE;
	END_IF;
	
	// =============================================================
	// RUNG 2: GESTIÓN DE MODOS (AUTO/MANUAL)
	// =============================================================
	// Latching (Enclavamiento) del modo Automático
	IF #I_Start AND #I_Stop THEN
	    #Stat_AutoMode := TRUE;
	END_IF;
	
	IF NOT #I_Stop THEN
	    #Stat_AutoMode := FALSE;
	    #Stat_Moving := FALSE;
	END_IF;
	
	#Q_Ready := #Stat_AutoMode AND NOT #Stat_Moving;
	
	// =============================================================
	// RUNG 3: CÁLCULO DE POSICIÓN Y CONTROL (STEP FUNCTION)
	// =============================================================
	
	// Calcular Error Absoluto (Lógica simplificada lineal)
	#Stat_Error := ABS("DB_Config".TargetPos - #I_CurrentPos_Enc);
	
	IF #Stat_AutoMode THEN
	    
	    // --- DETERMINAR VELOCIDAD BASADA EN DISTANCIA ---
	    IF #Stat_Error > "DB_Config".Dist_Approach THEN
	        // CRUCERO
	        #Q_VFD_Ref := "DB_Config".Speed_Cruise;
	        #Stat_Moving := TRUE;
	        
	    ELSIF #Stat_Error > "DB_Config".Dist_Crawl THEN
	        // APROXIMACIÓN
	        #Q_VFD_Ref := "DB_Config".Speed_Approach;
	        #Stat_Moving := TRUE;
	        
	    ELSIF #Stat_Error > "DB_Config".Dist_DeadZone THEN
	        // GATEO / CRAWL
	        #Q_VFD_Ref := "DB_Config".Speed_Crawl;
	        #Stat_Moving := TRUE;
	        
	    ELSE
	        // EN POSICIÓN (STOP)
	        #Q_VFD_Ref := 0.0;
	        #Stat_Moving := FALSE;
	    END_IF;
	    
	    // Actualizar Salidas Físicas
	    #Q_Motor_Run := #Stat_Moving;
	    #Q_Brake_Release := #Stat_Moving; // Freno se abre solo si hay movimiento
	    
	ELSE
	    // Si no está en Auto, todo apagado
	    #Q_Motor_Run := FALSE;
	    #Q_VFD_Ref := 0.0;
	END_IF;
	
	// =============================================================
	// RUNG 4: TEMPORIZADOR DE ARRANQUE (10s)
	// =============================================================
	#tmr_Startup(IN := #Q_Motor_Run,
	             PT := "DB_Config".Time_Startup);
	             
	IF #tmr_Startup.Q THEN
	    // Lógica al completar arranque (ej. habilitar monitoreo de corriente)
	    ;
	END_IF;

END_FUNCTION_BLOCK
```

---

## 3. Instrucciones para WinCC (HMI)
Para vincular esto con la pantalla HMI:

1.  **Tag Connection:** En WinCC, cree Tags HMI que apunten a las entradas/salidas del FB (`DB_Instancia.I_TargetTray`, `DB_Instancia.Q_Ready`).
2.  **Botones:**
    *   Botón "START": Evento "Press" -> SetBit (`I_Start`), Evento "Release" -> ResetBit (`I_Start`).
3.  **Animación:**
    *   Use una "Lista Gráfica" con imágenes de la bandeja en diferentes posiciones, vinculada al Tag `I_CurrentPos_Enc` (escalado 0-100).

---

## 4. Gestión de Referencias y Selección (Inventario)
Este bloque maneja la base de datos de productos y convierte el "ID Bandeja" en la posición física para el control.

### 4.1 Bloque de Datos de Inventario (DB_Inventory)
Estructura de array para almacenar qué referencia hay en cada una de las 20 bandejas.

```scl
DATA_BLOCK "DB_Inventory"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
   VAR
      // Base de Datos: 20 Bandejas
      Trays : Array[0..19] of Struct
         Reference_ID : String[20];  // Ej: "REF-A-101"
         Quantity : Int;             // Cantidad Actual
         Weight_Kg : Real;           // Peso (para cálculo de torque)
      END_STRUCT;
   END_VAR
BEGIN
   // Valores Iniciales (Ejemplo)
   Trays[0].Reference_ID := 'VACIO';
   Trays[1].Reference_ID := 'TORNILLOS M4';
   // ...
END_DATA_BLOCK
```

### 4.2 Función de Selección y Búsqueda (FB_Tray_Selector)
Esta función recibe el comando del HMI y calcula la posición para el `FB_Paternoster_Control`.

```scl
FUNCTION_BLOCK "FB_Tray_Selector"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
   VAR_INPUT 
      I_HMI_Tray_ID : Int;        // Selección del Operador (0-19)
      I_HMI_Search_Ref : String[20]; // Búsqueda por Texto
      I_Cmd_Search : Bool;        // Botón "Buscar Referencia"
   END_VAR

   VAR_OUTPUT 
      Q_Target_Pos_Enc : Real;    // Consigna para el PLC de Control
      Q_Found_Tray_ID : Int;      // Resultado de búsqueda
      Q_Ref_Info : String[50];    // Info para mostrar en pantalla
   END_VAR

   VAR CONSTANT 
      SENSOR_POS_DEG : Real := 277.9; // Posición Angular del Sensor (Ejemplo)
      TRAY_SPACING : Real := 143.24;  // Grados entre bandejas
      TOTAL_CYCLE : Real := 2864.8;   // Ciclo total (360 grados escala extendida)
   END_VAR
   
   VAR
      temp_i : Int;
      raw_target : Real;
   END_VAR

BEGIN
	// =============================================================
	// MODO 1: SELECCIÓN DIRECTA POR BANDEJA
	// =============================================================
	// Fórmula: Target = Sensor - (ID * Spacing)
	
	// Normalizar ID (0-19)
	IF #I_HMI_Tray_ID < 0 THEN #I_HMI_Tray_ID := 0; END_IF;
	IF #I_HMI_Tray_ID > 19 THEN #I_HMI_Tray_ID := 19; END_IF;
	
	// Cálculo Matemático (Mismo que Processor.ts)
	#raw_target := #SENSOR_POS_DEG - (INT_TO_REAL(#I_HMI_Tray_ID) * #TRAY_SPACING);
	
	// Normalización Cíclica (Modulo)
	// En SCL, la función MOD es para enteros. Para REAL usamos lógica manual:
	WHILE #raw_target < 0.0 DO
	    #raw_target := #raw_target + #TOTAL_CYCLE;
	END_WHILE;
	
	WHILE #raw_target >= #TOTAL_CYCLE DO
	    #raw_target := #raw_target - #TOTAL_CYCLE;
	END_WHILE;
	
	#Q_Target_Pos_Enc := #raw_target;
	
	// =============================================================
	// MODO 2: BÚSQUEDA POR REFERENCIA
	// =============================================================
	IF #I_Cmd_Search THEN
	    #Q_Found_Tray_ID := -1; // Default: No encontrado
	    
	    FOR #temp_i := 0 TO 19 DO
	        IF "DB_Inventory".Trays[#temp_i].Reference_ID = #I_HMI_Search_Ref THEN
	            #Q_Found_Tray_ID := #temp_i;
	            #Q_Ref_Info := CONCAT(IN1:='ENCONTRADO EN BANDEJA: ', IN2:=INT_TO_STRING(#temp_i));
	            EXIT; // Terminar bucle
	        END_IF;
	    END_FOR;
	    
	    IF #Q_Found_Tray_ID = -1 THEN
	        #Q_Ref_Info := 'REFERENCIA NO ENCONTRADA';
	    END_IF;
	END_IF;

END_FUNCTION_BLOCK
---

## 5. Scripts de Visualización Interactiva (WinCC Unified - JavaScript)
Estos scripts se ejecutan en el panel HMI para animar los gráficos y dar feedback visual al operador.

### 5.1 Script de Animación Vertical (Movimiento de Bandejas)
Asociar al evento `OnTagChange` del Tag `I_CurrentPos_Enc`. Mueve un rectángulo (símbolo de bandeja) proporcionalmente.

```javascript
// Function: Animate_Tray_Position
// Trigger: Change of Tag "PLC_Tag_EncoderPos" (0 - 3600)

let encoderVal = Tags("PLC_Tag_EncoderPos").Read();
let maxPixels = 600; // Altura en pixeles del área de dibujo
let maxEncoder = 3600; // Valor máximo del encoder (360 grados)

// Calcular nueva posición Y (Invertido: 0 es arriba en WinCC)
let newY = (encoderVal / maxEncoder) * maxPixels;

// Mover objeto "Rect_Tray_Symbol"
Screen.Items("Rect_Tray_Symbol").Top = newY;
```

### 5.2 Script de Estado (Cambio de Color)
Cambia el color del indicador de estado según las variables del PLC.
Asociar al evento `OnLoaded` de la pantalla o a un ciclo de 1s.

```javascript
// Function: Update_System_Status_Color

let isReady = Tags("PLC_Tag_Q_Ready").Read();
let isFault = Tags("PLC_Tag_Q_Fault").Read();
let isMoving = Tags("PLC_Tag_Q_Motor_Run").Read();

let statusCircle = Screen.Items("Circle_Status_Indicator");
let statusText = Screen.Items("Text_Status_Label");

if (isFault) {
    statusCircle.BackColor = 0xFF0000; // Rojo
    statusText.Text = "FALLA - DETENIDO";
} else if (isMoving) {
    statusCircle.BackColor = 0x00FF00; // Verde Brillante
    statusText.Text = "MOVIENDO...";
} else if (isReady) {
    statusCircle.BackColor = 0xFFFF00; // Amarillo
    statusText.Text = "LISTO PARA PICKING";
} else {
    statusCircle.BackColor = 0x808080; // Gris
    statusText.Text = "OFF / MANUAL";
}
```

### 5.3 Script de Botón "Buscar Referencia"
Ejecuta la búsqueda al pulsar el botón en la pantalla de Inventario.

```javascript
// Function: Btn_Search_OnTapped

let refText = Screen.Items("IO_Field_Search").ProcessValue;

// Escribir al PLC
Tags("PLC_Tag_I_Search_Ref").Write(refText);
Tags("PLC_Tag_I_Cmd_Search").Write(1);

// Reset comando después de 500ms (Simular pulsador)
setTimeout(() => {
    Tags("PLC_Tag_I_Cmd_Search").Write(0);
}, 500);
```
