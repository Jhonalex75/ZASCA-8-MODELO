// ============================================================
// SCRIPT: Btn_InicioCiclo_Press
// PANTALLA: Scr_Inicio
// TRIGGER: Btn_InicioCiclo → Events → Press
// EQUIVALE A: HmiLayout.tsx "INICIAR CICLO" button
// ============================================================
// Verifica seguridades y envía pulso de START al PLC.
// ============================================================

function Btn_InicioCiclo_Press() {
    // Verificar seguridades antes de arrancar
    var isFault = Tags("ST_SystemFault").Read();

    if (isFault) {
        // No permitir arranque con falla activa
        Screen.Items("Txt_Estado").Text = "ERROR: FALLA ACTIVA - PRIMERO RESETEAR";
        Screen.Items("Txt_Estado").ForeColor = 0xFF0000;
        HMIRuntime.Trace("ERROR: Intento de arranque con falla activa");
        return;
    }

    // Habilitar modo automático
    Tags("CMD_AutoMode").Write(true);

    // Enviar pulso START (200ms)
    Tags("CMD_Start").Write(true);
    HMIRuntime.SetTimeout(function () {
        Tags("CMD_Start").Write(false);
    }, 200);

    // Feedback visual
    Screen.Items("Txt_Estado").Text = "INICIANDO CICLO...";
    Screen.Items("Txt_Estado").ForeColor = 0x00FF00;
    Screen.Items("Btn_InicioCiclo").Enabled = false;

    // Re-habilitar botón después de 3 segundos
    HMIRuntime.SetTimeout(function () {
        Screen.Items("Btn_InicioCiclo").Enabled = true;
    }, 3000);
}
