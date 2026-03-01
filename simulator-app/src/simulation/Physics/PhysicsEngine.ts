
export class PhysicsEngine {
    // Specs (Based on Annex 01: ZASCA Metalmecánico)
    readonly RADIUS = 0.127; // m (Sprocket 25 Teeth, Pitch 1.25")
    readonly TOTAL_HEIGHT = 3.20; // Approx H + 2R + Base
    readonly SHAFT_DIST = 2.779; // m (2779 mm)
    readonly CHAIN_LENGTH = 6.35; // m (200 Links * 31.75mm)

    // Dynamics
    readonly MASS_TOTAL = 800 + 400; // max load unbalanced scenario (1200kg static)
    // Inertia: MR^2 approx. 1200 * 0.127^2 = 19.35
    readonly INERTIA = 20.0; // kg*m^2 (Updated)
    readonly FRICTION_COEFF = 0.15;

    // Motor Specs
    // Motor Specs (10 HP, 1750 RPM)
    readonly GEAR_RATIO = 120.0; // 40:1 Reducer * 3:1 Chain
    readonly MAX_TORQUE = 1170.0; // Nm approx available at shaft (Doubled for 10HP)

    // State
    public theta: number = 0; // Degrees (0-360)
    public omega: number = 0; // Rad/s
    public alpha: number = 0; // Rad/s^2
    public torque: number = 0; // Nm

    // Helper: Map linear chain pos to 3D point
    getTrayPosition(trayIndex: number): { position: [number, number, number], rotation: number } {
        // 20 trays evenly spaced
        const traySpacing = this.CHAIN_LENGTH / 20;

        // Calculate Linear Position along the chain loop
        const thetaRad = this.theta * (Math.PI / 180);
        const chainDisp = thetaRad * this.RADIUS;
        let linearPos = (trayIndex * traySpacing) + chainDisp;

        // Wrapping
        linearPos = linearPos % this.CHAIN_LENGTH;
        if (linearPos < 0) linearPos += this.CHAIN_LENGTH;

        return this.mapLinearTo3D(linearPos);
    }

    private mapLinearTo3D(L: number): { position: [number, number, number], rotation: number } {
        // ZONES:
        // 1. Left Vertical (Going UP)    : x = -R, y = 0 to H
        // 2. Top Curve (Left to Right)   : Arc
        // 3. Right Vertical (Going DOWN) : x = +R, y = H to 0
        // 4. Bottom Curve (Right to Left): Arc

        const R = this.RADIUS; // 0.4
        const H = this.SHAFT_DIST; // 2.7
        const ArcLen = Math.PI * R; // ~1.25

        let x = 0, y = 0, rot = 0;

        if (L < H) {
            // ZONE 1: LEFT VERTICAL (UP)
            // Starts at Bottom Left (-R, 0) -> Goes to Top Left (-R, H)
            x = -R;
            y = L;
            rot = 0;
        }
        else if (L < H + ArcLen) {
            // ZONE 2: TOP ARC (CW)
            // Center is (0, H)
            // Angle moves from PI (at Left) to 0 (at Right)
            const distInArc = L - H;
            const angle = Math.PI - (distInArc / ArcLen) * Math.PI;

            x = R * Math.cos(angle); // -R to +R
            y = H + R * Math.sin(angle); // Arc goes UP above shaft
            rot = 0; // Keep trays upright
        }
        else if (L < H + ArcLen + H) {
            // ZONE 3: RIGHT VERTICAL (DOWN)
            // Starts at Top Right (R, H) -> Goes to Bottom Right (R, 0)
            const distInVert = L - (H + ArcLen);
            x = R;
            y = H - distInVert;
            rot = 0;
        }
        else {
            // ZONE 4: BOTTOM ARC (CW)
            // Center is (0, 0)
            // Angle moves from 0 (Right) to -PI (Left) => Wait, loop closes at Left (-R,0)
            // Logic: Right is Angle 0. Left is Angle PI.
            // We go 0 -> -PI (CW) or 2PI -> PI ??
            // Let's use negative angle for "under" arc
            const distInArc = L - (2 * H + ArcLen);
            const angle = 0 - (distInArc / ArcLen) * Math.PI; // 0 down to -PI

            x = R * Math.cos(angle);
            y = R * Math.sin(angle); // Dips below 0
            rot = 0;
        }

        return { position: [x, y, 0], rotation: rot };
    }

    /**
     * Updates physics state based on applied torque from Drive.
     * @param dt Delta Time
     * @param appliedTorque Torque from VFD (Nm)
     * @param brake Brake engaged?
     */
    update(dt: number, speedSetpointDegS: number, brake: boolean): {
        theta: number, omega: number, alpha: number, torque: number
    } {
        // USER REQUEST: "Eliminar fuerzas", "Movimiento Uniforme".
        // operating as VFD VELOCITY SERVO.
        // Input 'speedSetpointDegS' is treated as Target Velocity in Deg/s.

        if (brake) {
            this.omega = 0;
            this.alpha = 0;
        } else {
            // Convert to Rad/s
            const targetOmega = speedSetpointDegS * (Math.PI / 180);

            // SLEW RATE LIMITER (Simulate Ramp if not provided, or just smoothing)
            // But Processor provides a Ramp. Let's follow it tightly but with slight inertia.
            const MAX_ACCEL = 5.0; // rad/s^2

            const diff = targetOmega - this.omega;
            const maxChange = MAX_ACCEL * dt;

            if (Math.abs(diff) < maxChange) {
                this.omega = targetOmega;
            } else {
                this.omega += Math.sign(diff) * maxChange;
            }
            // this.omega = targetOmega; // Instant (if we want perfect copy)
        }

        // Integrate
        const deltaTheta = (this.omega * (180 / Math.PI)) * dt;
        this.theta += deltaTheta;

        // Wrap at Full Chain Cycle
        const CYCLE_DEGS = (this.CHAIN_LENGTH / this.RADIUS) * (180 / Math.PI);

        this.theta = this.theta % CYCLE_DEGS;
        if (this.theta < 0) this.theta += CYCLE_DEGS;

        this.torque = 0; // Simulated torque is zero (Kinematic Mode)

        return {
            theta: this.theta,
            omega: this.omega,
            alpha: 0,
            torque: 0
        };
    }
}

export const physicsEngine = new PhysicsEngine();
