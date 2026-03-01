# Revisión Técnica: Cotización No. GEN-0037 (11-02-2026)

**Fecha Revisión:** 16 de Febrero de 2026
**Documento Analizado:** `GEN-0037 11-02-2026 Jhon Alexander Valencia.pdf`
**Estado:** **OBSERVADO / REQUIERE AJUSTES**
**Proyecto:** Automatización y Gemelo Digital de Carrusel Vertical
**Alcance:** Validación de la propuesta económica frente a la Ingeniería de Detalle (P-001/P-002).

---

## 1. Alcance de la Propuesta

Esta oferta contempla la integración completa del sistema eléctrico y de control para dotar de inteligencia al modelo físico construido por FASECOL. Incluye:
1.  **Ingeniería:** Diseño de planos eléctricos y adaptación del código de simulación (`Processor.ts`) a lenguaje Ladder (TIA Portal).
2.  **Suministros:** Hardware de control (PLC, HMI, Variador), sensores y tablero eléctrico.
3.  **Armado:** Montaje y cableado del gabinete de control.
4.  **Servicios:** Pruebas en sitio y capacitación.

---

## 2. Oferta Económica (Estimada en COP)

Precios de referencia basados en distribuidores locales (Cimech, Colsein, Melexa, Ferreterías Eléctricas) a Feb 2026.

### A. Hardware de Control y Potencia (Suministros)

| Ítem | Descripción | Cant. | Valor Unit. Est. (COP) | Valor Total (COP) |
| :--- | :--- | :---: | :---: | :---: |
| **PLC** | Siemens S7-1200 CPU 1214C DC/DC/DC | 1 | $2.380.000 | $2.380.000 |
| **HMI** | Siemens Unified Comfort MTP700 (Recomendado*) | 1 | $4.500.000 | $4.500.000 |
| **VFD** | Variador G120C **7.5kW (10 HP)** PN | 1 | $7.200.000 | $7.200.000 |
| **Motor** | Motorreductor SEW **10 HP** con Freno (Ref: K-Series) | 1 | $9.500.000 | $9.500.000 |
| **Encoder** | Encoder Absoluto Sick (Profinet) o Equiv. | 1 | $1.800.000 | $1.800.000 |
| **Seguridad** | Relé de Seguridad Pilz PNOZ (o equiv.) | 1 | $850.000 | $850.000 |
| **Sensores** | Kit Sensores (Reflex, Inductivos, Puerta) | 1 Global | $1.200.000 | $1.200.000 |
| **SUBTOTAL A** | **MATERIALES PRINCIPALES (CONTROL)** | | | **$27.430.000** |

---

## 3. Listado de Materiales para Tablero (BOM Detallado de Eléctricos)

Costos estimados para el armado del tablero de potencia y control (1.5HP / 220VAC).

| Ítem | Componente | Marca Ref. (Sugg) | Cant. | V. Unit (COP) | V. Total (COP) |
| :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | **Gabinete Metálico** 60x60x25 IP54 | Rittal / Quest | 1 | $650.000 | $650.000 |
| 2 | **Interruptor Totalizador** 3x20A | Schneider Acti9 | 1 | $120.000 | $120.000 |
| 3 | **Guardamotor** 20-25A (Protección VFD 10HP) | Schneider GV3 | 1 | $650.000 | $650.000 |
| 4 | **Contactor de Potencia** 40A (Bobina 24V) | Schneider TeSys D | 2 | $350.000 | $700.000 |
| 5 | **Fuente de Poder** 24VDC 5A | MeanWell / Siemens | 1 | $450.000 | $450.000 |
| 6 | **Breakers Control** (1x6A para PLC/Fuente) | Schneider | 3 | $45.000 | $135.000 |
| 7 | **Borneras de Paso** 2.5mm (Gris/Azul/PE) | Phoenix Contact | 40 | $3.500 | $140.000 |
| 8 | **Riel DIN, Canaleta y Accesorios** | Dexson | 1 Global | $150.000 | $150.000 |
| 9 | **Pilotos LED, Pulsadores y Selectores** | Schneider XB5 | 1 Global | $350.000 | $350.000 |
| 10 | **Ventilador con Filtro** 4" + Termostato | Generic | 1 Kit | $250.000 | $250.000 |
| 11 | **Cables de Potencia y Control** (Calibre 8 AWG) | Procables | 1 Rollo | $900.000 | $900.000 |
| **SUBTOTAL B** | **MATERIALES ELÉCTRICOS (TABLERO)** | | | | **$4.445.000** |

---

## 4. Servicios de Ingeniería (Mano de Obra)

| Ítem | Descripción | Hrs Est. | Valor Unit. (COP) | Valor Total (COP) |
| :--- | :--- | :---: | :---: | :---: |
| **Tablero** | Ensamble, Cableado y Marquillado de Gabinete | 20 | $75.000 | $1.500.000 |
| **Software** | Migración Lógica a TIA Portal (LAD/SCL) + HMI | 56 | $80.000 | $4.480.000 |
| **Sitio** | Puesta en Marcha, Pruebas SAT y Ajuste | 24 | $100.000 | $2.400.000 |
| **Planos** | Elaboración de Planos Eléctricos y Manuales | 8 | $80.000 | $640.000 |
| **SUBTOTAL C** | **MANO DE OBRA E INGENIERÍA** | | | **$9.020.000** |

---

## 5. Resumen Consolidado de la Inversión

Tabla resumen que explica la composición del valor total del proyecto:

| Ítem | Categoría de Gasto | Detalle | Valor Subtotal (COP) |
| :---: | :--- | :--- | :---: |
| 1 | **Hardware y Equipos (A)** | PLC, HMI, Variador, Motor 10HP, Sensores | $ 27.430.000 |
| 2 | **Materiales de Instalación (B)** | Gabinete, Breakers, Cables Potencia | $ 4.445.000 |
| 3 | **Servicios de Ingeniería (C)** | Programación, Armado, Puesta en Marcha | $ 9.020.000 |
| | | | |
| **TOTAL** | **VALOR TOTAL DEL PROYECTO (CORREGIDO)** | **(A + B + C)** | **$ 40.895.000** |

---

## 6. Cronograma de Ejecución (Estimado)

Se asume una duración total de **6 semanas**.

| Fase | Actividad | Sem 1 | Sem 2 | Sem 3 | Sem 4 | Sem 5 | Sem 6 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Compras** | Adquisición de Equipos (Importación*) | █ | █ | █ | | | |
| **2. Ensamble** | Armado de Tablero Eléctrico (Taller) | | █ | █ | | | |
| **3. Software** | Programación Offline (TIA Portal) | | █ | █ | █ | | |
| **4. Integración** | Montaje en Estructura FASECOL | | | | █ | █ | |
| **5. Pruebas** | Comisionamiento (SAT) y Ajuste Fino | | | | | █ | █ |
| **6. Entrega** | Capacitación y Entrega Final | | | | | | █ |

---

## 7. Condiciones Comerciales Sugeridas
*   **Validez de la oferta:** 15 días.
*   **Forma de Pago:** 50% Anticipo, 30% Contra entrega, 20% Final.
*   **Garantía:** 12 meses por defectos de ingeniería.

---

---

## 8. Informe de Discrepancias (vs Cotización GEN-0037)

Se han detectado las siguientes desviaciones críticas entre la Cotización GEN-0037 recibida y el Modelo de Ingeniería Validado:

| Ítem | Cotizado en GEN-0037 (Contratista) | Requerido por Ingeniería (Validado) | Dictamen Técnico |
| :--- | :--- | :--- | :--- |
| **Potencia Motor** | 1.5 HP (1.1 kW) | **10 HP (7.5 kW)** | **NO COMPLIANT.** El sistema no tendrá torque suficiente para arrancar con carga completa (4000kg). Se requiere cambio inmediato. |
| **Variador (VFD)** | G120C 1.5 HP | **G120C 10 HP** | **NO COMPLIANT.** Debe soportar la corriente nominal y picos de torque del motor de 10HP. |
| **PLC** | S7-1200 Estándar | **S7-1200 + Relé Seguridad** | **OBSERVACIÓN.** Se debe incluir explícitamente el Relé PNOZ o cambiar a CPU F-Type para certificar la seguridad de las cortinas. |
| **HMI** | KTP700 Basic | **Unified Comfort** | **RECOMENDACIÓN.** El panel Basic limita las capacidades gráficas del Gemelo Digital. Se sugiere upgrade. |

### Conclusión de la Revisión
La cotización **GEN-0037 NO es técnicamente viable** en su estado actual debido al subdimensionamiento del sistema de potencia. Se recomienda solicitar una **Re-Cotización (Versión 2)** con los valores ajustados en este documento (ver Sección 2 y 3).
