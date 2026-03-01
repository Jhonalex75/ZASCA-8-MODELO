# Guía de Implementación en Plataforma Siemens (TIA Portal)

**ID Documento:** INF-SIEMENS-ZAS-004  
**Fecha:** 16 de Febrero de 2026  
**Referencia:** Migración de Gemelo Digital (React/TS) a Entorno Industrial.

---

## 1. Respuesta Directa
**¿Se pueden cargar las especificaciones actuales (React/Three.js) en un HMI Siemens?**

**NO directamente.**  
El Gemelo Digital está construido con tecnologías web modernas (HTML5/WebGL) que no son nativas de los paneles HMI tradicionales (Comfort Panels).

*   **Gemelo Digital:** Ejecuta TypeScript en un navegador (Motor V8).
*   **HMI Siemens:** Ejecuta Runtime WinCC (Propietario) o WinCC Unified (Web-based, pero restringido).

---

## 2. Requisitos para la Migración
Para llevar la lógica validada del Gemelo Digital al hardware físico, se requiere un proceso de "Traducción de Código".

### A. Migración de Lógica de Control (Cerebro)
El código de `Processor.ts` debe transcribirse a **SCL (Structured Control Language)** para el PLC S7-1200/1500.

| Concepto Gemelo (TypeScript) | Equivalente Siemens (SCL) | Acción Requerida |
| :--- | :--- | :--- |
| `class PlcProcessor` | **Function Block (FB)** | Crear FB "Control_Paternoster". |
| `state.inputs` / `outputs` | **PLC Tags (I/Q)** | Mapear a direcciones físicas (`%I0.0`, `%Q0.0`). |
| `TON('T1', ...)` | **IEC_TIMER (TON)** | Instanciar bloque `TON` en DB de instancia. |
| `Step Function (If/Else)` | **CASE / IF..THEN** | Copiar lógica de rangos tal cual. |
| `CalibrationConfig.ts` | **Data Block (DB)** | Crear DB "Config" con los valores (80Hz, PID Kp, etc). |

### B. Migración de Interfaz HMI (Rostro)
La interfaz React no corre en el panel. Se debe "redibujar" en **WinCC Unified** o **WinCC Comfort**.

| Componente React | Objeto WinCC |
| :--- | :--- |
| Botón "Pedir Bandeja" | Button con evento `Press` -> SetBit. |
| Gráfica de Torque | Trend View (Conectado a Tag `%IW64`). |
| Indicador de Nivel (Bandeja) | Bar Graph o Graphic List. |
| **Visualización 3D** | **LIMITACIÓN:** La vista 3D fluida (Three.js) **NO** es posible en paneles estándar. Se reemplaza por una imagen estática o animación 2D simplificada. |

---

## 3. Hoja de Ruta de Ingeniería (Scope of Work)

### Paso 1: Configuración de Hardware
*   **PLC:** S7-1200 (CPU 1214C o superior recomendada).
*   **HMI:** KTP700 Basic o Unified Comfort Panel MTP700.
*   **VFD:** Integración por PROFINET (Telegrama 1) o Señal Analógica 0-10V.

### Paso 2: Traducción de Código (Ejemplo SCL)
El desarrollador debe tomar la lógica validada (ver *Documento de Parametrización Lógica*) y escribirla en TIA Portal:

```scl
// Ejemplo de traducción de Step Function
IF "DB_Config".ErrorPos > 2.0 THEN
    "VFD_Setpoint" := "DB_Config".Speed_Cruise; // 80 Hz
ELSIF "DB_Config".ErrorPos > 0.5 THEN
    "VFD_Setpoint" := "DB_Config".Speed_Approach; // 40 Hz
...
END_IF;
```

### Paso 3: Validación FAT
Usar el Gemelo Digital como "Gold Standard". El comportamiento del PLC real debe ser idéntico al del simulador.

---

## 4. Alternativa Híbrida (Industria 4.0)
Si se desea conservar la visualización 3D y la potencia del Gemelo Digital en planta:

1.  **OPC UA:** Habilitar servidor OPC UA en el PLC S7-1200.
2.  **PC Edge / Tablet:** Ejecutar el Gemelo Digital en una Tablet industrial conectada por WiFi al PLC.
3.  **Funcionamiento:** La Tablet lee el estado real del PLC y muestra el gemelo 3D moviéndose en tiempo real ("Espejo Digital").

---
*Documento generado para el Departamento de Automatización.*
