// ============================================================
// SCRIPT: Nav_Screens
// UBICACIÓN: Template (aparece en TODAS las pantallas)
// TRIGGER: Cada botón de navegación → Events → Press
// EQUIVALE A: HmiLayout.tsx tab navigation (MAIN/OPER/ALARM/MAINT)
// ============================================================
// En WinCC, copie cada función al evento "Press" del botón
// correspondiente en el Template.
// ============================================================

// ─── Botón "INICIO" ───
// Asociar a: Nav_Inicio → Events → Press
function Nav_Inicio_Press() {
    HMIRuntime.Screens("Scr_Inicio").Show();
}

// ─── Botón "OPER" ───
// Asociar a: Nav_Oper → Events → Press
function Nav_Oper_Press() {
    HMIRuntime.Screens("Scr_Operacion").Show();
}

// ─── Botón "INV" ───
// Asociar a: Nav_Inv → Events → Press
function Nav_Inv_Press() {
    HMIRuntime.Screens("Scr_Inventario").Show();
}

// ─── Botón "DIAG" ───
// Asociar a: Nav_Diag → Events → Press
function Nav_Diag_Press() {
    HMIRuntime.Screens("Scr_Diagnostico").Show();
}

// ─── Botón "ALARM" ───
// Asociar a: Nav_Alarm → Events → Press
function Nav_Alarm_Press() {
    HMIRuntime.Screens("Scr_Alarmas").Show();
}


// ============================================================
// ESTILO DE BOTÓN ACTIVO (Opcional)
// ============================================================
// Para resaltar el botón de la pantalla actual, agregar a
// cada pantalla en su evento OnLoaded:
//
//   function Screen_OnLoaded() {
//       // Resetear todos
//       Screen.Items("Nav_Inicio").BackColor = 0x282828;
//       Screen.Items("Nav_Oper").BackColor   = 0x282828;
//       Screen.Items("Nav_Inv").BackColor    = 0x282828;
//       Screen.Items("Nav_Diag").BackColor   = 0x282828;
//       Screen.Items("Nav_Alarm").BackColor  = 0x282828;
//       // Resaltar el activo
//       Screen.Items("Nav_Inicio").BackColor = 0x005500; // ← cambiar nombre
//   }
