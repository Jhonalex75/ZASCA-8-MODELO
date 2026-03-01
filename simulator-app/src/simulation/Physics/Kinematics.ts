import type { Vector3Tuple } from 'three';

export class Kinematics {
    // Config
    // Total Height 3.5m
    // Radius of sprockets approx 0.4m (Diameter 0.8m for tray stability)
    readonly RADIUS = 0.4;
    readonly VERTICAL_HEIGHT = 3.5;
    readonly STRAIGHT_LENGTH = 3.5 - (0.4 * 2); // 2.7m
    // Loop: Up(2.7) + ArcTop(PI*0.4) + Down(2.7) + ArcBottom(PI*0.4)
    // L = 2.7 + 1.256 + 2.7 + 1.256 = ~7.91m
    readonly CHAIN_LENGTH = (this.STRAIGHT_LENGTH * 2) + (Math.PI * this.RADIUS * 2);

    readonly MAX_SPEED = 0.5; // m/s
    readonly ACCELERATION = 0.5; // m/s^2

    // State
    public position: number = 0; // Current position on the loop (0 to CHAIN_LENGTH)
    public velocity: number = 0; // Current linear velocity m/s

    update(dt: number, motorForce: number) {
        const targetSpeed = motorForce * this.MAX_SPEED;

        if (this.velocity < targetSpeed) {
            this.velocity += this.ACCELERATION * dt;
            if (this.velocity > targetSpeed && motorForce >= 0) this.velocity = targetSpeed;
        } else if (this.velocity > targetSpeed) {
            this.velocity -= this.ACCELERATION * dt;
            if (this.velocity < targetSpeed && motorForce <= 0) this.velocity = targetSpeed;
        }

        this.position += this.velocity * dt;

        // Wrap around
        if (this.position >= this.CHAIN_LENGTH) {
            this.position -= this.CHAIN_LENGTH;
        } else if (this.position < 0) {
            this.position += this.CHAIN_LENGTH;
        }
    }

    // Calculate 3D position (x, y, z) and Rotation (angle) from Linear Position
    // Loop starts at Bottom Center (0,0) going Right (CCW standard?) or Up?
    // Let's assume Standard Paternoster:
    // 0: Bottom Center. moving Right? No, sprockets are usually top/bottom.
    // Let's model:
    // Section 1: Bottom Arc (0 to PI*R) -> -180 to 0 deg ??
    // Let's define 0 at SPROCKET_BOTTOM_CENTER (lowest point).
    // Motion CCW (Right side go UP, Left side go DOWN).

    // actually simpler: 0 is Bottom Right Tangent point.
    // 0 -> S (Straight Up)
    // S -> S + Arc (Top Curve)
    // S + Arc -> 2S + Arc (Straight Down)
    // 2S + Arc -> 2S + 2Arc (Bottom Curve)

    getPointAt(pos: number): { position: Vector3Tuple, rotation: number } {
        const S = this.STRAIGHT_LENGTH;
        const arcLen = Math.PI * this.RADIUS;

        // Normalize pos
        let p = pos % this.CHAIN_LENGTH;
        if (p < 0) p += this.CHAIN_LENGTH;

        let x = 0, y = 0, angle = 0;

        // 1. Right side Going UP (Straight)
        // Starts at (R, R) assuming origin is Bottom Left corner of bounding box?
        // Let's put Origin at (0,0,0) = Bottom Center of machine.
        // Right Sprocket Center = (0, R). Wait, sprockets are vertical.
        // Bottom Sprocket Center = (0, R). Top Sprocket Center = (0, R + S).

        // Let's try: Origin = Center of Bottom Sprocket.
        // 0 position = Right side tangent (R, 0).

        if (p < S) {
            // Moving Up on Right side
            x = this.RADIUS;
            y = p;
            angle = 0;
        }
        // 2. Top Arc (Semi-circle 0 to 180 deg)
        else if (p < S + arcLen) {
            const arcP = p - S;
            const theta = (arcP / arcLen) * Math.PI; // 0 to PI
            // Center of Top Sprocket is (0, S)
            x = this.RADIUS * Math.cos(theta); // Starts at R, goes to -R
            y = S + this.RADIUS * Math.sin(theta); // Goes Up then Down
            angle = theta; // For tray stability? 
            // Trays stay horizontal, so rotation is technically 0?
            // But if we want to visualize the chain link, it rotates.
            // The function returns chain position. The Tray uses this x,y but keeps rotation 0.
        }
        // 3. Left side Going DOWN (Straight)
        else if (p < S + arcLen + S) {
            const straightP = p - (S + arcLen);
            // Top Left Tangent is (-R, S)
            x = -this.RADIUS;
            y = S - straightP;
            angle = Math.PI;
        }
        // 4. Bottom Arc
        else {
            const arcP = p - (2 * S + arcLen);
            const theta = Math.PI + (arcP / arcLen) * Math.PI; // PI to 2PI
            // Center of Bottom Sprocket is (0, 0)
            x = this.RADIUS * Math.cos(theta);
            y = this.RADIUS * Math.sin(theta);
            angle = theta;
        }

        return { position: [x, y, 0], rotation: angle };
    }
}

export const physicsInstance = new Kinematics();
