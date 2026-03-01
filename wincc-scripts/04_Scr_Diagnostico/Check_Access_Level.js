// ============================================================
// SCRIPT: Check_Access_Level
// PANTALLA: Scr_Diagnostico
// TRIGGER: Screen → Events → OnLoaded (al abrir la pantalla)
// EQUIVALE A: VfdPanel.tsx parameter editing restrictions
// ============================================================
// Verifica el nivel de acceso del usuario actual. Los parámetros
// del VFD (P1120, P1121) solo pueden modificarse con nivel
// de Mantenimiento (nivel 2+).
//
// Niveles de acceso TIA Portal:
//   0 = Operador (solo lectura)
//   1 = Técnico (operación avanzada)
//   2 = Mantenimiento (escritura de parámetros)
//   3 = Administrador (configuración total)
// ============================================================

function Check_Access_Level() {
    // Obtener nivel del usuario actual
    var userLevel = 0;
    try {
        userLevel = HMIRuntime.CurrentUser.Level;
    } catch (e) {
        userLevel = 0; // Por defecto: operador
    }

    var isMaintenanceUser = (userLevel >= 2);

    // ─── Campos VFD: solo editables para mantenimiento ───
    try {
        Screen.Items("IO_P1120").Enabled = isMaintenanceUser;
        Screen.Items("IO_P1121").Enabled = isMaintenanceUser;
    } catch (e) { }

    // ─── Mostrar/ocultar mensaje de bloqueo ───
    try {
        if (!isMaintenanceUser) {
            Screen.Items("Txt_VFD_Lock").Text = "REQUIERE NIVEL MANTENIMIENTO";
            Screen.Items("Txt_VFD_Lock").Visible = true;
            Screen.Items("Txt_VFD_Lock").ForeColor = 0xFF6600;
        } else {
            Screen.Items("Txt_VFD_Lock").Visible = false;
        }
    } catch (e) { }

    // ─── Log de acceso ───
    HMIRuntime.Trace("Diagnostico: Usuario nivel " + userLevel +
        (isMaintenanceUser ? " - Acceso completo" : " - Solo lectura"));
}
