# INFORME 2: MEMORIA DE DISEÑO MECÁNICO Y VALIDACIÓN ESTRUCTURAL
**Control del Documento:** INF-ZAS-FAS-002
**Proyecto:** ZASCA Paternoster
**Fecha:** 11 de Febrero de 2026

---

## 1. FICHA DE REQUERIMIENTOS TÉCNICOS
Esta ficha define las "Reglas de Juego" físicas que rigen el Gemelo Digital, asegurando que la simulación respete la realidad mecánica del equipo.

### Capacidad y Geometría
*   **Número de Bandejas:** 20 unidades en configuración "Zig-Zag" (Paso par de 10 eslabones).
*   **Dimensiones Útiles:** 400 mm (Profundidad) x 275 mm (Ancho).
*   **Altura Total:** ~4 m.

### Cinemática y Potencia
*   **Velocidad Lineal:** 0.19 m/s (19 cm/s).
*   **Ciclo de Rotación:** Eje principal a 14.6 RPM.
*   **Motorización:** 5 HP a 7.5 HP con variador de frecuencia (VFD).

---

## 2. ARQUITECTURA FUNCIONAL (GEMELO DIGITAL)
La arquitectura opera bajo un esquema de **Lógica Secuencial por Eventos**, delegando el control de velocidad al VFD.

### A. Capa Física (The Physics Engine)
Simulación del comportamiento mecánico y sensores físicos (Encoder Incremental, Sensores de Posición Final "Tray_In_Pos").

### B. Capa de Control (SoftPLC - Lógica de Pasos)
*   **Máquina de Estados:** Gestiona consignas al variador.
*   **Perfil de Velocidad Escalonado (Step Speed Control):**
    *   **Fase 1 (Viaje Rápido):** 40-50 Hz (Distancia > 1 bandeja).
    *   **Fase 2 (Aproximación):** 5-10 Hz (Creep Speed).
    *   **Lógica de Parada:** Frenado por sensor inductivo (Festo/Siemens) para "Hard Stop" preciso milimétrico (< 2mm).

---

## 3. ANEXO DE CÁLCULO DE INGENIERÍA

### 3.1 Cálculo Cinemático
*   **Motor:** 1750 RPM.
*   **Relación Reductor:** 40:1.
*   **Transmisión Secundaria:** 3:1 (15:45 dientes).
*   **Sprocket Principal:** 25 dientes (Paso 1.25").
*   **Resultado:** Velocidad lineal de **19.3 cm/s**. (Cumple requerimiento de 20 cm/s).

### 3.2 Análisis de Cargas (Escenario Crítico)
*   **Desbalance Máximo:** 10 bandejas cargadas (800kg) vs 10 vacías (400kg).
*   **Carga Neta:** 400 kg.
*   **Torque en Eje:** 498.3 Nm.
*   **Veredicto:** El motor de **5 HP** ofrece un **Factor de Seguridad > 4.0**.

---

## 4. VALIDACIÓN DE RESISTENCIA (PIN DE CADENA)
*   **Cadena:** ANSI 100 (20A-1).
*   **Esfuerzo Cortante Real:** 5.5 MPa.
*   **Factor de Seguridad:** FS > 50.
*   **Conclusión:** El diseño es mecánicamente robusto. Referencia validada bajo estándares comerciales (Linpic).

---

**Aprobado por:** Ingeniería de Control ZASCA
**Responsable:** Ing. Jhon Alexander Valencia Marulanda (CDT INNVESTIGA – UAM)
