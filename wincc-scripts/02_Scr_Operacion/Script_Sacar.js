// ============================================================
// SCRIPT: Script_Sacar
// PANTALLA: Scr_Operacion
// TRIGGER: Btn_Sacar → Events → Press
// EQUIVALE A: OperationPanel.tsx handleExtract() / PlcBridgePanel handleExtract()
// ACTUALIZADO: 2026-02-20 - Alineado con PlcBridgePanel
// ============================================================
// Activa el sensor reflex para bloquear el motor por seguridad.
// En la versión real, el operador abre la puerta y retira el
// arnés; el sensor reflex se activa automáticamente.
// En WinCC, simulamos la activación manual desde pantalla.
//
// REQUISITOS:
//   - pickStep == 'ARRIVED' (posición alcanzada)
//   - Al menos 1 referencia seleccionada
// ============================================================

function Script_Sacar() {
    // ─── Verificar que estamos en posición ───
    var posOK = Tags("ST_PosReached").Read();
    if (!posOK) {
        Screen.Items("Txt_Estado_Op").Text = "ESPERE A QUE LLEGUE A POSICION";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF6600;
        return;
    }

    // ─── Verificar que no hay falla ───
    var isFault = Tags("ST_SystemFault").Read();
    if (isFault) {
        Screen.Items("Txt_Estado_Op").Text = "FALLA ACTIVA - NO SE PUEDE SACAR";
        Screen.Items("Txt_Estado_Op").ForeColor = 0xFF0000;
        return;
    }

    // ─── Activar sensor reflex → bloquea motor automáticamente ───
    Tags("I0_6_ReflexSensor").Write(true);

    // ─── Enviar STOP al PLC por seguridad adicional ───
    Tags("CMD_Stop").Write(true);
    HMIRuntime.SetTimeout(function () {
        Tags("CMD_Stop").Write(false);
    }, 200);

    // ─── Feedback visual ───
    Screen.Items("Txt_Estado_Op").Text = "SACANDO ARNES... NO MUEVA LA BANDEJA";
    Screen.Items("Txt_Estado_Op").ForeColor = 0xFFFF00;

    // Deshabilitar SACAR y MOVER, habilitar solo RETIRAR
    Screen.Items("Btn_Sacar").Enabled = false;
    Screen.Items("Btn_Retirar").Enabled = true;
    Screen.Items("Btn_Mover").Enabled = false;

    HMIRuntime.Trace("PICKING: Sensor reflex activado - motor bloqueado");
}
