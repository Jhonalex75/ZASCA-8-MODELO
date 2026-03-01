# Implementación Lógica del PLC (Ladder)

Este documento detalla la estructura del programa de control implementado en el PLC (emulado en `Processor.ts`), siguiendo el estándar IEC 61131-3.

## 1. Estructura del Programa (Main Routine)

El ciclo de escaneo del PLC (Scan Cycle) ejecuta las siguientes subrutinas en orden:

1.  **Lectura de Entradas (Inputs):** Mapeo de sensores físicos y botones HMI a memoria.
2.  **Bloque de Seguridad (Safety):** Verificación de paradas de emergencia y finales de carrera.
3.  **Control de Movimiento (Motion):** Ejecución de la **Función Escalonada**.
4.  **Escritura de Salidas (Outputs):** Actualización de contactores y referencia al VFD.

## 2. Diagrama de Bloques de Función (Control de Velocidad)

El núcleo del control de movimiento se basa en la comparación de la posición actual vs. objetivo.

### Rungs (Escalones) Clave:

*   **Rung 001 (Start/Stop):** Lógica de enclavamiento (Latching) para el contactor principal.
    *   `IF (Start_Btn OR Motor_On) AND NOT Stop_Btn THEN Motor_On = TRUE`

*   **Rung 002 (Cálculo de Error):**
    *   `Error = ABS(Target_Pos - Current_Pos)`

*   **Rung 003 (Selector de Velocidad - Step Function):**
    *   `IF Error > 2.0 Trays THEN Speed_Ref = 100% (Crucero)`
    *   `ELSE IF Error > 0.5 Trays THEN Speed_Ref = 50% (Aprox)`
    *   `ELSE IF Error > 0.02 Trays THEN Speed_Ref = 10% (Crawl)`
    *   `ELSE Speed_Ref = 0% (Stop)`

*   **Rung 004 (Freno Mecánico):**
    *   `IF Speed_Ref == 0 AND Motor_On THEN Brake_Engage = TRUE`

## 3. Temporizadores y Contadores

*   **T1 (Safety Delay):** 4000ms. Retardo a la conexión para validación de sensores.
*   **T4 (Arranque):** 10s. Bypass de alarmas de corriente durante inercia inicial.
*   **C1 (Ciclos):** Contador de bandejas presentadas al operador.

## 4. Mapeo de Memoria (Tags)

| Tag | Dirección | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| `M_Run` | M0.0 | BOOL | Bit de estado de marcha. |
| `M_Dir` | M0.1 | BOOL | Dirección (0=CW, 1=CCW). |
| `VFD_Ref`| MW10 | INT | Referencia de velocidad (0-1000). |
| `Pos_Err`| MD20 | REAL | Error de posición en unidades de bandeja. |
