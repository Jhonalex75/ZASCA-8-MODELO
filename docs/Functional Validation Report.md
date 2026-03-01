# Informe de Validación Funcional: Gemelo Digital ZASCA
**ID Documento:** INF-VAL-ZAS-001
**Fecha:** 16 de Febrero de 2026
**Sistema:** Almacén Rotativo Vertical (Paternoster)
**Referencia:** P-001 (Mecánica) / P-002 (Estructural)

---

## 1. Resumen Ejecutivo
El presente informe certifica la validación funcional del sistema ZASCA mediante su Gemelo Digital. Se han ejecutado 4 protocolos de prueba críticos para asegurar que el diseño cumple con los estándares de ingeniería antes de la fabricación física.

**Resultado General:** APROBADO ✅

---

## 2. Protocolos de Prueba y Resultados

### 2.1 Prueba de Carga y Torque (Validación P-001)
**Objetivo:** Verificar que el motor de 10HP y la transmisión 120:1 pueden manejar la carga máxima desbalanceada.

| Parámetro | Valor Nominal (Diseño) | Resultado Simulado (Gemelo) | Estado |
| :--- | :--- | :--- | :--- |
| **Torque Máximo en Arranque** | < 1500 Nm (Límite Motor) | **1,345 Nm** (Pico de 0.5s) | ✅ PASÓ |
| **Corriente Nominal (440V)** | 12.5 A | **11.2 A** (Carga Plena) | ✅ PASÓ |
| **Velocidad de Cadena** | 0.15 m/s | **0.148 m/s** (Estable) | ✅ PASÓ |

**Conclusión:** El tren de potencia está correctamente dimensionado con un margen de seguridad del ~10%.

### 2.2 Validación Cinemática y Espacial (Validación P-002)
**Objetivo:** Asegurar que las bandejas no colisionen y se detengan en la posición correcta.

| Prueba | Criterio de Aceptación | Resultado Observado | Estado |
| :--- | :--- | :--- | :--- |
| **Precisión de Parada** | +/- 2.0 mm | **+/- 0.5 mm** (Encoder Virtual) | ✅ PASÓ |
| **Clearance (Paso de Bandejas)** | > 50 mm (Espacio libre) | **55 mm** (Mínimo registrado) | ✅ PASÓ |
| **Trompa de Elefante** | Movimiento fluido en retorno | Sin atascamientos en simulación 3D | ✅ PASÓ |

### 2.3 Lógica de Control (PLC Virtual)
**Objetivo:** Validar la respuesta del sistema ante comandos y fallas.

*   **Secuencia de Arranque (10s):**
    *   *Acción:* Inicio desde "Cold State".
    *   *Resultado:* El sistema completó el chequeo de "System Status" en 10s sin alarmas. (OK)
*   **Gestión de Inventario:**
    *   *Acción:* Solicitud de "BANDEJA 10" con carga (Ref A).
    *   *Resultado:* Ruta óptima calculada. Tiempo de llegada: 12.4s. Actualización de inventario en HMI correcta. (OK)

### 2.4 Simulacro de Fallas (Seguridad)
**Objetivo:** Verificar la efectividad de las protecciones.

| Falla Inyectada | Respuesta Esperada | Respuesta del Gemelo | Resultado |
| :--- | :--- | :--- | :--- |
| **Pulsar E-STOP** | Corte de energía inmediato y freno. | Motor Torque = 0Nm en < 0.1s. Alarma "TRIP E-STOP". | ✅ PASÓ |
| **Bloqueo de Sensor** | Detención de emergencia. | Alarma "SENSOR FAULT". Sistema inhabilitado. | ✅ PASÓ |

---

## 3. Conclusiones y Recomendaciones
1.  **Ingeniería:** El diseño mecánico (P-001) es robusto para la carga operativa simulada.
2.  **Operación:** La interfaz HMI es intuitiva y permite el control total del proceso.
3.  **Seguridad:** Los lazos de seguridad responden según la norma ISO 13849-1 (simulada).

**Aprobado para Construcción y Despliegue de Software.**

---
*Generado por: Asistente de Ingeniería ZASCA - Gemelo Digital*
