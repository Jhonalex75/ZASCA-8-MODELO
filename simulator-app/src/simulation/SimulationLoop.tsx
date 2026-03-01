import { useFrame } from '@react-three/fiber';
import { usePlcStore } from '../store/usePlcStore';
import { physicsEngine } from './Physics/PhysicsEngine';
import { plc } from './PLC/Processor';
import { vfd } from './Hardware/VirtualVFD';

export const SimulationLoop = () => {
    const updateFromPhys = usePlcStore(s => s.updateFromPhys);

    useFrame((_, delta) => {
        // Clamp delta to prevent explosion on tab switch
        const dt = Math.min(delta, 0.1);

        // 1. PLC Scan (Decide Logic)
        const { outputs, analogOutputs } = plc.scan(dt);

        // 2. VFD Update (Electrical Layer)
        // PLC QW64 (0-100%) -> VFD Setpoint
        // Motor Enabled if Brake Released (Q0.1) AND MotorOn (Q0.0) generally, 
        // but typically VFD Run is a separate bit. Let's assume Q0.0 is VFD RUN.
        const vfdEnable = outputs.Q0_0_MotorOn;
        const speedSetpoint = analogOutputs.QW64_SpeedSetpoint;

        vfd.update(dt, speedSetpoint, vfdEnable);

        // 3. Physics Update (Mechanical Layer)
        // VFD calculates torque based on current speed (Closed Loop or SLVC simulation)
        const brakeReleased = outputs.Q0_1_BrakeRelease;

        // Feed current physical speed back to VFD for torque calc
        // CRITICAL: VFD needs MOTOR SHAFT Speed (High Speed), but Physics has CAROUSEL SHAFT Speed (Low Speed).
        // Multiply by Gear Ratio to reflect back to motor.
        const motorTorque = vfd.calculateTorque(physicsEngine.omega * physicsEngine.GEAR_RATIO, physicsEngine.MAX_TORQUE);

        const physState = physicsEngine.update(dt, motorTorque, !brakeReleased);

        // 4. Sensor Feedback (Physics -> PLC Store)
        // Map Theta to Encoder Pulses (IW66)
        const pulses = Math.floor(physState.theta * 10);

        // Update Store with Physics Telemetry
        updateFromPhys(
            {},
            { IW66_EncoderPulses: pulses },
            {
                M20_Theta: physState.theta,
                M24_Omega: physState.omega,
                M28_Alpha: physState.alpha,
                M32_Torque: physState.torque
            }
        );
    });

    return null;
};
