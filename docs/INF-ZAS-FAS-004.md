# INFORME 4: MANUAL DE OPERACIÓN Y MANTENIMIENTO
**Control del Documento:** INF-ZAS-FAS-004
**Proyecto:** ZASCA Paternoster
**Fecha:** 16 de Febrero de 2026

---

## 1. MANUAL TÉCNICO DE OPERACIÓN
Este documento vincula la interfaz gráfica del Gemelo Digital con la ingeniería física (Planos P-001/P-002).

### 1.1 Anatomía de la Interfaz
*   **Zona A (Telemetría):** Monitoreo de Torque (Nm) y Potencia (HP). Validación del motor de 10HP.
*   **Zona B (Modelo 3D):** Visualización estructural a escala 1:1. Etiquetas dinámicas de sensores.
*   **Zona C (Control):** Réplica del HMI Siemens KTP700. Gestión de picking e inventario.

### 1.2 Protocolo de Operación Estándar (SOP)
1.  **Arranque (10s):** Verificación de "GLOBAL E-STOP OK" y chequeo de estatus del sistema.
2.  **Selección de Bandeja:** Uso del HMI Virtual para solicitar una bandeja específica (0-19).
3.  **Picking:** Confirmación de retiro de material ("Confirmar Pick") para actualizar ERP.
4.  **Cierre Seguro:** Verificación de zona de atrapamiento roja antes de finalizar.

---

## 2. GUÍA DE SOLUCIÓN DE FALLAS (TROUBLESHOOTING)
| Síntoma | Posible Causa | Acción Recomendada |
| :--- | :--- | :--- |
| **El motor no arranca** | E-Stop pulsado o Cortina de luz interrumpida | Verificar hardware de seguridad y pulsar RESET. |
| **Error de posición > 5mm** | Deslizamiento de cadena o encoder sucio | Recalibrar sensor inductivo de "Home". |
| **Alarma de Atasco (30s)** | Obstrucción mecánica en guías | Inspeccionar ruta de cadena y despejar objetos. |
| **Falla Térmica VFD** | Sobrecarga de desbalance crítico | Distribuir mejor el peso en las 20 bandejas. |

---

## 3. VALIDACIÓN FUNCIONAL Y CERTIFICACIÓN
*   **Protocolo de Carga:** El sistema manejó 1345 Nm de torque sin fallos (Margen 10%).
*   **Protocolo de Seguridad:** Respuesta inmediata (<100ms) ante interrupción de barreras de luz (ISO 13849-1).
*   **Resultado General:** **APROBADO ✅** para construcción y despliegue final.

---

**Aprobado por:** Ingeniería de Control ZASCA
**Responsable:** Ing. Jhon Alexander Valencia Marulanda (CDT INNVESTIGA – UAM)
