# ESPECIFICACIÓN DE REQUERIMIENTOS FUNCIONALES (FRS) — ZASCA

**Proyecto:** Sistema ZASCA (Automated Vertical Carousel)
**Fecha:** 06 de Febrero de 2026

---

## 1. REQUERIMIENTOS DE OPERACIÓN (MOTION)
*   **Selección de Bandeja:** El sistema debe permitir al operario seleccionar cualquier bandeja (0-19) desde el HMI.
*   **Posicionamiento:** Precisión de parada ±2mm respecto al eje de la ventanilla de carga.
*   **Velocidad:** Desplazamiento lineal uniforme a 20 cm/s.

## 2. REQUERIMIENTOS DE SEGURIDAD (SAFETY)
*   **E-Stop:** Botón de parada de emergencia que corta el torque del motor (STO) y aplica freno mecánico.
*   **Cortina de Luz:** Barrera infrarroja en puerto de servicio; detención inmediata ante intrusión.
*   **Enclavamiento:** Movimiento prohibido si la puerta de mantenimiento está abierta.

## 3. REQUERIMIENTOS NO FUNCIONALES (CALIDAD)
*   **Capacidad:** Soporte de 300kg (carga distribuida).
*   **Disponibilidad:** Operación 24/7 con factor de servicio industrial.
*   **Tiempo de Respuesta:** Máximo 45 segundos para el trayecto más largo.

---

## 4. INTEGRACIÓN ERP (API REST)
El sistema expone una interfaz "Máquina a Máquina" (M2M) para comunicación externa.

### Endpoints Principales
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| **GET** | `/api/status` | Consulta estado (IDLE, BUSY, ERROR) y posición actual. |
| **POST** | `/api/move` | Ordena el movimiento a una bandeja específica (Payload: `target_tray`). |
| **POST** | `/api/inventory/update` | Actualiza la base de datos de materiales por bandeja. |
| **GET** | `/api/logs` | Descarga el historial de movimientos y picking para auditoría. |

---

**Nota:** La integración utiliza protocolo HTTP/JSON sobre Ethernet Industrial (TCP/IP).
