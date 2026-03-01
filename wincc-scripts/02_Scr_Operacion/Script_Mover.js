// ============================================================
// SCRIPT: Script_Mover
// PANTALLA: Scr_Operacion
// TRIGGER: Btn_Mover → Events → Press
// EQUIVALE A: OperationPanel.tsx handleMove() / PlcBridgePanel.tsx handleSelectTray()
// ACTUALIZADO: 2026-02-20 - Alineado con correcciones de PlcBridgePanel
// ============================================================
// Lee la bandeja seleccionada del dropdown, verifica seguridades,
// y envía el comando de movimiento al PLC.
//
// CONDICIONES DE HABILITACIÓN (mismas que React):
//   disabled = isMoving || reflexSensor || !estopOk
// ============================================================

function Script_Mover() {
    // Leer bandeja seleccionada (0-19)
    var trayId = Tags("CMD_TargetTray").Read();

    // ─── Validaciones de seguridad (EXACTAS como React) ───

    // 1. E-Stop activo → no mover
    var estopOk = Tags("I0_0_EStop").Read();
    if (!estopOk) {
        Screen.Items("Txt_Estado_Op").Text = "E-STOP ACTIVO - LIBERAR PRIMERO";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF0000;
        return;
    }

    // 2. Falla activa → no mover
    var isFault = Tags("ST_SystemFault").Read();
    if (isFault) {
        Screen.Items("Txt_Estado_Op").Text = "FALLA ACTIVA - RESETEAR PRIMERO";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF0000;
        return;
    }

    // 3. Motor ya en movimiento → esperar
    var isMoving = Tags("ST_MotorRunning").Read();
    if (isMoving) {
        Screen.Items("Txt_Estado_Op").Text = "ESPERE: MOTOR EN MOVIMIENTO";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFFFF00;
        return;
    }

    // 4. Sensor reflex bloqueado → no mover
    var sensor = false;
    try { sensor = Tags("I0_6_ReflexSensor").Read(); } catch (e) { }
    if (sensor) {
        Screen.Items("Txt_Estado_Op").Text = "RETIRE EL ARNES ANTES DE MOVER";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF6600;
        return;
    }

    // ─── FIX: Resetear flags de posición para ciclo limpio ───
    // Sin esto, el segundo movimiento puede entrar en bucle.
    Tags("M0_2_PosReached").Write(false);
    Tags("M0_1_Moving").Write(false);

    // ─── Habilitar modo automático ───
    Tags("CMD_AutoMode").Write(true);

    // ─── Enviar pulso START (200ms) ───
    Tags("CMD_Start").Write(true);
    HMIRuntime.SetTimeout(function () {
        Tags("CMD_Start").Write(false);
    }, 200);

    // ─── Feedback visual ───
    Screen.Items("Txt_Estado_Op").Text = "GIRANDO HACIA BANDEJA " + trayId + "...";
    Screen.Items("Txt_Estado_Op").ForeColor = 0x00FF00;

    // Deshabilitar botón durante movimiento
    Screen.Items("Btn_Mover").Enabled = false;
    Screen.Items("Btn_Sacar").Enabled = false;
    Screen.Items("Btn_Retirar").Enabled = false;

    HMIRuntime.Trace("CMD: Mover a bandeja " + trayId);
}
