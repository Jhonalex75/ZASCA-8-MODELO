# Manual de Operación - Carrusel Vertical ZASCA

Este manual describe los pasos para operar el equipo de forma segura y eficiente, utilizando tanto el panel de simulador como la HMI.

## 1. Encendido y Puesta en Marcha

### Paso 1: Verificación Inicial
Antes de energizar, asegúrese de:
1.  **Área Despejada:** No hay personas ni objetos obstruyendo el carrusel.
2.  **Puerta Cerrada:** La puerta de acceso debe estar cerrada (Indicador `I0.4` activo).
3.  **Paro de Emergencia:** El hongo rojo (`I0.0`) debe estar LIBERADO (girar para soltar).

### Paso 2: Restablecer Fallas
Si la Torre de Luz está en **ROJO** parpadeando:
1.  Verifique que el Paro de Emergencia esté liberado.
2.  Presione el botón **RESET** (o rearme el paro en la simulación haciendo click en él).
3.  La luz roja debe apagarse y la luz **AMARILLA** (Ready) debe encenderse.

### Paso 3: Inicio de Ciclo Automático
1.  Seleccione la bandeja de destino en la HMI (campo numérico "Ir a Bandeja...").
2.  Presione el botón físico **VERDE (START)**.
3.  La Torre de Luz pasará a **VERDE**.
4.  El carrusel se moverá buscando la ruta más corta (sentido horario o antihorario) automáticamente.
5.  **Monitoreo:** Observe el cilindro naranja en el eje inferior. Los valores `Encoder` y `Angle` deben cambiar proporcionalmente. Si `Encoder` cambia pero `Angle` no (o viceversa), reporte una "Falla de Acople".

## 2. Operación Normal (Picking)

### Proceso de Carga/Descarga
1.  Espere a que el carrusel se detenga completamente.
2.  La Torre de Luz cambiará a **AMARILLO** y el indicador "Posición OK" se encenderá.
3.  Solo entonces es seguro abrir la puerta o cruzar la cortina de luz.
4.  Realice la carga o descarga de material.
5.  Cierre la puerta y aléjese de la cortina de luz.
6.  Seleccione la siguiente bandeja y pulse **START** nuevamente.

**NOTA:** Si se cruza la cortina de luz mientras el equipo se mueve, el carrusel se detendrá INMEDIATAMENTE por seguridad (Parada de Categoría 0).

## 3. Apagado Seguro
1.  Lleve el carrusel a una posición de reposo (Bandeja 1 o Home).
2.  Presione el botón **ROJO (STOP)**.
3.  Espere a que el sistema se detenga.
4.  Presione el **Paro de Emergencia** para asegurar el equipo.
5.  Apague el interruptor principal (Main Switch) del tablero eléctrico.

## 4. Interfaz HMI
*   **Target Tray:** Muestra la bandeja a la que el sistema intenta llegar.
*   **Current Tray:** Muestra la bandeja actual frente al sensor.
*   **System Status:**
    *   *IDLE:* Esperando comandos.
    *   *MOVING:* Motor en marcha.
    *   *FAULT:* Error activo (revisar manual de mantenimiento).
    *   *POS OK:* En posición, seguro para operar.
