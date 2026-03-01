// WinCC Unified JavaScript
// Función: Animate_Carousel
// Pantalla: Scr_Animacion
// Trigger: Cíclico 100ms
//
// Anima 5 rectángulos representando bandejas del carrusel.
// Cada "bandeja" se posiciona verticalmente según el ángulo del encoder.
// La bandeja en la zona de picking se resalta con borde verde.
//
// REQUISITOS en pantalla:
//   - 5 × Rectangle "Rect_Tray_0" ... "Rect_Tray_4" (120×50 px cada uno)
//   - 5 × Text "Txt_Tray_0" ... "Txt_Tray_4" (dentro de cada rectángulo)
//   - 30 × Circle "Dot_T0_S0" ... "Dot_T4_S5" (6 dots por bandeja, 8×8 px)
//   - 2 × Text "Arr_Left", "Arr_Right" (flechas ▶ ◀ fijas en zona picking)
//
// Colores de referencia:
//   Ref A = 0xEF4444 (rojo)    Ref D = 0xEAB308 (amarillo)
//   Ref B = 0x22C55E (verde)   Ref E = 0x06B6D4 (cyan)
//   Ref C = 0x3B82F6 (azul)    Ref F = 0xD946EF (fucsia)

function Animate_Carousel() {
    var encoder = Tags("ST_EncoderPos").Read();     // 0 - 2864.8°
    var targetTray = Tags("CMD_TargetTray").Read();
    var TRAY_SPACING = 18.0;                         // 360° / 20 bandejas
    var TOTAL_TRAYS = 20;

    // --- Estado del sistema ---
    var isMoving = false;
    try {
        isMoving = Tags("ST_MotorRunning").Read();
    } catch (e) { isMoving = false; }

    // Normalizar encoder a 0-360
    var normAngle = ((encoder % 360) + 360) % 360;

    // Bandeja exacta en posición de picking
    var exactPos = normAngle / TRAY_SPACING;
    var pickTray = Math.round(exactPos) % TOTAL_TRAYS;
    var fractional = (exactPos - Math.round(exactPos)); // -0.5 a 0.5

    // Configuración visual
    var BASE_Y = 40;           // Y del primer slot visible
    var TRAY_HEIGHT = 55;      // Altura de cada bandeja en px
    var VISIBLE = 5;
    var HALF = Math.floor(VISIBLE / 2); // 2

    // Colores por referencia (A-F)
    var REF_COLORS = [0xEF4444, 0x22C55E, 0x3B82F6, 0xEAB308, 0x06B6D4, 0xD946EF];
    var EMPTY_COLOR = 0x333333;

    for (var slot = 0; slot < VISIBLE; slot++) {
        var offset = slot - HALF; // -2, -1, 0, 1, 2
        var trayIdx = ((pickTray + offset) % TOTAL_TRAYS + TOTAL_TRAYS) % TOTAL_TRAYS;

        // --- Posicionar rectángulo ---
        var yPos = BASE_Y + (slot * TRAY_HEIGHT) - (fractional * TRAY_HEIGHT);
        var rect = Screen.Items("Rect_Tray_" + slot);
        rect.Top = yPos;

        // --- Resaltar zona de picking (slot central) ---
        var isPickZone = (offset === 0);
        var isTarget = (trayIdx === targetTray);

        if (isPickZone) {
            // FIX: Naranja si moviendo, verde si detenido en posición
            rect.BorderColor = isMoving ? 0xFFAA00 : 0x00FF88;
            rect.BorderWidth = 2;
            rect.BackColor = isMoving ? 0x2A1A0A : 0x0A2A1A;
        } else if (isTarget) {
            rect.BorderColor = 0x3B82F6;
            rect.BorderWidth = 1;
            rect.BackColor = 0x0A1A2E;  // Azul oscuro
        } else {
            rect.BorderColor = 0x333333;
            rect.BorderWidth = 1;
            rect.BackColor = 0x0A0A0F;  // Negro
        }

        // --- Actualizar texto de bandeja ---
        var txt = Screen.Items("Txt_Tray_" + slot);
        txt.Text = "BDJ " + (trayIdx < 10 ? "0" : "") + trayIdx;
        txt.Top = yPos + 2;
        txt.ForeColor = isPickZone ? 0x00FF88 : 0x888888;

        // --- Actualizar puntos de arnés (6 por bandeja) ---
        // NOTA: En WinCC real, los datos de inventario vendrían de
        // tags del PLC (DB_Inventory). Aquí se usa un ejemplo estático.
        // Para implementación real, leer:
        //   Tags("INV_Tray_" + trayIdx + "_SlotA").Read()
        for (var s = 0; s < 6; s++) {
            var dot = Screen.Items("Dot_T" + slot + "_S" + s);
            dot.Top = yPos + 20;

            // Actualizado para usar el nuevo formato de tags detallados
            var hasItem = false;
            try {
                var refLetter = String.fromCharCode(65 + s); // A, B, C, D, E, F
                hasItem = Tags("INV_T" + trayIdx + "_Ref" + refLetter).Read() > 0;
            } catch (e) {
                // Fallback a lógica anterior o false si no existen los tags
                hasItem = false;
            }

            dot.BackColor = hasItem ? REF_COLORS[s] : EMPTY_COLOR;
        }
    }
}
