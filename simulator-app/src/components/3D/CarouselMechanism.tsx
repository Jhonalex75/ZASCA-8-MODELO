import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import { physicsEngine } from '../../simulation/Physics/PhysicsEngine';
import * as THREE from 'three';
import { TrayContents } from './TrayContents';
import { usePlcStore } from '../../store/usePlcStore';

const EncoderVisual = () => {
    // Subscribe to PLC Store for minimal re-renders
    const pulses = usePlcStore(state => state.analogInputs.IW66_EncoderPulses);
    const theta = usePlcStore(state => state.markers.M20_Theta);

    return (
        <group position={[physicsEngine.RADIUS + 0.3, 0, 1.2]} rotation={[0, Math.PI / 2, 0]}>
            {/* Encoder Body */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.08, 0.08, 0.1, 32]} />
                <meshStandardMaterial color="orange" />
            </mesh>

            {/* Mounting Bracket */}
            <Box position={[0, -0.1, 0]} args={[0.05, 0.2, 0.05]}>
                <meshStandardMaterial color="gray" />
            </Box>

            {/* Floating Label */}
            <group position={[0, 0.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <Text
                    fontSize={0.15}
                    color="white"
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.02}
                    outlineColor="black"
                >
                    {`Encoder: ${pulses}\nAngle: ${theta.toFixed(1)}°`}
                </Text>
            </group>
        </group>
    );
};

const TRAY_COUNT = 20;

const Tray = ({ index }: { index: number }) => {
    const groupRef = useRef<THREE.Group>(null!);

    useFrame(() => {
        // Use the active PhysicsEngine to get position based on current Theta
        // The engine is updated by SimulationLoop every frame.
        const { position } = physicsEngine.getTrayPosition(index);

        // Check for Discharge Position (User Req: X=0.40, Y=0.40, Z=0)
        // Note: Z is typically 0 in this 2D-on-3D plane, but we check distance in XY plane primarily.
        const dx = position[0] - 0.40;
        const dy = position[1] - 0.40;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Visual Feedback: Turn RED if at discharge point (tolerance increased to 0.1 for visibility while moving)
        const isAtDischarge = dist < 0.1;

        // Apply
        groupRef.current.position.set(position[0], position[1], position[2]);

        // Update Color ref directly for performance? Or just re-render is fine for 20 items.
        // Accessing mesh material directly is better.
        const boxMesh = groupRef.current.children[0] as THREE.Mesh;
        if (boxMesh && boxMesh.material) {
            (boxMesh.material as THREE.MeshStandardMaterial).color.set(isAtDischarge ? "#ef4444" : "#e2e8f0"); // Red-500 vs Slate-200
        }
    });

    return (
        <group ref={groupRef}>
            {/* Tray Dimensions from User Request: Depth 400mm, Length 2437mm */}
            <Box args={[0.4, 0.05, 2.437]}>
                <meshStandardMaterial color="#e2e8f0" /> {/* Default Color */}
                {/* ID Label Sticker front */}
                <group position={[0, 0.026, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
                    <mesh position={[0, 0, 0]}>
                        <planeGeometry args={[0.2, 0.1]} />
                        <meshStandardMaterial color="white" />
                    </mesh>
                    <Text position={[0, 0, 0.01]} fontSize={0.08} color="black" anchorX="center" anchorY="middle">
                        {`POS ${index}`}
                    </Text>
                </group>
            </Box>
            {/* Tray ID is 1-based, index is 0-based. But User sees 0-19 in lists? 
                Let's match DB. DB has IDs 0-19. 
                Label says "POS {index}".
            */}
            <TrayContents trayId={index} />
            <Box position={[0, 0.15, -0.1]} args={[0.05, 0.3, 0.05]} material-color="#333" />
        </group>
    );
};

export const CarouselMechanism = () => {


    return (
        <group position={[0, 0.5, 0]}>
            {/* Trays */}
            {Array.from({ length: TRAY_COUNT }).map((_, i) => (
                <Tray key={i} index={i} />
            ))}

            {/* Sprockets - Dynamic Size based on Physics */}
            {/* Extended Axle/Frame to match Tray Length (2.437m) -> 2.6m */}
            {/* Sprockets - Dynamic Size based on Physics */}
            {/* Extended Axle/Frame to match Tray Length (2.437m) -> 2.6m */}
            {/* Sprockets - Dynamic Size based on Physics */}
            {/* Extended Axle/Frame to match Tray Length (2.437m) -> 2.6m */}
            {/* Black Rollers removed per User Request for better visibility */}

            {/* Encoder Visualization on Bottom Shaft */}
            <EncoderVisual />
        </group>
    );
};
