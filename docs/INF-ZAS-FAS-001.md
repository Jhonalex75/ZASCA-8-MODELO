# INFORME 1: DIAGNÓSTICO Y RECOPILACIÓN TÉCNICA
**Control del Documento:** INF-ZAS-FAS-001
**Proyecto:** Diseño y Validación Virtual de la Automatización del Carrusel Vertical (Paternoster)
**Beneficiario:** FASECOL S.A.S.
**Fecha:** Enero 2026

---

## 1. ENTORNO LOGÍSTICO PLANTA
Fasecol SAS es una empresa colombiana especializada en soluciones tecnológicas e industriales. Sus actividades principales incluyen:
*   **Sistemas Eléctricos Automotrices:** Arneses para industria automotriz y electrodomésticos.
*   **Soluciones de Accesibilidad:** Ascensores y plataformas industriales.
*   **Mantenimiento Industrial:** Preventivo y correctivo para carrocerías y sistemas mecánicos.
*   **Gestión de Flotas y TIC:** Software y hardware para control de flota.

### Contexto de la Necesidad
Existen 2 plantas físicas:
1.  **Nivel 1:** Armado de arneses (camiones y línea blanca).
2.  **Nivel 2:** Arneses de moto.

La necesidad principal es aprovechar al máximo el espacio vertical para el manejo de materiales del almacén, integrando un suministro automático que administre las distintas referencias.

---

## 2. REQUERIMIENTOS FUNCIONALES DEL SISTEMA
1.  **Operación y Movimiento:** Selección automática, ruta óptima, precisión ±2mm.
2.  **Seguridad (Safety):** Cortinas de luz, enclavamiento de puerta, freno por corte de energía.
3.  **Interfaz (HMI):** Login de usuario, búsqueda por SKU, "Pick-to-Light" virtual.
4.  **Integración de Datos:** Inventario en tiempo real, logs de auditoría, API para ERP.
5.  **Calidad:** Capacidad de 300kg, disponibilidad 24/6, tiempo de respuesta <45s.

---

## 3. ANÁLISIS DE IMPACTO OPERATIVO Y HUMANO

### 3.1 Comparativa: Manual vs. Automatizado (Picking)
| Fase del Proceso | Manual (Minutos) | Automatizado (Minutos) | Diferencia |
| :--- | :---: | :---: | :---: |
| Búsqueda (Caminar) | 1.5 min | 0.0 min | -100% |
| Localización Visual | 0.5 min | 0.1 min | -80% |
| Acceso (Escalera) | 1.0 min | 0.3 min | -70% |
| Extracción y Regreso | 1.5 min | 0.2 min | -86% |
| **TOTAL POR CICLO** | **4.5 min** | **0.6 min (36 seg)** | **-87%** |

### 3.2 Productividad y Ergononía
*   **Capacidad Teórica:** El sistema ZASCA permite procesar **700 referencias por turno**, comparado con 93 referencias en el proceso manual (Factor 7.5x).
*   **Ahorro en Fatiga:** En el proceso manual, un operario recorre un promedio de **1.86 km caminando por turno**. Con ZASCA, el recorrido es **0 metros**.
*   **Zona Dorada:** La entrega de material se realiza siempre a la altura de cintura-pecho (90cm - 1.10m), eliminando flexiones y extensiones riesgosas.

---

## 4. CONCLUSIÓN DE CONTROL
La integración ZASCA-ERP transforma la bodega de una "Caja Negra" a una "Caja de Cristal", donde cada movimiento queda registrado, auditado y reflejado en los estados financieros y logísticos en tiempo real.
