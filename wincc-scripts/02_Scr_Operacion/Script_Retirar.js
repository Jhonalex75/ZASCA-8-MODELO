// ============================================================
// SCRIPT: Script_Retirar
// PANTALLA: Scr_Operacion
// TRIGGER: Btn_Retirar → Events → Press
// EQUIVALE A: OperationPanel.tsx handleRemove() / PlcBridgePanel handleRemove()
// ACTUALIZADO: 2026-02-20 - Alineado con PlcBridgePanel
// ============================================================
// Libera el sensor reflex (el operador ya retiró el arnés),
// envía comando al PLC para descontar inventario, y vuelve
// al estado ARRIVED (permite nueva selección o nuevo movimiento).
//
// REQUISITOS:
//   - pickStep == 'EXTRACTED' (sensor reflex activo)
// ============================================================

function Script_Retirar() {
    // ─── Verificar que el sensor está activo (estamos en EXTRACTED) ───
    var sensor = false;
    try { sensor = Tags("I0_6_ReflexSensor").Read(); } catch (e) { }

    if (!sensor) {
        Screen.Items("Txt_Estado_Op").Text = "NADA QUE RETIRAR";
        Screen.Items("Txt_Estado_Op").ForeColor = 0x808080;
        return;
    }

    // ─── Limpiar sensor reflex → permite mover de nuevo ───
    Tags("I0_6_ReflexSensor").Write(false);

    // ─── FIX: Desactivar AutoMode para nuevo ciclo limpio ───
    // Sin esto, el segundo movimiento entra en bucle infinito.
    Tags("CMD_AutoMode").Write(false);

    // ─── Descontar inventario en el PLC ───
    // El PLC tiene un FB_Inventory_Manager que descuenta
    // automáticamente cuando recibe este pulso.
    // El tray ID ya está en CMD_TargetTray.
    Tags("CMD_InventoryDecrement").Write(true);
    HMIRuntime.SetTimeout(function () {
        Tags("CMD_InventoryDecrement").Write(false);
    }, 200);

    // ─── Feedback visual → volver a ARRIVED ───
    Screen.Items("Txt_Estado_Op").Text = "RETIRADO - INVENTARIO ACTUALIZADO";
    Screen.Items("Txt_Estado_Op").ForeColor = 0x00FFFF;

    // Re-habilitar botones (estado ARRIVED)
    Screen.Items("Btn_Sacar").Enabled = true;
    Screen.Items("Btn_Retirar").Enabled = false;
    Screen.Items("Btn_Mover").Enabled = true;

    HMIRuntime.Trace("PICKING: Arnes retirado - inventario actualizado");
}
