// ============================================================
// SCRIPT: Update_Op_Status
// PANTALLA: Scr_Operacion
// TRIGGER: Screen → Events → Cyclic (200ms)
// EQUIVALE A: OperationPanel.tsx useEffect sync + PlcBridgePanel pickStep
// ACTUALIZADO: 2026-02-20 - Alineado con correcciones de estado
// ============================================================
// Máquina de estados del picking:
//   IDLE → MOVING → ARRIVED → EXTRACTED → ARRIVED → ...
//
// Actualiza texto, colores, y habilitación de botones
// según el estado actual del PLC.
// ============================================================

function Update_Op_Status() {
    // ─── Leer estados del PLC ───
    var isMoving = Tags("ST_MotorRunning").Read();
    var posOK = Tags("ST_PosReached").Read();
    var isFault = Tags("ST_SystemFault").Read();
    var estopOk = Tags("I0_0_EStop").Read();

    // Leer sensor reflex
    var sensor = false;
    try { sensor = Tags("I0_6_ReflexSensor").Read(); } catch (e) { }

    // ─── Referencias a objetos de pantalla ───
    var txt = Screen.Items("Txt_Estado_Op");
    var btnMover = Screen.Items("Btn_Mover");
    var btnSacar = Screen.Items("Btn_Sacar");
    var btnRetirar = Screen.Items("Btn_Retirar");

    // ─── Lógica de estados (prioridad de arriba a abajo) ───
    // Coincide EXACTAMENTE con la máquina de estados de React:
    //   if (!estop) → TODO BLOQUEADO
    //   if (isFault) → TODO BLOQUEADO
    //   if (sensor/reflexSensor) → EXTRACTED (solo RETIRAR)
    //   if (isMoving && !posOK) → MOVING (todo deshabilitado)
    //   if (posOK) → ARRIVED (MOVER + SACAR habilitados)
    //   else → IDLE (solo MOVER habilitado)

    if (!estopOk) {
        // E-STOP ACTIVO
        txt.Text = "E-STOP ACTIVO";
        txt.ForeColor = 0xFF0000;
        btnMover.Enabled = false;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;

    } else if (isFault) {
        // FALLA DEL SISTEMA
        txt.Text = "FALLA ACTIVA - RESETEAR PRIMERO";
        txt.ForeColor = 0xFF0000;
        btnMover.Enabled = false;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;

    } else if (sensor) {
        // EXTRACTED: Sensor reflex detecta obstrucción
        txt.Text = "BLOQUEADO - RETIRE LOS ARNESES";
        txt.ForeColor = 0xFF6600;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = true;   // Solo RETIRAR habilitado
        btnMover.Enabled = false;

    } else if (isMoving && !posOK) {
        // MOVING: Motor girando hacia posición
        txt.Text = "GIRANDO...";
        txt.ForeColor = 0x00FF00;
        btnMover.Enabled = false;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;

    } else if (posOK) {
        // ARRIVED: Posición alcanzada → listo para picking
        txt.Text = "POSICION OK - SELECCIONE ARNESES";
        txt.ForeColor = 0xFFFF00;
        btnMover.Enabled = true;     // Puede seleccionar otra bandeja
        btnSacar.Enabled = true;     // Puede sacar arneses
        btnRetirar.Enabled = false;

    } else {
        // IDLE: Sin orden activa
        txt.Text = "ESPERANDO ORDEN...";
        txt.ForeColor = 0x808080;
        btnMover.Enabled = true;
        btnSacar.Enabled = false;
        btnRetirar.Enabled = false;
    }
}
