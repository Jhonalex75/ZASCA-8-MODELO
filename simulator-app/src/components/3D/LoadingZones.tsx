import { Text } from '@react-three/drei';

export const LoadingZones = () => {
    return (
        <group>
            {/* Feeding Point (Loading) - Usually at waist height, maybe rear or front */}
            <group position={[-0.7, 1.0, 0]}>
                <Text
                    position={[0, 0.5, 0]}
                    fontSize={0.15}
                    color="#facc15"
                    anchorX="center"
                    anchorY="middle"
                    rotation={[0, Math.PI / 2, 0]}
                >
                    FEEDING POINT
                </Text>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.3, 0.35, 32]} />
                    <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.5} />
                </mesh>
                {/* Visual arrow or marker */}
                <mesh position={[0, -0.4, 0]} rotation={[0, 0, -Math.PI / 4]}>
                    <boxGeometry args={[0.1, 0.8, 0.1]} />
                    <meshStandardMaterial color="#facc15" />
                </mesh>
            </group>

            {/* Discharge Point (Unloading) - Operation height */}
            <group position={[0.7, 1.0, 0]}>
                <Text
                    position={[0, 0.5, 0]}
                    fontSize={0.15}
                    color="#4ade80"
                    anchorX="center"
                    anchorY="middle"
                    rotation={[0, -Math.PI / 2, 0]}
                    fillOpacity={0.9}
                >
                    DISCHARGE POINT
                </Text>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.3, 0.35, 32]} />
                    <meshStandardMaterial color="#4ade80" emissive="#4ade80" emissiveIntensity={0.5} />
                </mesh>
            </group>
        </group>
    );
};
