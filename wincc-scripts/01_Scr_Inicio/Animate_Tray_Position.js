// ============================================================
// SCRIPT: Animate_Tray_Position
// PANTALLA: Scr_Inicio
// TRIGGER: OnTagChange → Tag "ST_EncoderPos"
// EQUIVALE A: TelemetryPanel.tsx position display
// ============================================================
// Mueve un símbolo gráfico de bandeja proporcionalmente a la 
// posición del encoder del PLC. También actualiza el display
// numérico de posición.
// ============================================================

function Animate_Tray_Position() {
    var encoderVal = Tags("ST_EncoderPos").Read();

    // Constantes del sistema (de CalibrationConfig.ts)
    var TOTAL_CYCLE = 2864.8;   // Grados del ciclo completo
    var DRAW_HEIGHT = 300;       // Píxeles del área de dibujo en pantalla
    var BASE_Y = 80;             // Offset superior del área de dibujo

    // Normalizar posición (0.0 a 1.0)
    var normalized = (encoderVal % TOTAL_CYCLE) / TOTAL_CYCLE;

    // Calcular nueva posición Y en píxeles
    // (Invertido: 0 es arriba en WinCC)
    var newY = BASE_Y + (normalized * DRAW_HEIGHT);

    // Mover el símbolo gráfico de la bandeja activa
    try {
        Screen.Items("Rect_Tray_Active").Top = newY;
    } catch (e) {
        HMIRuntime.Trace("Error moviendo Rect_Tray_Active: " + e.message);
    }

    // Actualizar display numérico de posición
    try {
        Screen.Items("IO_Pos_Display").ProcessValue = encoderVal;
    } catch (e) { }
}
