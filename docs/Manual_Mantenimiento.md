# MANUAL DE MANTENIMIENTO Y TROUBLESHOOTING — ZASCA

Este manual técnico está orientado al personal de mantenimiento eléctrico y mecánico encargado de garantizar la disponibilidad del Carrusel Vertical.

---

## 1. MANTENIMIENTO PREVENTIVO (RUTINAS)

### A. Inspección Semanal (Mecánica)
*   **Cadenas de Transmisión:** Verificar tensión. Holgura máxima de 2cm. Una cadena floja causa errores de posicionamiento y golpes en la carga.
*   **Sensor Reflex (I0.6):** Limpieza de lente y espejo. El polvo acumulado genera falsos positivos de "Bandeja Ocupada".
*   **Ruidos:** Detectar golpeteos secos en piñones; lubricar cadenas si hay chirridos.

### B. Inspección Mensual (Eléctrica)
*   **Freno del Motor:** Verificar el entrehierro (Air Gap) del freno SEW. Ajustar si es > 0.6mm para evitar resbalamientos.
*   **Borneras:** Re-apriete de tornillos de potencia en el tablero (VFD, Contactores) para prevenir puntos calientes.
*   **Logs del VFD:** Revisar parámetro `r0947` en el Sinamics G120. Investigar errores de sobrecorriente recurrentes.

---

## 2. CALIBRACIÓN DE CERO (HOMING)
Si las bandejas no se alinean con la ventanilla:
1.  Llevar el carrusel manualmente (Modo JOG) hasta alinear la **Bandeja #1**.
2.  En la pantalla de Mantenimiento del HMI, presionar **"SET HOME"**.
3.  Verificar con un ciclo completo a la bandeja #5 y regreso a #1.

---

## 3. HERRAMIENTAS DE DIAGNÓSTICO HMI
En la pantalla **"MAINTENANCE"**:
*   **Ladder Viewer:** Monitor de bits `M0.1_Moving` (Comando activo) y `M0.2_PosReached` (Confirmación lógica).
*   **Telemetría de Potencia:** Observar la corriente (Amperios). Corriente alta constante indica fricción excesiva o desalineación mecánica.
