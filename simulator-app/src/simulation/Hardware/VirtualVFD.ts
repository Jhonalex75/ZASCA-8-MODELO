
import { CalibrationConfig } from '../CalibrationConfig';

export class VirtualVFD {
    // --- specs (Siemens G120C 1.1kW) ---
    readonly RATED_CURRENT = 3.1; // Amps (LO)
    readonly MAX_CURRENT = 4.7; // Amps (150% overload)

    // --- Parameters (G120 numbering) ---
    // P1080 Min Frequency
    public MinFreq_P1080: number = CalibrationConfig.VFD.MIN_FREQ_HZ;
    // P1082 Max Frequency
    public MaxFreq_P1082: number = CalibrationConfig.VFD.MAX_FREQ_HZ;
    // P1120 Ramp Up Time (0 -> MaxFreq)
    public RampUp_P1120: number = CalibrationConfig.VFD.RAMP_UP_SEC;
    // P1121 Ramp Down Time (MaxFreq -> 0)
    public RampDown_P1121: number = CalibrationConfig.VFD.RAMP_DOWN_SEC;

    // --- State ---
    public outputFrequency: number = 0.0; // Hz current output
    public outputVoltage: number = 0.0;   // V eff
    public outputCurrent: number = 0.0;   // A eff
    public dcLinkVoltage: number = 680;   // V DC
    public isRun: boolean = false;

    // --- Control I/O ---
    // Input: Speed Setpoint (0-100% or 0-16384 word)
    // 0-100% simplifies logic.

    update(dt: number, setpointPercent: number, enable: boolean): void {
        this.isRun = enable;

        let targetFreq = 0;

        if (enable) {
            // Scale Setpoint to Frequency
            // 100% = P1082 (Max Freq)
            // ALLOW NEGATIVE for Bidirectional (Shortest Path)
            const rawSetpoint = Math.max(-100, Math.min(100, setpointPercent));
            targetFreq = (rawSetpoint / 100) * this.MaxFreq_P1082;

            // Apply Min Freq Clamp (Vector Magnitude)
            const absTarget = Math.abs(targetFreq);
            if (absTarget > 0 && absTarget < this.MinFreq_P1080) {
                targetFreq = this.MinFreq_P1080 * Math.sign(targetFreq);
            }
        } else {
            targetFreq = 0; // OFF
        }

        // --- Ramp Generator ---
        // Rate of change (Hz per sec)
        // RampUp: P1082 / P1120
        const rampUpRate = this.MaxFreq_P1082 / Math.max(0.1, this.RampUp_P1120);
        const rampDownRate = this.MaxFreq_P1082 / Math.max(0.1, this.RampDown_P1121);

        if (this.outputFrequency < targetFreq) {
            // Accelerating
            this.outputFrequency += rampUpRate * dt;
            if (this.outputFrequency > targetFreq) this.outputFrequency = targetFreq;
        } else if (this.outputFrequency > targetFreq) {
            // Decelerating
            this.outputFrequency -= rampDownRate * dt;
            if (this.outputFrequency < targetFreq) this.outputFrequency = targetFreq;
        }

        // --- V/f Characteristic (Simplified) ---
        // For AC induction motors, V is proportional to f to maintain flux.
        // Base: 460V @ 60Hz.
        const vPerHz = 460 / 60;
        this.outputVoltage = this.outputFrequency * vPerHz;

        // Simulation of Current (Amps) logic is done in calculateTorque
    }

    /**
     * Calculates the torque the motor SHOULD produce given the current VFD state vs Physics state.
     * This acts as the bridge to the PhysicsEngine.
     * @param motorSpeedRadS Current mechanical speed of rotor
     * @param maxMotorTorque Parameter from SEW motor specs
     */
    calculateTorque(motorSpeedRadS: number, maxMotorTorque: number): number {
        // Convert VFD electrical frequency to Synchronous Speed (rad/s)
        // 6 Pole Motor @ 60Hz = 1200 RPM.
        // SyncRPM = (120 * f) / Poles
        // SyncRadS = SyncRPM * (2PI / 60)

        const POLES = 6;
        const syncRPM = (120 * this.outputFrequency) / POLES;
        const syncRadS = syncRPM * (Math.PI / 30);

        // Slip = Sync - Actual
        const slip = syncRadS - motorSpeedRadS;

        // Standard Induction Motor Torque Curve approximation:
        // Torque is proportional to Slip in the linear region (working range).
        // Let's assume Rated Slip is ~3% of Rated Speed.
        // Rated Speed @ 60Hz = 1750 RPM. Sync = 1800. Difference = 50 RPM slip.
        // 50 RPM = 5.23 rad/s slip generates RATED TORQUE.

        const ratedSlipRadS = 5.23;

        // Torque factor (ratio of rated torque)
        // If slip is positive (Sync > Rotor), we are motoring.
        // If slip is negative (Sync < Rotor), we are regenerating (braking).
        let torqueRatio = slip / ratedSlipRadS;

        // Vector Control (SLVC) allows torque boosting beyond simple slip curves,
        // effectively clamping it to Max Torque / Limit.

        // G120C Current Limit Simulation:
        // We clamp the available torque to the VFD's current limit capabilities (150%).
        const TORQUE_LIMIT_FACTOR = 1.5;

        if (torqueRatio > TORQUE_LIMIT_FACTOR) torqueRatio = TORQUE_LIMIT_FACTOR;
        if (torqueRatio < -TORQUE_LIMIT_FACTOR) torqueRatio = -TORQUE_LIMIT_FACTOR;

        // --- VECTOR CONTROL SIMULATION (Low Speed Torque Injection) ---
        // At low speeds (approx < 10% of rated, i.e., < 15 rad/s), standard V/f logic fails (Slip becomes noise).
        // Real VFDs switch to Current Control. We simulate this by DIRECTLY mapping the "Frequency Command" 
        // (which comes from PID Output) to "Torque Command".

        const LOW_SPEED_THRESHOLD = 15.0; // rad/s (Increased to cover the approach phase)

        if (Math.abs(motorSpeedRadS) < LOW_SPEED_THRESHOLD) {
            // We are in Low Speed / Approach Zone.
            // Trust the PID Command (this.outputFrequency target) more than Slip.

            // Normalize command: 80Hz = 100% Torque.
            // If PID sends 40Hz -> 50% Torque. 
            // Gain Factor: 2.0 -> "Stiffness".
            const commandTorque = (this.outputFrequency / this.MaxFreq_P1082) * 2.5;

            // Weighted Blend:
            // At 0 speed: 100% Command, 0% Slip.
            // At Threshold: 0% Command, 100% Slip.
            const blend = 1.0 - (Math.abs(motorSpeedRadS) / LOW_SPEED_THRESHOLD);

            // Apply Blend
            if (Math.abs(commandTorque) > Math.abs(torqueRatio)) {
                // Only boost if command is stronger than slip physics
                torqueRatio = (torqueRatio * (1 - blend)) + (commandTorque * blend);
            }
        }

        // Resulting Torque
        let finalTorque = torqueRatio * (maxMotorTorque / 1500) * 1000; // rough scale, assuming maxMotorTorque is breakage
        // Wait, better usage:
        // maxMotorTorque passed in is the physical limit of the motor (SEW spec 1580 Nm?). 
        // No, SEW spec 1580 Nm is OUTPUT torque after gear.
        // The VFD drives the MOTOR SHAFT torque.
        // SEW DRE90M4: 1.1kW, 1750 RPM -> 6 Nm Rated Torque at Motor Shaft.
        // 6 Nm * 366.1 (Gear) * Efficiency (~0.95?) ~= 2000 Nm.
        // Okay, so we should work in MOTOR SHAFT domain or OUTPUT SHAFT domain?
        // PhysicsEngine works in OUTPUT SHAFT domain (Carousel rotation).
        // It's easier to simulate the VFD outputting "Effective Output Torque" directly scaled.

        // Let's treat maxMotorTorque as the RATED OUTPUT TORQUE (1580 Nm).

        finalTorque = torqueRatio * maxMotorTorque;

        // Calculate fake Amps for display
        // Amps ~ Torque. Idling = 30% of rated.
        const loadFactor = Math.abs(finalTorque) / maxMotorTorque;
        this.outputCurrent = (0.3 + (0.7 * loadFactor)) * this.RATED_CURRENT;

        return finalTorque;
    }
}

export const vfd = new VirtualVFD();
