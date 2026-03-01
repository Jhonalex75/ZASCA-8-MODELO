import { Box } from '@react-three/drei';
import * as THREE from 'three';

export const SafetyCage = () => {
    // Create a mesh-like material using a grid texture or high transparency
    // Here we use wireframe for the mesh look + alpha

    return (
        <group position={[0, 1.5, 0]}>
            {/* Front Cage - Left Segment */}
            <mesh position={[-0.3, 0, 2.25]}>
                <planeGeometry args={[0.7, 3.8]} />
                <meshStandardMaterial color="#888" side={THREE.DoubleSide} transparent opacity={0.3} wireframe />
            </mesh>
            {/* Front Cage - Right Segment */}
            <mesh position={[0.3, 0, 2.25]}>
                <planeGeometry args={[0.7, 3.8]} />
                <meshStandardMaterial color="#888" side={THREE.DoubleSide} transparent opacity={0.3} wireframe />
            </mesh>

            {/* Side Meshes - Deep */}
            <mesh position={[0.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[4.5, 3.8]} />
                <meshStandardMaterial color="#888" side={THREE.DoubleSide} transparent opacity={0.3} wireframe />
            </mesh>
            <mesh position={[-0.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[4.5, 3.8]} />
                <meshStandardMaterial color="#888" side={THREE.DoubleSide} transparent opacity={0.3} wireframe />
            </mesh>

            {/* Access Opening Frame (Middle) */}
            <Box args={[0.8, 0.05, 0.05]} position={[0, -0.2, 0.55]} material-color="yellow" />
            <Box args={[0.05, 0.8, 0.05]} position={[-0.4, 0.2, 0.55]} material-color="yellow" />
            <Box args={[0.05, 0.8, 0.05]} position={[0.4, 0.2, 0.55]} material-color="yellow" />

        </group>
    )
}
