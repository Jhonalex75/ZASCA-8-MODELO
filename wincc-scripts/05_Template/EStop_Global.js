// ============================================================
// SCRIPT: EStop_Global
// UBICACIÓN: Template (aparece en TODAS las pantallas)
// TRIGGER: Btn_EStop_Global → Events → Press
// EQUIVALE A: OperationPanel.tsx toggleEstop() / PlcBridgePanel toggleEstop()
// ACTUALIZADO: 2026-02-20 - Ahora es TOGGLE (igual que React)
// ============================================================
// COMPORTAMIENTO TOGGLE:
//   - Si E-Stop está OK (I0.0 = TRUE)  → ACTIVAR (I0.0 = FALSE)
//   - Si E-Stop está ACTIVO (I0.0 = FALSE) → LIBERAR (I0.0 = TRUE)
//
// Esto coincide con la lógica React:
//   const toggleEstop = () => updateTags({ I0_0_EStop: !estop });
//
// NOTA: I0_0_EStop es Normalmente Cerrado (NC):
//   TRUE  = OK (contacto cerrado, sin emergencia)
//   FALSE = ACTIVO (contacto abierto, paro de emergencia)
// ============================================================

function EStop_Global_Press() {
    // Leer estado actual del E-Stop (NC: TRUE = OK, FALSE = ACTIVO)
    var estopOk = Tags("I0_0_EStop").Read();
    var btn = null;
    try { btn = Screen.Items("Btn_EStop_Global"); } catch (e) { }

    if (estopOk) {
        // ─── ACTIVAR E-STOP (TRUE → FALSE) ───
        Tags("I0_0_EStop").Write(false);
        Tags("CMD_EStop").Write(true);

        // Visual: Rojo parpadeante
        if (btn) {
            btn.BackColor = 0xFF0000;
            btn.ForeColor = 0xFFFFFF;
            btn.Text = "EMERGENCY STOP ACTIVE";
        }

        HMIRuntime.Trace(">>> E-STOP ACTIVADO DESDE HMI <<<");

    } else {
        // ─── LIBERAR E-STOP (FALSE → TRUE) ───
        Tags("I0_0_EStop").Write(true);
        Tags("CMD_EStop").Write(false);

        // Enviar pulso de RESET para limpiar fallas
        Tags("CMD_Reset").Write(true);
        HMIRuntime.SetTimeout(function () {
            Tags("CMD_Reset").Write(false);
        }, 500);

        // Visual: Gris normal
        if (btn) {
            btn.BackColor = 0x404040;
            btn.ForeColor = 0xCCCCCC;
            btn.Text = "E-STOP OK";
        }

        HMIRuntime.Trace(">>> E-STOP LIBERADO DESDE HMI <<<");
    }
}
