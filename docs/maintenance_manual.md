# Manual de Mantenimiento y Troubleshooting - ZASCA

Este manual técnico está orientado al personal de mantenimiento eléctrico y mecánico encargado de garantizar la disponibilidad del Carrusel Vertical.

---

## 1. Mantenimiento Preventivo (Rutinas)

Antes de que ocurra una falla, realice estas inspecciones periódicas.

### A. Inspección Semanal (Mecánica y Limpieza)
*   **Cadenas de Transmisión:** Verificar tensión. Si la cadena está muy floja (>2cm de juego), el encoder leerá una posición correcta pero la bandeja física estará desfasada, causando golpes al cargar.
*   **Sensor Reflex (`I0.6`):** Limpiar el lente del sensor y su espejo reflector con un paño seco. El polvo acumulado puede generar señales falsas de "Bandeja Ocupada".
*   **Ruidos Anormales:** Escuchar el motor al arrancar. Un "golpeteo" seco indica problemas en los piñones o falta de lubricación.

### B. Inspección Mensual (Eléctrica)
*   **Freno del Motor:** Verificar el entrehierro (Air Gap) del freno SEW. Si es mayor a 0.6mm, debe reajustarse. Un freno lento causa que el carrusel "se resbale" después de detenerse.
*   **Ajuste de Borneras:** Re-apretar tornillos de potencia en el tablero (VFD, Contactores) para evitar puntos calientes por vibración.
*   **Historial de Fallos VFD:** Revisar parámetro `r0947` en el Siemens G120C. Si hay errores recurrentes de sobrecorriente (`F07801`), revise si hay atascamientos mecánicos.

---

## 2. GUÍA DE TROUBLESHOOTING (Solución de Fallas)

Utilice esta tabla para diagnosticar problemas activos.

### Problemas de Encendido y Seguridad

| SÍNTOMA | CAUSA PROBABLE | ACCIÓN CORRECTIVA |
| :--- | :--- | :--- |
| **Luz Roja Parpadea y No Arranca** | Paro de Emergencia (`I0.0`) activado. | 1. Girar el botón hongo para liberar. <br> 2. Pulsar botón **RESET** en HMI o tablero. |
| **Luz Roja Fija + "Safety Loss"** | Circuito de seguridad abierto (`I0.4` Puerta o `I0.5` Cortina). | 1. Verificar que la puerta de mantenimiento esté bien cerrada. <br> 2. Limpiar cortina de luz. <br> 3. Resetear falla. |
| **HMI Apagada o sin Conexión** | Falla de alimentación 24V o cable Ethernet desconectado. | 1. Revisar Breaker de Control en tablero. <br> 2. Verificar luces "Link" en el Switch Ethernet. |

### Problemas de Movimiento (Motor)

| SÍNTOMA | CAUSA PROBABLE | ACCIÓN CORRECTIVA |
| :--- | :--- | :--- |
| **Motor "Zumba" pero no mueve** | **Freno Pegado** o Carga Excesiva. El VFD intenta mover pero no vence la fricción. | 1. Revisar rectificador del freno en la bornera del motor. <br> 2. Verificar si hay palets atascados en las guías. |
| **El carrusel arranca y para de golpe** | Falla de Encoder (`M20_Theta` no cambia). El PLC detecta que no se mueve y corta por seguridad (Stall). | 1. Revisar acople flexible del encoder (¿está roto?). <br> 2. Verificar cable Profinet del encoder. |
| **El carrusel gira al revés** | Fases del motor invertidas (U-V-W). | 1. Invertir dos fases en la salida del VFD (U y V). <br> 2. O cambiar dirección por software en el VFD (P1820). |

### Problemas de Posicionamiento

| SÍNTOMA | CAUSA PROBABLE | ACCIÓN CORRECTIVA |
| :--- | :--- | :--- |
| **El carrusel "se pasa" y regresa** | Exceso de ganancia o inercia. El sistema oscila buscando el punto. | 1. Reducir `Kp` (Proporcional) en `CalibrationConfig`. <br> 2. Aumentar `Kd` (Derivativo) para frenar antes. |
| **Se detiene antes de llegar (Corto)** | Fricción alta o Zona Muerta muy amplia. | 1. Engrasar guías. <br> 2. Aumentar `Ki` (Integral) para que el motor empuje hasta el final. |
| **La posición "Cero" se corrió** | Deslizamiento del encoder o cadena estirada. | 1. **NO mueva los sensores.** <br> 2. Realice el **Procedimiento de Calibración de Cero**. |

---

## 3. Procedimiento de Calibración de Cero (Homing)

Si las bandejas no paran alineadas con la ventanilla de carga:

1.  Lleve el carrusel manualmente (Modo JOG) hasta que la **Bandeja #1** esté perfectamente alineada.
2.  En la HMI (Página Mantenimiento), presione **"SET HOME"** o **"Calibrate Encoder"**.
3.  Esto guardará el nuevo Offset en el PLC.
4.  Realice una prueba moviendo a la Bandeja #5 y regresando a la #1.

---

## 4. Herramientas de Diagnóstico en HMI

En la pantalla "MAINTENANCE" del operador:

*   **Ladder Viewer:** Permite ver el estado de los sensores en tiempo real.
    *   `M0.1_Moving`: ¿El PLC está mandando a mover?
    *   `M0.2_PosReached`: ¿El PLC cree que ya llegó?
*   **Estado del VFD:** Muestra corriente (Amperios) y Torque. Una corriente alta en vacío indica problemas mecánicos graves.
