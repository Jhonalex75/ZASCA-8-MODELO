# Especificación de Hardware - Proyecto ZASCA (Basado en Plano P-001)

Este documento detalla los componentes físicos validados mecánicamente en el Plano P-001 y necesarios para replicar la simulación en el entorno industrial real.

## 1. Actuadores y Potencia (Tren de Potencia P-001)

Elementos encargados del movimiento físico, dimensionados para una carga útil de 240 kg + estructura.

| Componente | Especificación P-001 | Cantidad | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Motorreductor** | **SEW Eurodrive K77-DRE132M4** | 1 | **Potencia:** 10 HP (7.5 kW) <br> **Reductor:** Cónico (K77), Relación 40:1, Eje Hueco. <br> **Freno:** BE11 (110 Nm) para seguridad positiva (Doble capacidad). |
| **Transmisión Secundaria** | **Cadena ANSI 100 (Paso 1.25")** | 1 Kit | Piñón Motor: 15 Dientes <br> Piñón Eje: 45 Dientes <br> **Relación Total:** 120:1 (Torque Salida > 3000 Nm). |
| **Variador de Frecuencia (VFD)** | **Siemens SINAMICS G120** (CU250S-2 + PM240-2) | 1 | **7.5 kW / 10 HP**. Control de la Unidad **CU250S-2** (Vector) para lazo cerrado (Encoder) y función de seguridad **STO** integrada. |
| **Resistencia de Frenado** | **SEW BW039-015** (o equiv.) | 1 | 1500W. Aumentada para disipar mayor energía cinética de la masa rotacional de 10 HP. |
| **Contactor de Línea** | **3-Polos, 50A, Bobina 24VDC** | 1 | Seguridad para corte físico de potencia (Dimensionado para 10 HP). |

## 2. Sistema de Control (Automómatas y HMI)

El "cerebro" del sistema, basado en la lógica de `Processor.ts`.

| Componente | Especificación Sugerida | Cantidad | Justificación en Código |
| :--- | :--- | :--- | :--- |
| **PLC (CPU)** | **Siemens S7-1200 CPU 1214C** (DC/DC/DC) | 1 | Capacidad para Contadores Rápidos (HSC) requeridos para el encoder/sensor de pulsos. |
| **Tarjeta de Memoria** | **SIMATIC Memory Card (4MB)** | 1 | Requerida para actualizaciones de firmware y datalogs. |
| **HMI (Pantalla)** | **Siemens KTP700 Basic PN** | 1 | Interfaz de Operador (7 Pulgadas, Ethernert). Visualización de gráficas y alarmas. |
| **Fuente de Poder** | **SITOP PSU100S 24VDC, 10A** | 1 | Alimentación robusta para PLC, HMI, Sensores y Frenos (El freno consume ~40W). |

## 3. Sensores e Instrumentación

Selección revisada para garantizar la precisión de **±2 mm** requerida por el P-001.

### A. Sistema de Posicionamiento (Inductivo)
En lugar de un encoder absoluto costoso, se valida el uso de conteo de pulsos sobre la rueda dentada o pines de cadena.

*   **Sensor de Conteo (Encoder Virtual):** **Sensor Inductivo M18, PNP, NO, Alcance 8mm**.
    *   *Ubicación:* Detectando los pines de la cadena o una rueda fónica en el eje rápido.
    *   *Referencia:* **Sick IME18** o **Pepperl+Fuchs NBB8**.
*   **Sensor de Home (Cero):** **Final de Carrera Mecánico de Rodillo**.
    *   *Ubicación:* Parte inferior del carrusel, activado por una leva en la Bandeja #1.
    *   *Referencia:* **Honeywell szl-wl**.

### B. Seguridad (Safety Chain)
*   **Cortina de Luz:** **Sick deTec4 Core**. Altura 900mm. Resolución 30mm (Mano).
*   **Interlock de Puerta:** **Schmersal AZ16**. Llave codificada.
*   **Parada de Emergencia:** **Schneider Harmony XB5** (Hongo Rojo 40mm, Girar para soltar).


## 4. Estructura y Mecánica General (Detalle P-001)

Componentes estructurales validados para soportar las cargas dinámicas.


| Componente | Especificación P-001 | Material / Norma | Función |
| :--- | :--- | :--- | :--- |
| **Chasis Principal** | Perfil Tubular Rectangular **100x50 mm** (6mm espesor) | Acero ASTM A500 Gr. C | Soportar la estructura y guías. Alta rigidez. |
| **Ejes de Transmisión** | **Ø 2.50 Plg** (63.5 mm) | Acero 4140 Bonificado | Transmisión de alto torque. Mayor resistencia a fatiga. |
| **Cadena de Arrastre** | **ANSI 100** (Paso 1.25") / **20A-1** | Acero al Carbono Templado | Carga de rotura > 80 kN. Aditamentos de pin extendido cada 12 pasos. |
| **Bandejas (Carriers)** | Ancho 2.0m x Fondo 0.40m (**Espesor 3mm**) | Lámina HR A-36 | Mayor capacidad de carga y rigidez estructural. |
| **Guías de Rodadura** | Pista de rodamiento para cadena | UHMW / Nylamid | Reducción de fricción y ruido en el desplazamiento vertical. |

### Dimensiones Generales
*   **Altura Total:** 3.70 m.
*   **Distancia entre Ejes:** 2.779 m.
*   **Ancho Total:** 2.50 m (Frente de máquina).
*   **Profundidad:** 1.20 m.


---

## 5. Resumen de Conectividad (Red Industrial)

Topología **PROFINET (Ethernet Industrial)** para inmunidad al ruido y facilidad de diagnóstico.

1.  **Cableado:** CAT6 Blindado (STP) con conectores RJ45 metálicos.
2.  **Switch:** No gestionado, Grado Industrial (Riel DIN). Ej: **Siemens Scalance XB005**.
3.  **Direccionamiento IP:**
    *   PLC: `192.168.0.1`
    *   HMI: `192.168.0.2`
    *   VFD: `192.168.0.3`
    *   PC Gemelo Digital: `192.168.0.10`

---
**Documento Aprobado - Ingeniería ZASCA**
