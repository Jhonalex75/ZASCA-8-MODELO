# Documento de Parametrización Lógica
## Gemelo Digital ZASCA (Sistema Paternoster)

**ID Documento:** INF-LOG-ZAS-002  
**Fecha:** 16 de Febrero de 2026  
**Referencia:** Código Fuente `CalibrationConfig.ts` / `Processor.ts`

---

## 1. Introducción
Este documento detalla los parámetros de configuración lógica que gobiernan el comportamiento del Gemelo Digital. Estos valores han sido ajustados para replicar la física del sistema real (P-001) y la respuesta del Variador de Frecuencia (VFD).

## 2. Configuración del Variador de Frecuencia (VFD)
Parámetros que definen la curva de movimiento del Motor SEW 10HP.

| Parámetro | Valor Configurado | Unidad | Descripción Técnica |
| :--- | :--- | :--- | :--- |
| **MAX_FREQ_HZ** | `80.0` | Hz | Frecuencia máxima de salida (Velocidad de Crucero). |
| **MIN_FREQ_HZ** | `2.0` | Hz | Frecuencia mínima de torque (Crawl/Gateo). |
| **RAMP_UP_SEC** | `0.1` | s | Tiempo de aceleración 0 -> Max (Arranque "Explosivo"). |
| **RAMP_DOWN** | `0.4` | s | Tiempo de desaceleración Max -> 0 (Freno Dinámico). |

## 3. Estrategia de Posicionamiento (Step Function)
La lógica de control utiliza una función escalonada basada en la distancia al objetivo (Error).

### Tabla de Velocidades vs. Distancia
| Distancia a Objetivo (Bandejas) | Modo de Operación | Velocidad (Ref VFD) | Comportamiento |
| :--- | :--- | :--- | :--- |
| **> 2.0 Bandejas** | CRUISE | **100% (80 Hz)** | Desplazamiento rápido entre niveles. |
| **0.5 - 2.0 Bandejas** | APPROACH | **50% (40 Hz)** | Reducción de velocidad para aproximación. |
| **0.02 - 0.5 Bandejas** | CRAWL | **15% (12 Hz)** | "Gateo" final para precisión milimétrica. |
| **< 0.02 Bandejas** | DEAD ZONE | **0% (Hold)** | Zona muerta. Activación de Freno Mecánico. |

*Nota: 1 Bandeja = 143.24 grados de rotación de cadena.*

## 4. Estrategia de Control (Lazo Abierto)
El sistema **NO utiliza control PID** para el posicionamiento. La precisión se logra mediante:
1.  **Escala de Velocidad VFD:** La función escalonada (Step Function) reduce la velocidad en puntos pre-calculados.
2.  **Freno Mecánico:** Se activa instantáneamente al entrar en la "Zona Muerta" (< 0.02 bandejas).
3.  **Inercia Calculada:** Las rampas de desaceleración (0.4s) están ajustadas para que la inercia remanente deje la bandeja exactamente en posición (0.0 mm error teórico).

## 5. Temporizadores y Contadores (PLC)

| Tag | Preset (ms) | Descripción de Función |
| :--- | :--- | :--- |
| **T1** | `4000` | **Estabilización:** Tiempo de espera tras llegada para confirmar posición. |
| **T3** | `30000` | **Watchdog de Movimiento:** Si el motor no llega en 30s -> Falla. |
| **T4** | `10000` | **Monitor de Arranque:** Ventana segura de 10s al iniciar marcha (Bypass de alarmas de corriente inrush). |

## 6. Mapeo de Entradas/Salidas (I/O)

### Entradas Digitales (Sensores -> PLC)
*   `I0.0`: E-Stop (NC)
*   `I0.1`: Botón Start (NO)
*   `I0.2`: Botón Stop (NC)
*   `I0.5`: Cortina de Seguridad (NC)
*   `I0.6`: Sensor Reflex (Obstrucción)

### Entradas Analógicas
*   `IW64`: Feedback de Corriente Motor (Amperios).
*   `IW66`: Pulsos de Encoder (Posición).

---
*Generado Automáticamente del Código Fuente: 2026-02-16*
