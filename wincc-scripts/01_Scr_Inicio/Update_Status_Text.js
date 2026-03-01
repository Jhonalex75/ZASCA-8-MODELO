// ============================================================
// SCRIPT: Update_Status_Text
// PANTALLA: Scr_Inicio
// TRIGGER: Screen → Events → Cyclic (500ms)
// EQUIVALE A: HmiLayout.tsx header status indicators
// ============================================================
// Actualiza el texto de estado general y el color del indicador
// según las variables del PLC en tiempo real.
// ============================================================

function Update_Status_Text() {
    var isFault = Tags("ST_SystemFault").Read();
    var isMoving = Tags("ST_MotorRunning").Read();
    var isReady = Tags("ST_SystemReady").Read();
    var posOK = Tags("ST_PosReached").Read();

    var txt = Screen.Items("Txt_Estado");
    var circle = Screen.Items("Led_Estado_General");

    if (isFault) {
        txt.Text = "FALLA - SISTEMA DETENIDO";
        txt.ForeColor = 0xFF0000; // Rojo
        if (circle) circle.BackColor = 0xFF0000;
    } else if (isMoving) {
        txt.Text = "MOVIENDO BANDEJA...";
        txt.ForeColor = 0x00FF00; // Verde brillante
        if (circle) circle.BackColor = 0x00FF00;
    } else if (posOK) {
        txt.Text = "POSICION ALCANZADA - LISTO";
        txt.ForeColor = 0xFFFF00; // Amarillo
        if (circle) circle.BackColor = 0xFFFF00;
    } else if (isReady) {
        txt.Text = "SISTEMA LISTO";
        txt.ForeColor = 0x00FFFF; // Cyan
        if (circle) circle.BackColor = 0x00FFFF;
    } else {
        txt.Text = "APAGADO / MANUAL";
        txt.ForeColor = 0x808080; // Gris
        if (circle) circle.BackColor = 0x808080;
    }
}
