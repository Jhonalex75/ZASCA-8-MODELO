# Informe 3: Ejecución Técnica del Proyecto ZASCA
## Identificación del Documento: INF-ZAS-FAS-003

**Fecha de Emisión:** 13 de Febrero de 2026
**Proyecto:** Automatización de Almacén Rotativo Vertical (Paternoster) – ZASCA Metalmecánico
**Referencia:** Plano P-001 (Validación Mecánica) y Modelo Virtual
**Estado:** V3.1 (Actualizado con Mejoras de Visualización)

---

## 1. Introducción
El presente informe detalla la ejecución técnica final del modelo ZASCA, consolidando la validación del tren de potencia, la estrategia de control logico y la visualización digital para manufactura. Se han incorporado las últimas mejoras en la telemetría del HMI y la lógica de visualización del Variador de Frecuencia (VFD), alineando el Gemelo Digital con la operación física esperada.

---

## 2. Plano Digital y Ensamblaje (CAD)
El diseño mecánico ha sido modelado enteramente en Autodesk Inventor, asegurando la compatibilidad de todas las piezas antes de la manufactura.

### 2.1 Estructura de Ensamblaje
El modelo se divide en tres sub-ensambles principales:
1.  **Chasis Estructural:** Perfiles estructurales que soportan las guías y el eje principal.
2.  **Tren de Potencia:** Motor, Reductor, Transmisión por Cadena y Eje Principal.
3.  **Carrusel (Loop):** Cadenas 20A-1, Pines extendidos, Barras de soporte y 20 Bandejas.

### 2.2 Vistas Requeridas para Plano Mecánico
Para la generación de los planos de taller (2D), se han definido las siguientes vistas mandatorias basadas en el Plano P-001:
*   **Vista Isométrica General:** Muestra la máquina completa sin cerramientos.
*   **Vista Frontal (Corte A-A):** Detalle de la disposición de las bandejas y la "Trompa de Elefante" (recorrido de cadena).
*   **Vista Lateral Derecha:** Detalle del montaje del Motor y Reductor.
*   **Detalle de Pin de Arrastre:** Zoom 2:1 a la conexión Cadena-Bandeja.
*   **Vista de Planta:** Layout de anclajes al suelo.

**(Nota: El modelo 3D en Inventor está listo para exportar estas vistas según solicitud).**

---

## 3. Configuración Técnica y Tren de Potencia (P-001)

Se ha actualizado la selección de componentes para garantizar un Factor de Seguridad > 4.0 bajo las condiciones más exigentes (Desbalance de Carga).

### 3.1 Especificación del Motor
*   **Tipo:** Moto-reductor AC de Inducción (Freno Incorporado).
*   **Referencia:** SEW Eurodrive FA47/G DRE132S4 (o equivalente simulación DRE90M4).
*   **Potencia:** **5 HP (3.7 kW)** (Simulado: 1.5 HP Nominal para prueba de carga).
*   **Velocidad Nominal Motor:** 1750 RPM (4 Polos, 60 Hz).
*   **Relación Reductor:** 40:1.
*   **Voltaje:** 220/440 VAC Trifásico.

### 3.2 Transmisión por Cadena
*   **Piñón Conductor (Motor):** 15 Dientes (Paso 100/1.25").
*   **Piñón Conducido (Eje):** 45 Dientes.
*   **Relación Secundaria:** 3:1.
*   **Relación Total de Transmisión:** 40 * 3 = **120:1**.

### 3.3 Desempeño Resultante
*   **Velocidad Eje Principal:** 14.58 RPM.
*   **Velocidad Lineal de Bandeja:** **19.3 cm/s** (aprox. 0.2 m/s).
*   **Torque en Eje Principal:** > 1500 Nm.

---

## 4. Esquema de Control Lógico y Visualización

### 4.1 Estrategia de Posicionamiento (Función Escalonada)
A diferencia de los sistemas PID tradicionales que pueden oscilar, se ha implementado una **Función Escalonada (Step Function)** en el Variador de Frecuencia (VFD) para garantizar paradas precisas sin sobrepaso.

**Lógica de Control Implementada:**
1.  **Crucero (100% Vel - Step ID 4):** Si distancia al objetivo > 2 bandejas.
2.  **Aproximación (50% Vel - Step ID 2):** Si distancia < 2 bandejas.
3.  **Crawl / Reptado (10% Vel - Step ID 1):** Si distancia < 0.5 bandejas.
4.  **Stop (0% Vel - Step ID 0):** Si distancia < 0.02 bandejas (Zona Muerta).

Cualquier bandeja que llegue al punto de entrega **(X=0.40m, Y=0.40m)** activa el indicador visual en **ROJO** (Posición Alcanzada) en la gráfica de telemetría.

### 4.2 Nueva Telemetría HMI
Se han realizado mejoras significativas en la interfaz para facilitar el diagnóstico:

*   **Gráfica de Respuesta Escalón:** El monitor de física (`PhysicsMonitor`) ahora incluye una gráfica en tiempo real (Amarillo vs Cyan) que compara el comando de velocidad con la respuesta real del sistema. La traza cambia a **Rojo** al confirmar la llegada.
*   **Visualizador de Pasos VFD:** El panel del variador (`VfdPanel`) incluye ahora un gráfico de barras que muestra visualmente en qué etapa de la rampa escalonada se encuentra el sistema (Steps 0-4).
*   **Limpieza de Ladder Logic:** Se eliminó la red de diagnóstico PID obsoleta (`LadderViewer`), simplificando la vista para el operador y enfocándose en la lógica de pasos y seguridad.

---

## 5. Catálogo Funcional de Componentes Operativos

| ítem | Componente | Especificación Clave | Cantidad | Función |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Motor Principal | 5 HP, 1750 RPM, Freno 220VAC | 1 | Fuente de potencia motriz. |
| **2** | Reductor | Caja Ortogonal, Relación 40:1, Eje Hueco | 1 | Multiplicación de Torque. |
| **3** | Variador (VFD) | Entrada 220V 3F / Salida 220V 3F, 5HP+ | 1 | Control de velocidad y rampas. |
| **4** | Cadena Principal | ANSI 100 (20A-1), Paso 1.25" | 13 m | Elemento de tracción vertical. |
| **5** | Sensor Inductivo | PNP, NO, Alcance 8mm (M18) | 1 | Conteo de dientes / Posición (Encoder virtual). |
| **6** | Final de Carrera | Rodillo Metálico, IP65 | 2 | Seguridad (Over-travel mecánico). |
| **7** | Botonera HMI | Pulsadores Industriales 22mm (Start/Stop) | 1 | Interfaz Operador. |
| **8** | PLC / Controlador | Entradas Rápidas (HSC), Salida Analógica 0-10V | 1 | Cerebro del sistema (Lógica Escalonada). |

---

## 6. Documento Estructurado de Configuración Técnica

Para la puesta en marcha, se deben configurar los siguientes parámetros en el VFD:

1.  **P1-01 (Velocidad Máx):** 60 Hz (1750 RPM).
2.  **P1-03 (Acc / Dec):** 0.1s / 0.4s (Rampa agresiva permitida por la función escalonada).
3.  **P4-02 (Torque Boost):** 5% (Ayuda al arranque con carga desbalanceada).
4.  **Modo de Control:** Vectorial Sensorless (SVC) para mantener torque a bajas RPM (fase Crawl).

---

## 7. Instrucciones Técnicas de Manufactura Adaptada

### 7.1 Corte y Soldadura
*   **Chasis:** Usar perfil cuadrado estructural 100x100x4mm. Soldadura MIG ER70S-6.
*   **Tolerancias:** La distancia entre centros de ejes (2779 mm) tiene una tolerancia de +/- 1 mm. Usar plantillas (Jigs) para soldar los soportes de los rodamientos.

### 7.2 Ensamble del Carrusel
1.  Instalar ejes superior e inferior sin cadenas. Alinear con nivel láser.
2.  Instalar cadenas "abiertas".
3.  Unir cadenas con eslabones de conexión. Tensar hasta que la flecha sea < 1% del vano.
4.  Instalar bandejas de una en una, alternando lados (1 izq, 1 der) para mantener el balance durante el montaje.

---

## 8. Informe de Simulación Técnica y Desempeño

La simulación bajo el nuevo esquema de "Función Escalonada" arroja los siguientes resultados:

*   **Precisión de Parada:** +/- 2 mm (vs +/- 10 mm con rampa lineal simple).
*   **Tiempo de Ciclo Medio:** 12 segundos para mover 5 posiciones.
*   **Estabilidad:** Se eliminó la oscilación (penduleo) de las bandejas al detenerse, gracias a la fase de "Crawl" (10% velocidad) antes del freno mecánico.
*   **Seguridad:** La zona roja en (0.40, 0.40) permite al operador identificar visualmente riesgo de atrapamiento si el sistema no está detenido.

---

## 9. Configuración y Programación del Gemelo Digital

Para garantizar la fidelidad de la simulación y su utilidad como herramienta de validación (Hardware-in-the-Loop), se documentan aquí los parámetros críticos de configuración y la lógica de control implementada en el código fuente del simulador.

### 9.1 Arquitectura de Software
El simulador se basa en una arquitectura de componentes reactivos (React/TypeScript) acoplados a un motor de física determinista.
*   **Motor Físico (`PhysicsEngine.ts`):** Resuelve la cinemática de cuerpo rígido aplica gravedad y fricción.
*   **Controlador Lógico (`Processor.ts`):** Emula un PLC industrial con lógica de pasos.

### 9.2 Parámetros Calibrados (`CalibrationConfig.ts`)
*   **Sensor:** Posición lineal `6.2566 m`.
*   **Dinámica:** Max Freq `80.0 Hz`.
*   **Umbrales:** 
    *   `SPEED_CRUISE`: **90.0 deg/s**
    *   `SPEED_CRAWL`: **15.0 deg/s**
    *   `DEAD_ZONE`: **1.2 deg**

---

**Aprobado para Construcción.**
*Departamento de Ingeniería ZASCA.*
