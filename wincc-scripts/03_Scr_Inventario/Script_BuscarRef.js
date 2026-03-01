// ============================================================
// SCRIPT: Script_BuscarRef
// PANTALLA: Scr_Inventario
// TRIGGER: Btn_Buscar → Events → Press
// EQUIVALE A: InventoryPanel.tsx search functionality
// ============================================================
// Lee el texto de búsqueda del campo IO, lo envía al PLC
// (FB_Tray_Selector.I_Cmd_Search), y muestra el resultado.
// ============================================================

function Script_BuscarRef() {
    // Leer texto de búsqueda del campo I/O
    var searchText = Screen.Items("IO_Search_Field").ProcessValue;

    if (!searchText || searchText.length === 0) {
        Screen.Items("Txt_Resultado").Text = "INGRESE UNA REFERENCIA";
        Screen.Items("Txt_Resultado").ForeColor = 0xFFFF00;
        return;
    }

    // Escribir al PLC para búsqueda
    Tags("CMD_SearchRef").Write(searchText);
    Tags("CMD_DoSearch").Write(true);

    // Feedback inmediato
    Screen.Items("Txt_Resultado").Text = "BUSCANDO: " + searchText + "...";
    Screen.Items("Txt_Resultado").ForeColor = 0x00FFFF;

    // Reset pulso y leer resultado después de 600ms
    HMIRuntime.SetTimeout(function () {
        Tags("CMD_DoSearch").Write(false);

        // Leer resultado del PLC
        var foundId = Tags("Q_Found_Tray_ID").Read();
        var info = Tags("Q_Ref_Info").Read();

        if (foundId >= 0) {
            Screen.Items("Txt_Resultado").Text = info;
            Screen.Items("Txt_Resultado").ForeColor = 0x00FF00; // Verde
            // Resaltar la fila encontrada
            Highlight_Tray_Row(foundId);
        } else {
            Screen.Items("Txt_Resultado").Text = "REFERENCIA NO ENCONTRADA";
            Screen.Items("Txt_Resultado").ForeColor = 0xFF0000; // Rojo
        }
    }, 600);
}

// ─── Función auxiliar: Resaltar fila ───
function Highlight_Tray_Row(trayId) {
    // Resetear colores de todas las filas visibles
    for (var i = 0; i < 10; i++) {
        try {
            var rowName = "Rect_Row_" + i;
            Screen.Items(rowName).BackColor = (i % 2 === 0) ? 0x1E1E1E : 0x2D2D2D;
        } catch (e) { }
    }
    // Resaltar la fila encontrada (verde oscuro)
    try {
        // Ajustar por página (si trayId >= 10, está en página 2)
        var rowIndex = trayId % 10;
        Screen.Items("Rect_Row_" + rowIndex).BackColor = 0x004400;
    } catch (e) { }
}
