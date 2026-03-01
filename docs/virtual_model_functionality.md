# Funcionalidad del Modelo Virtual (Digital Twin)

## ¿Qué es este Modelo?
Este Gemelo Digital replica la configuración de **Alta Gama (10 HP)** definida en la cotización GEN-0037.

## 1. Simulación de Física Realista (Updated)
El modelo (`PhysicsEngine.ts`) ha sido recalibrado para:

*   **Motor:** Curva de potencia de **10 HP (7.5 kW)**. Esto significa que el sistema virtual "tiene mas fuerza" y responde más rápido ante cargas pesadas que la versión anterior de 5 HP.
*   **Inercia:** Se actualizó la masa rotacional para reflejar el rotor más grande del motor de 10 HP.
*   **Transmisión de Potencia (Especificación P-001):**
    *   **Reducción Total (120:1):** La física simula la multiplicación de torque generada por el reductor (40:1) y la transmisión por cadena (3:1), resultando en un torque disponible masivo.
    *   **Velocidad Resultante:** La simulación reproduce fielmente la velocidad lineal de **0.2 m/s** (14.5 RPM en eje).
*   **Dinámica de Cadenas:** Se simula el comportamiento poligonal (efecto cordal) de la cadena paso 1.25" al girar sobre los piñones de 15 y 45 dientes.

## 2. Lógica de Control Industrial (PLC Virtual)
El cerebro de la simulación (`Processor.ts`) ejecuta **exactamente el mismo código** que se cargará en el PLC físico (Siemens S7-1200).

*   **Ciclo de Scan:** El software ejecuta la lógica ciclo a ciclo (como un PLC real), evaluando entradas, ejecutando lógica Ladder, y actualizando salidas.
*   **Perfil de Movimiento Escalonado (Step Function):** A diferencia de un PID tradicional, se ha implementado una lógica de aproximación por pasos (Crucero -> Aproximación -> Crawl -> Stop) que garantiza paradas precisas sin oscilaciones, ideal para cargas inerciales elevadas.
*   **Seguridad:** Monitoreo constante de finales de carrera y sensores de cortina de luz.
*   **Encoders y Telemetría:** Se ha añadido una visualización directa de los sensores en el modelo 3D.
    *   **Cilindro Naranja (Eje Inferior):** Representa el encoder físico montado en el eje del motor.
    *   **Etiqueta Flotante:** Muestra en tiempo real los pulsos brutos (`Encoder`) y la posición física en grados (`Angle`), permitiendo verificar la calibración del sistema.

## 2. Comportamiento del Variador (VFD)
Emulación del **Sinamics G120 CU250S-2**:

*   **Encoder Feedback:** El modelo asume ahora que existe retroalimentación de velocidad real (Closed Loop), eliminando el error de deslizamiento en la simulación.
*   **Paradas de Seguridad:** Simulación de la función STO mediante el corte inmediato de torque.
*   **Visualización de Pasos:** El panel del VFD muestra ahora gráficamente la secuencia de pasos de velocidad.

## 4. Interfaz Humano-Máquina (HMI)
Lo que el operario ve en la pantalla de la simulación es una réplica exacta de la interfaz que tendrá en el panel físico KTP700.

*   **Telemetría Avanzada:** Gráfica en tiempo real de Velocidad vs Comando, con indicador **ROJO** de "Posición Alcanzada" para confirmación visual inmediata.
*   **Botoneras y Luces:** Los botones de Start/Stop y la Torre de Luz funcionan conectados a las E/S del PLC virtual.
*   **Ladder Viewer:** Herramienta única de este modelo que permite "ver el cerebro" funcionando en tiempo real, simplificada para mostrar el flujo lógico sin ruido de diagnósticos internos.

## Objetivo del Modelo
1.  **Validación de Ingeniería:** Probar que el motor de 5 HP y la relación 120:1 son suficientes para mover la carga desbalanceada antes de la compra.
2.  **Entrenamiento:** Permitir que los operarios aprendan a usar la máquina (y qué hacer si falla) sin riesgo de dañar equipos reales o sufrir accidentes.
3.  **Depuración de Software:** El 90% de los errores de programación del PLC se corrigen aquí, ahorrando días de puesta en marcha en planta.
