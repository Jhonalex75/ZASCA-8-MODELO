# Guía de Calibración y Ajuste - Simulador 3D

Este documento describe los parámetros de configuración utilizados para controlar el movimiento, velocidad y posicionamiento del Carrusel Vertical.
Si en el futuro se presentan problemas de oscilación, lentitud o posicionamiento incorrecto, consulte este archivo para restaurar los valores óptimos.

## Archivo de Configuración
Todos los parámetros se encuentran centralizados en:
`src/simulation/CalibrationConfig.ts`

## Parámetros Principales

### 1. Velocidad y Motor (VFD)
Controlan la velocidad física máxima y la agresividad del arranque/frenado.

| Parámetro | Valor Óptimo | Descripción |
|-----------|--------------|-------------|
| `MAX_FREQ_HZ` | **80.0** | Frecuencia máxima. Ajustada a 80Hz para maximizar torque. |
| `RAMP_UP_SEC` | **0.2** | Tiempo de aceleración. 0.2s = Arranque casi instantáneo. |
| `RAMP_DOWN_SEC` | **0.4** | Tiempo de frenado. |
| `MIN_FREQ_HZ` | **2.0** | Frecuencia mínima. |

### 2. Posicionamiento (Curva de Velocidad)
Estos valores definen cómo se comporta el carrusel a medida que se acerca a la bandeja objetivo.

| Parámetro | Valor Óptimo | Descripción |
|-----------|--------------|-------------|
| `APPROACH_THRESHOLD_TRAYS` | **3.5** | Distancia (en bandejas) donde comienza la reducción de velocidad "Drástica". |
| `FINAL_APPROACH_TRAYS` | **0.6** | Distancia final donde entra en modo "Gateo". Valor bajo (0.6) para evitar paradas prematuras. |
| `SPEED_MAX` | **100** | Porcentaje de velocidad en tramos largos. |
| `SPEED_APPROACH` | **50** | Velocidad de aproximación. |
| `SPEED_CRAWL` | **45** | **CRÍTICO:** Velocidad mínima para **SUBIR**. Si es menor a 40, no podrá levantar la carga. |

### 3. PID y Estabilidad (Anti-Oscilación)
Controlan la precisión final y evitan que la bandeja "baile" al llegar.

| Parámetro | Valor Óptimo | Descripción |
|-----------|--------------|-------------|
| `Kp` | **8.0** | Rigidez Muy Alta. Necesaria para que el motor "pelee" contra la gravedad y no se quede corto. |
| `Ki` | **0.02** | Integral para corregir errores pequeños. |
| `Kd` | **45.0** | Amortiguación. Mantenida moderada para permitir arranque rápido. |
| `DEAD_ZONE_DEG` | **0.8** | Precisión ajustada para evitar vibración con Kp alto. |
| `MIN_TORQUE_CLAMP`| **25.0** | Piso mínimo de fuerza. |
| `GRAVITY_BOOST`| **15.0** | **NUEVO:** Fuerza extra (%) añadida automáticamente SOLO cuando se mueve hacia ARRIBA. |

## Solución de Problemas Comunes

1.  **"Se queda abajo" (Undershoot al subir):**
    *   Verifique `GRAVITY_BOOST` (aumente de 15 a 20).
    *   O aumente `SPEED_CRAWL` (ej. 50).

2.  **"Se pasa" (Overshoot al bajar):**
    *   El sistema usa la gravedad a favor. Si se pasa mucho, reduzca `SPEED_CRAWL` ligeramente, pero vigile que no afecte la subida. La lógica actual ya compensa esto no aplicando Boost al bajar.

3.  **Vibración en la meta:**
    *   Si tiembla al llegar, reduzca `Kp` (8.0 -> 7.0) o aumente `DEAD_ZONE_DEG` (0.8 -> 1.0).
