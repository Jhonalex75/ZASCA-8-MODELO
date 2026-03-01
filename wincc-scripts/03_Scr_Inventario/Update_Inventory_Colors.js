// ============================================================
// SCRIPT: Update_Inventory_Colors
// PANTALLA: Scr_Inventario
// TRIGGER: Screen → Events → Cyclic (2000ms)
// EQUIVALE A: InventoryPanel.tsx stock level indicators
// ============================================================
// Cada 2 segundos, recorre las barras de inventario y las
// colorea según nivel: verde (>50%), amarillo (20-50%), rojo (<20%).
// ============================================================

function Update_Inventory_Colors() {
    // Iterar por las 10 bandejas visibles en esta página
    for (var i = 0; i < 10; i++) {
        try {
            var qty = Tags("INV_Tray" + i + "_Qty").Read();
            var max = Tags("INV_Tray" + i + "_Max").Read();

            // Calcular porcentaje
            var pct = (max > 0) ? (qty / max) * 100 : 0;

            // Obtener la barra gráfica
            var bar = Screen.Items("Bar_Tray_" + i);

            // Colorear según nivel
            if (pct > 50) {
                bar.BarColor = 0x00CC00;     // Verde — stock suficiente
            } else if (pct > 20) {
                bar.BarColor = 0xFFCC00;     // Amarillo — stock bajo
            } else if (pct > 0) {
                bar.BarColor = 0xFF6600;     // Naranja — stock crítico
            } else {
                bar.BarColor = 0xFF0000;     // Rojo — agotado
            }

            // Actualizar texto de cantidad
            try {
                Screen.Items("Txt_Qty_" + i).Text = qty + " / " + max;
            } catch (e2) { }

        } catch (e) {
            // Tag no existe o no es accesible
        }
    }
}
