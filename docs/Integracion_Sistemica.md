# Integración Sistémica

**Proyecto:** Automatización de Almacén Rotativo Vertical
**Fecha:** 11 de Febrero de 2026
**Última Actualización:** 15:20
**Objetivo:** Definir la arquitectura de conexión y flujo de información entre las capas mecánica, eléctrica y de software.

---

## 1. Arquitectura de Niveles (Pirámide de Automatización)

El sistema se estructura en tres niveles jerárquicos integrados:

### Nivel 0: Proceso Físico (Campo)
*   **Actuadores:** Motor Trifásico 5HP (Movimiento Principal), Freno Electromecánico (Seguridad).
*   **Sensores:**
    *   **Posicionamiento:** Encoder Incremental (Acoplado al eje principal).
    *   **Seguridad:** Cortinas de Luz (Safety Light Curtains), Finales de Carrera de Puerta, Sensor Reflex (Detección de Producto).
    *   **Mando:** Pulsadores (Start, Stop, E-Stop).

### Nivel 1: Control y Protección (Gabinete)
*   **Cerebro:** PLC (Controlador Lógico Programable). Ejecuta el ciclo de escaneo determinista (Scan Time < 10ms).
*   **Potencia:** Variador de Frecuencia (VFD). Recibe consigna de velocidad (0-10V) desde el PLC y modula la energía al motor.
*   **Seguridad:** Relé de Seguridad Pilz/Siemens (Gestión redundante de E-Stop).

### Nivel 2: Supervisión y Operación (HMI / SCADA)
*   **Interfaz:** Pantalla Táctil Industrial (PC Panel).
*   **Software:** Aplicación de Gestión ZASCA (React/Three.js - Gemelo Digital).
*   **Base de Datos:** Registro de inventario y trazabilidad de ubicaciones.

---

## 2. Diagrama de Flujo de Señales

### 2.1 Lazo de Control de Movimiento (Closed Loop)
1.  **HMI -> PLC:** El operario selecciona "Traer Bandeja #5".
2.  **PLC -> Lógica:** Calcula la distancia óptima (Ruta más corta CW/CCW).
3.  **PLC -> VFD:** Envía señal analógica (0-10V) para iniciar rampa de aceleración suave.
4.  **VFD -> Motor:** Inyecta corriente controlada (Frecuencia variable 0-80Hz).
5.  **Motor -> Mecanismo:** Mueve la cadena.
6.  **Encoder -> PLC:** Retorna pulsos de posición en tiempo real.
7.  **PLC -> VFD:** Ajusta la velocidad (Rampa de frenado) al acercarse al objetivo.
8.  **PLC -> Freno:** Activa el freno mecánico al llegar a velocidad cero (Holding).

### 2.2 Lazo de Seguridad (Priority Loop)
1.  **Evento:** Se interrumpe la Cortina de Luz o se pulsa E-Stop.
2.  **Relé de Seguridad:** Corta inmediatamente la alimentación del contactor de potencia del VFD (STO - Safe Torque Off).
3.  **Freno:** Se desenergiza y bloquea mecánicamente los ejes (Fail-Safe).
4.  **PLC:** Recibe la señal de fallo y detiene la lógica secuencial.
5.  **HMI:** Muestra alarma crítica en pantalla "PARADA DE EMERGENCIA ACTIVA".

---

## 3. Mapa de Integración de E/S (Input/Output Map)

La integración física se realiza mediante el siguiente mapeo verificado en simulación:

| Tipo | Tag PLC | Dispositivo | Función | Cableado |
| :--- | :--- | :--- | :--- | :--- |
| **DI** | I0.0 | Pulsador E-Stop (NC) | Parada Inmediata | Canal A |
| **DI** | I0.1 | Pulsador Start (NO) | Inicio Automático | 24VDC |
| **DI** | I0.2 | Pulsador Stop (NC) | Parada Normal | 24VDC |
| **DI** | I0.4 | Sensor Puerta | Validación Cierre | 24VDC |
| **DI** | I0.5 | Cortina de Luz | Protección Usuario | OSSD |
| **DI** | I0.6 | Sensor Reflex | Detección Obstáculo | Reflector |
| **DO** | Q0.0 | Contactor Motor | Energía Principal | 110VAC Coil |
| **DO** | Q0.1 | Freno | Liberación Eje | 24VDC Coil |
| **DO** | Q0.2 | Piloto RUN | Indicador Marcha | LED Verde |
| **DO** | Q0.3 | Piloto READY | Indicador Posición OK | LED Amarillo |
| **AO** | QW64 | VFD Speed Ref | Consigna Velocidad | 0-10V Analog |

---

## 4. Protocolos de Comunicación

*   **PC HMI <-> PLC:** Ethernet/IP o Profinet (en simulación: Memoria Compartida).
    *   *Datos:* ID Bandeja Solicitada, Estado del Sistema, Código de Alarma.
*   **PLC <-> VFD:** E/S Cableada (Hardwired) para robustez máxima.
    *   *Señal:* 0-10V (Velocidad), DI (Run/Dir), DO (Fault).

## 5. Estrategia de Pruebas de Integración (FAT/SAT)

1.  **Prueba en Vacío (Dry Run):** Verificar rotación de motor sin carga mecánica.
2.  **Prueba de E/S:** Validar que cada sensor enciende el bit correspondiente en el PLC.
3.  **Prueba de Seguridad:** Activar E-Stop en movimiento y medir distancia de frenado (< 100mm).
4.  **Prueba de Carga (FAT):** Operar con lastre de 1200kg (simulado) durante 4 horas continuas.
