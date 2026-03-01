/**
 * CONFIGURACIÓN DE CALIBRACIÓN - ZASCA SIMULATOR
 * =================================================
 * 
 * DOCUMENTO DE AJUSTE FINAL DE POSICIONAMIENTO
 * --------------------------------------------
 * Estrategia de Control:
 * 1. GEOMETRÍA PURA: El objetivo se calcula matemáticamente para Y=0.40m.
 *    - Valor SENSOR_L = 6.2566m (Sin offsets manuales).
 * 
 * 2. DINÁMICA DE MOVIMIENTO:
 *    - Rampa de Aceleración: 0.1s (Arranque Explosivo).
 *    - Mantenimiento de Vel (80Hz): Hasta 1.5 bandejas antes del destino.
 *    - Velocidad de 'Gateo': 60% (Fuerza suficiente para subir contra gravedad).
 * 
 * 3. LÓGICA DE FRENADO:
 *    - Zona Muerta: 0.8 grados.
 *    - El motor EMPUJA hasta entrar en zona muerta (Sin huecos de 'falsa parada').
 * 
 * ÚLTIMA ACTUALIZACIÓN: 2026-02-04 (Corrección Geométrica + Fix Motor Gap)
 */

export const CalibrationConfig = {
    // --- VFD / MOTOR SETTINGS ---
    VFD: {
        // Max Frequency (Hz). Adjusted to 80Hz for better Torque/Speed balance.
        MAX_FREQ_HZ: 80.0,

        // Acceleration Ramp (Seconds to reach Max)
        RAMP_UP_SEC: 0.1, // Super fast start

        // Deceleration Ramp (Seconds to Stop)
        RAMP_DOWN_SEC: 0.4,

        // Min Frequency to trigger movement
        MIN_FREQ_HZ: 2.0,
    },

    // --- POSITIONING & APPROACH ---
    // --- POSITIONING & APPROACH ---
    POSITIONING: {
        // Distance thresholds (in Trays) for Speed Control
        // 1 Tray = ~143 degrees (Annex 01 Geometry: 2864 / 20)

        // "Long Distance" (> 3 Trays) -> Max Speed
        // "Approaching" (<= 3 Trays) -> Drastic Reduction

        APPROACH_THRESHOLD_TRAYS: 2.0, // Start ramping earlier
        FINAL_APPROACH_TRAYS: 0.5,     // Final docking

        // Speed Limits (Degrees per Second)
        // Target: 20 cm/s Linear Speed.
        // Omega = 0.20 / 0.127 = 1.57 rad/s = ~90 deg/s.

        SPEED_CRUISE_DEG_S: 90.0,
        SPEED_CRAWL_DEG_S: 15.0,   // Precision approach

        // Legacy % values (Ignored in new VFD Logic)
        // SPEED_MAX: 100,      
        // SPEED_APPROACH: 50,  
        // SPEED_CRAWL: 55,     

        // "Short Distance" logic: If total move is small, cap max speed
        SHORT_MOVE_TRAYS: 3.0,
        SHORT_MOVE_MAX_SPEED: 90,
    },

    // --- PID CONTROL ---
    // Controls the fine-tuning of the motor torque based on error
    PID: {
        Kp: 5.0,    // Proportional Gain (Reduced to stop oscillation)
        Ki: 0.02,   // Integral Gain
        Kd: 45.0,   // Derivative Gain

        DEAD_ZONE_DEG: 1.2, // Relaxed to allow settling
        MIN_TORQUE_CLAMP: 25.0,
        GRAVITY_BOOST: 45.0, // Tuned down to prevent overshoot
    }
};
