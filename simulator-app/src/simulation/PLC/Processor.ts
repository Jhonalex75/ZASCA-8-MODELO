import { usePlcStore } from '../../store/usePlcStore';
import { CalibrationConfig } from '../CalibrationConfig';

export class PlcProcessor {
    // Internal Timers (simulated)
    private timers = {
        T1: 0, // Stabilize
        T2: 0, // Wait
        T3: 0, // Timeout
        T4: 0, // Door
        T5: 0, // Reflex
        T4_Monitor: 0, // New: 10s Timer
    };

    // PID State
    private pidState = {
        integral: 0,
        prevError: 0
    };

    scan(dt: number) {
        const state = usePlcStore.getState();
        const { inputs, markers } = state;
        const outputs = { ...state.outputs };
        const analogOutputs = { ...state.analogOutputs };
        const newMarkers = { ...markers };

        // Utility for Timers (TON)
        const TON = (timerKey: 'T1' | 'T2' | 'T3' | 'T4', condition: boolean, preset: number) => {
            if (condition) {
                this.timers[timerKey] += dt * 1000;
            } else {
                this.timers[timerKey] = 0;
            }
            return this.timers[timerKey] >= preset;
        };

        // --- RUNG 0: E-STOP ---
        if (!inputs.I0_0_EStop) { // NC is Low (Pressed)
            outputs.Q0_0_MotorOn = false;
            outputs.Q0_1_BrakeRelease = false;
            outputs.Q1_0_Tower_Red = true;
            newMarkers.M0_3_Fault = true;
            // Reset Timers
            this.timers.T1 = 0; this.timers.T2 = 0; this.timers.T3 = 0;
        } else {
            outputs.Q1_0_Tower_Red = false; // Clear Alarm Light if safe

            // Auto-Reset Fault if E-Stop is cleared (Simplified logic per user request)
            if (newMarkers.M0_3_Fault) {
                // RISING EDGE OF SAFETY (Reset Sequence)
                console.log("PLC: E-STOP RESET -> SYSTEM RECOVERED");
                newMarkers.M0_3_Fault = false;

                // FORCE RESET MOVEMENT FLAGS TO ALLOW NEW COMMANDS
                newMarkers.M0_1_Moving = false;
                newMarkers.M0_2_PosReached = true; // Assume stopped safely
                newMarkers.M0_0_AutoMode = false;  // Require new Start

                // Clear PID Memory to prevent "Jump" on restart
                this.pidState.integral = 0;
                this.pidState.prevError = 0;
            }
        }

        // --- RUNG 1: INTERLOCKS ---
        const safetyOk = inputs.I0_0_EStop && inputs.I0_4_DoorClosed && inputs.I0_5_SafetyCurtain && !inputs.I0_6_ReflexSensor;
        newMarkers.M0_4_InterlocksOk = safetyOk;

        // --- RUNG 5: MANEJO DE OBSTRUCCIÓN (Seguridad) ---
        // Si Cortina o Reflex se activan, Setear Falla M0.3
        if (!inputs.I0_5_SafetyCurtain || inputs.I0_6_ReflexSensor) {
            newMarkers.M0_3_Fault = true;
            console.log("PLC: OBSTRUCTION DETECTED -> FAULT SET");
        }

        // --- RUNG 2: AUTO MODE ---
        if (inputs.I0_1_Start && safetyOk && !newMarkers.M0_3_Fault) {
            newMarkers.M0_0_AutoMode = true;
            outputs.Q0_6_Tower_Green = true;
            outputs.Q0_2_Ind_Run = true;
            console.log("PLC: AUTO MODE LATCHED. Safety:", safetyOk, "Fault:", newMarkers.M0_3_Fault);
        }

        // Stop Logic / Safety Loss
        if (!inputs.I0_2_Stop || !safetyOk || newMarkers.M0_3_Fault) {
            if (newMarkers.M0_0_AutoMode) console.log("PLC: AUTO MODE DROP. Stop:", inputs.I0_2_Stop, "Safety:", safetyOk, "Fault:", newMarkers.M0_3_Fault);
            newMarkers.M0_0_AutoMode = false;
            newMarkers.M0_1_Moving = false; // STOP THE MOVING FLAG
            outputs.Q0_6_Tower_Green = false;
            outputs.Q0_2_Ind_Run = false;
        }

        // --- RUNG 3: TARGET CALC ---
        // --- RUNG 3: TARGET CALC ---
        // --- RUNG 3: TARGET CALC ---
        const CHAIN_LEN = 6.35; // Annex 01
        const RADIUS = 0.127;   // Annex 01
        const CYCLE_DEGS = (CHAIN_LEN / RADIUS) * (180 / Math.PI); // ~2864.79

        // Recalculated for Annex 01 Geometry:
        // SENSOR_L = 2.779 + 0.399 + 2.379 = 5.557m
        const SENSOR_L = 5.557;
        const TRAY_SPACING_DEGS = CYCLE_DEGS / 20; // ~143.24

        let target = newMarkers.M36_TargetTheta; // Default keep old target

        // --- RUNG 2.5: LECTURA DE ENCODER (HSC) ---
        // Simulating the Encoder Input based on Physics Theta
        // 10HP Motor Encoder: 1024 PPR * 4 = 4096 counts/rev? 
        // Let's assume a scaled value where 360 deg = 3600 pulses for simplicity in sim
        const PULSES_PER_DEG = 100;
        state.analogInputs.IW66_EncoderPulses = Math.floor(markers.M20_Theta * PULSES_PER_DEG);

        // "PLC" reading the input to determine position
        // In real PLC: Pos_Actual = %ID1000 / Scale
        const currentThetaFromEncoder = state.analogInputs.IW66_EncoderPulses / PULSES_PER_DEG;

        // --- RUNG 6: SELECCIÓN DE BANDEJA (HMI) ---
        // Input: M10_TargetTray (0-19)
        // Calc: Target = SENSOR - (Tray * Spacing)

        const SENSOR_THETA = (SENSOR_L / RADIUS) * (180 / Math.PI);

        let rawTarget = SENSOR_THETA - (newMarkers.M10_TargetTray * TRAY_SPACING_DEGS);
        // Normalize Target
        newMarkers.M36_TargetTheta = ((rawTarget % CYCLE_DEGS) + CYCLE_DEGS) % CYCLE_DEGS;

        // Auto Mode Movement Logic relies on calculated Error
        if (newMarkers.M0_0_AutoMode) {
            // Use Encoder feedback for Error calculation if available, or Model M20
            const currentPos = currentThetaFromEncoder;
            const error = Math.abs(newMarkers.M36_TargetTheta - currentPos);
            const wrappedError = error > CYCLE_DEGS / 2 ? CYCLE_DEGS - error : error;

            if (wrappedError > 5.0) {
                newMarkers.M0_2_PosReached = false;
            }

            if (wrappedError > 5.0 && !newMarkers.M0_2_PosReached) {
                newMarkers.M0_1_Moving = true;
            }
        }

        // --- RUNG 4: MOTOR CONTROL (PID) ---
        const t3_dn = TON('T3', newMarkers.M0_1_Moving, 30000); // 30s Timeout

        target = newMarkers.M36_TargetTheta; // Refresh local var
        const current = markers.M20_Theta;

        let err = target - current;
        if (err > CYCLE_DEGS / 2) err -= CYCLE_DEGS;
        if (err < -CYCLE_DEGS / 2) err += CYCLE_DEGS;

        const absErr = Math.abs(err);

        // Limit Switch Logic (Final de Carrera Virtual)
        // Relaxed to Dead Zone width.
        // If it is RED, IT STOPS. No questions asked.
        const DEAD_ZONE = CalibrationConfig.PID.DEAD_ZONE_DEG;
        if (newMarkers.M0_1_Moving && absErr < DEAD_ZONE) {
            outputs.Q0_0_MotorOn = false; // CUT POWER
            outputs.Q0_1_BrakeRelease = false; // ENGAGE BRAKE
            analogOutputs.QW64_SpeedSetpoint = 0; // ZERO SPEED

            this.pidState.integral = 0; // Reset PID
            newMarkers.M0_2_PosReached = true; // Signal Arrival
            newMarkers.M0_1_Moving = false;
            newMarkers.M0_0_AutoMode = false;  // FIX: Desactivar auto para permitir nuevo ciclo
            console.log("PLC: RED ZONE HIT (STOP). AutoMode reset.");

        } else if (newMarkers.M0_1_Moving && !newMarkers.M0_2_PosReached && !t3_dn && safetyOk && absErr > DEAD_ZONE) {
            outputs.Q0_0_MotorOn = true;
            outputs.Q0_1_BrakeRelease = true;

            // --- VFD EMULATION (Distance-Based Ramp) ---
            // --- VFD EMULATION (Step Function) ---
            // Replaces linear ramp with discrete frequency steps for precise positioning.

            let output = 0;
            const SPEED_CRUISE = CalibrationConfig.POSITIONING.SPEED_CRUISE_DEG_S; // Max Speed
            const SPEED_CRAWL = CalibrationConfig.POSITIONING.SPEED_CRAWL_DEG_S;   // Min Speed

            // Calculate Distance in "Trays" (1 Tray = ~56.65 deg)
            const TRAY_DEG = CYCLE_DEGS / 20;
            const distTrays = absErr / TRAY_DEG;

            let requestedSpeed = 0;

            // STEP FUNCTION LOGIC
            if (distTrays <= 0.02) {
                // DEAD ZONE (Stop)
                requestedSpeed = 0;
                newMarkers.M0_2_PosReached = true;
                newMarkers.M0_1_Moving = false;
                newMarkers.M0_0_AutoMode = false;  // FIX: Desactivar auto para permitir nuevo ciclo
            } else if (distTrays <= 0.5) {
                // < 0.5 Trays: CRAWL SPEED (Low Frequency)
                // Approx 5-10 Hz equivalent
                requestedSpeed = SPEED_CRAWL * Math.sign(err);
            } else if (distTrays <= 2.0) {
                // < 2.0 Trays: APPROACH SPEED (Medium Frequency)
                // Approx 30 Hz equivalent or 50% of Cruise
                requestedSpeed = (SPEED_CRUISE * 0.5) * Math.sign(err);
            } else {
                // > 2.0 Trays: CRUISE SPEED (High Frequency)
                // 60 Hz equivalent
                requestedSpeed = SPEED_CRUISE * Math.sign(err);
            }

            output = requestedSpeed;

            // Clamp
            if (output > 80) output = 80;
            if (output < -80) output = -80;

            analogOutputs.QW64_SpeedSetpoint = output;

            // --- NEW FEATURE: TIMER T4 (10s START DELAY / RUN MONITOR) ---
            // T4 runs for 10s after START is pressed.
            const t4_cond = inputs.I0_1_Start || newMarkers.M0_0_AutoMode; // Run while Auto
            const t4_dn = TON('T4', t4_cond, 10000); // 10s Preset
            this.timers.T4 = t4_cond ? (this.timers.T4 || 0) + (dt * 1000) : 0; // Manual update since TON helper is simplified logic

            // Sync to Store
            state.setTimerState('T4_RunMonitor', t4_dn);

            // --- NEW: DIRECTION VISUALIZATION ---
            // Determine Direction based on Speed Setpoint Sign or Error Sign
            // output > 0 means moving towards Lower IDs (UP? No, coordinate system check needed).
            // Let's rely on the requested logic:
            // "Down" (CW) = M0_6
            // "Up" (CCW) = M0_7

            // In our Physics:
            // Increasing Theta = Moving towards LOWER Tray IDs (e.g. 1 -> 0 -> 19)
            // Wait, let's verify visual: 
            // If TRAY 1 is at 0, TRAY 2 is at 56 deg.
            // If we move 0 -> 56 deg, we are moving to Tray 2.
            // So +Theta = Higher Tray IDs = "DOWN"?
            // Let's assume +Output = +Velocity = +Theta = DOWN (CW).

            if (Math.abs(output) > 1.0) { // Deadband
                if (output > 0) {
                    newMarkers.M0_6_DirCW = true;
                    newMarkers.M0_7_DirCCW = false;
                } else {
                    newMarkers.M0_6_DirCW = false;
                    newMarkers.M0_7_DirCCW = true;
                }
            } else {
                newMarkers.M0_6_DirCW = false;
                newMarkers.M0_7_DirCCW = false;
            }

            // Sync T4 ET for Visualization
            newMarkers.M82_T4_ET = this.timers.T4;

            newMarkers.M40_PidP = 0;
            newMarkers.M42_PidI = 0;
            newMarkers.M44_PidD = 0;

        } else {
            // DEBUG LOGGING FOR STALL
            if (newMarkers.M0_1_Moving && absErr > 2.0) {
                if (Math.random() < 0.01) { // Throttle
                    console.log("PLC: MOTOR BLOCKED. Moving:", newMarkers.M0_1_Moving, "PosReached:", newMarkers.M0_2_PosReached, "T3:", t3_dn, "Safety:", safetyOk, "Err:", absErr.toFixed(1));
                }
            }

            outputs.Q0_0_MotorOn = false;
            outputs.Q0_1_BrakeRelease = false;
            analogOutputs.QW64_SpeedSetpoint = 0;
            this.pidState.integral = 0;

            // Clear PID Telemetry on Stop
            newMarkers.M40_PidP = 0;
            newMarkers.M42_PidI = 0;
            newMarkers.M44_PidD = 0;
        }

        // --- RUNG 5: POSITION DETECT & FAILSAFE ---
        let finalErr = Math.abs(target - current);
        if (finalErr > CYCLE_DEGS / 2) finalErr = CYCLE_DEGS - finalErr;

        // Condition 1: Perfect In Position (Relaxed to 3.0 deg)
        const IN_POS_TOLERANCE = 3.0;
        const in_tolerance = finalErr < IN_POS_TOLERANCE; // was 2.0

        // Condition 2: FAILSAFE - Stopped for > 1s even if slightly off
        const is_stopped = Math.abs(markers.M24_Omega) < 0.01;

        // Timer runs if we are EITHER in tolerance OR physically stopped while trying to move
        const stability_cond = (in_tolerance || is_stopped) && newMarkers.M0_1_Moving;

        // T1: Stabilization / Stall Timer
        // Boosted to 4000ms to allow heavy load to break stiction without tripping "Stall"
        const t1_dn = TON('T1', stability_cond, 4000);

        if (t1_dn) {
            // TIMEOUT on Stability - DO NOT SET POS REACHED if we are not there!
            // Just log it and keep fighting.
            console.log("PLC: STABILITY TIMEOUT. ERR:", finalErr.toFixed(2));
            this.timers.T1 = 0;
        }

        if (!stability_cond) {
            this.timers.T1 = 0;
        }

        // --- RUNG 6: ENCODER MAPPING ---
        // Must be the INVERSE of the Target formula (RUNG 6 / line 125):
        //   rawTarget = SENSOR_THETA - (tray * TRAY_SPACING_DEGS)
        // Therefore:
        //   tray = (SENSOR_THETA - theta) / TRAY_SPACING_DEGS
        const normalizedTheta = ((markers.M20_Theta % CYCLE_DEGS) + CYCLE_DEGS) % CYCLE_DEGS;
        const rawTray = Math.round((SENSOR_THETA - normalizedTheta) / TRAY_SPACING_DEGS);
        newMarkers.M11_CurrentTray = ((rawTray % 20) + 20) % 20;

        // --- RUNG 7: READY TO PICK ---
        if (newMarkers.M0_2_PosReached && !newMarkers.M0_3_Fault) {
            newMarkers.M0_5_ReadyToPick = true;
            outputs.Q0_3_Ind_Ready = true;
            outputs.Q0_7_Tower_Yellow = true;
        } else {
            newMarkers.M0_5_ReadyToPick = false;
        }

        // --- RUNG 8: COUNTERS ---
        // C4: Harness Supply (Initialize at 100, Decrement on Pick)
        let c4_val = state.counters.C4_Supply || 100;

        // Pick Trigger from HMI (One Shot Logic)
        if (markers.M13_PickTrigger && !newMarkers.M13_PickTrigger_Old) {
            c4_val = Math.max(0, c4_val - 1);
            console.log("PLC: PICK DETECTED -> C4:", c4_val);
            state.setCounter('C4_Supply', c4_val);

            // Auto Reset Trigger
            newMarkers.M13_PickTrigger = false;

            // RED 8: Reset Ready Light
            outputs.Q0_3_Ind_Ready = false;
            outputs.Q0_7_Tower_Yellow = false;
        }
        // Remember old state for edge detection (simulated)
        // In real PLC we use R_TRIG. Here we just rely on the HMI setting it to True and us setting it to False.


        state.updateTags({
            ...outputs,
            ...newMarkers,
            ...analogOutputs
        });

        return { outputs, analogOutputs };
    }
}

export const plc = new PlcProcessor();
