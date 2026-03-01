# LISTADO DE EQUIPOS E INSTRUMENTACIÓN — PROYECTO ZASCA

Este documento detalla los componentes físicos y de cómputo necesarios para replicar la simulación actual en un entorno industrial real.

---

## 1. SISTEMA DE CONTROL (AUTOMATISMOS Y HMI)
*   **PLC:** Siemens S7-1215C (o similar con PROFINET).
*   **HMI:** Simatic TP1500 Comfort o KTP700 Basic.
*   **Variador (VFD):** Sinamics G120 con módulo de control CU250S-2.

---

## 2. SENSORES E INSTRUMENTACIÓN (MERCADO COLOMBIANO)
Referencias comerciales validadas para distribuidores locales (Cimech 3D, Colsein, Melexa, etc.).

### A. Posicionamiento Angular (Encoder)
*   **Requerimiento:** Encoder Profinet o SSI (Eje sólido 10mm).
*   **Opción Premium:** **SICK AFS60 (Profinet)**. Integración directa.
*   **Opción Comercial:** **Autonics E50S8 (Incremental)** + Sensor Inductivo de Home.

### B. Detección y Seguridad
| Componente | Requerimiento Técnico | Referencia Recomendada |
| :--- | :--- | :--- |
| **Sensor de Producto** | Fotoeléctrico Reflex (2m) | **Omron E3Z-R81** / Sick W100 |
| **Seguridad de Puerta** | Interruptor codificado 2NC | **Schneider XCS-A** / Schmersal AZ16 |
| **Cortina de Luz** | Tipo 4, Resolución 30mm | **Sick deTec4 Core** / Reer EOS4 |
| **Parada de Emergencia** | Hongo 40mm, NC Redundante | **Schneider Harmony XB5** |

---

## 3. COMPUTACIÓN (GEMELO DIGITAL)
*   **Hardware:** PC con GPU dedicada (Nvidia RTX 2060 o superior para 3D fluído).
*   **OS:** Windows 10/11 IoT Enterprise LTSC (para estabilidad industrial).
*   **Conectividad:** Switch Ethernet Industrial (Siemens Scalance XB005). Cable CAT6 STP blindado.
*   **Despliegue:** Empaquetado como ejecutable `.exe` mediante **Electron** o **Tauri**.

---

## 4. RESUMEN DE I/O (DIMENSIONAMIENTO PLC)
*   **Entradas Digitales (DI):** 6 mín.
*   **Salidas Digitales (DQ):** 7 mín.
*   **Recomendación:** Un PLC **S7-1214C** (14 DI / 10 DQ) cubre todos los requerimientos sin expansiones.
