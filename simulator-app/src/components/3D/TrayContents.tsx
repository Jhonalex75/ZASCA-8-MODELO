import { Box, Text } from '@react-three/drei';

import { usePlcStore } from '../../store/usePlcStore';

const EMPTY_ARRAY: string[] = [];

export const TrayContents = ({ trayId }: { trayId: number }) => {

    // Select this tray's data from dynamic store
    const trayData = usePlcStore(state => state.trayDb.find(t => t.id === trayId));
    // Selector optimization: return the array directly. 
    // Zustand uses strict equality (===) by default. 
    // This will only re-render if the returned array reference changes.
    // We utilize a static empty array to keep equality when not presented.
    const presentedHarnesses = usePlcStore((state) =>
        state.presentedTrayId === trayId ? state.presentedHarnesses : EMPTY_ARRAY
    );

    const reflexSensor = usePlcStore(state => state.inputs.I0_6_ReflexSensor);

    if (!trayData) return null;

    return (
        <group position={[0, 0, 0]}>
            {trayData.slots.map((slot, i) => {
                if (slot.count === 0) return null; // Empty slot

                // Longitudinal Layout: 6 slots along X axis? Or Z axis? 
                // User said "Longitudinal". In a tray (Width 1.5m, Depth 1.0m), 
                // Longitudinal usually means parallel to the long side or depth.
                // Let's divide Width (1.5m) into 6 lanes.

                // Distribute along Z-Axis (Depth/Length)
                // Tray Length: 2.437m.
                // Usable space: ~2.2m. Center is 0.
                // 6 Slots. Step = 2.2 / 5 = 0.44m
                // Start = -1.1
                const zSlotPos = -1.1 + (i * 0.44);

                // Presentation Logic: Slide OUT (X) by 0.2m if presented AND Sensor Active
                // "Sensor los lea y al RETIRAR el sensor debe desactivarse"
                const isPresented = presentedHarnesses.includes(slot.type);
                const shouldAnimate = isPresented && reflexSensor;
                const xPos = shouldAnimate ? 0.2 : 0;
                const yPos = 0.15; // Constant height

                return (
                    <group key={i} position={[xPos, yPos, zSlotPos]}>
                        {/* Harness Bundle Visual - CUBES (Reduced Size: 0.15) */}
                        <Box args={[0.15, 0.15, 0.15]} material-color={slot.color}>
                            <meshStandardMaterial color={slot.color} roughness={0.6} />
                        </Box>

                        {/* Label - Dark Background, White Text */}
                        <group position={[0, 0.1, 0.20]}>
                            <Box args={[0.18, 0.05, 0.01]} material-color="#111" />
                            <Text
                                position={[0, 0, 0.01]}
                                fontSize={0.03}
                                color="white"
                                anchorX="center"
                                anchorY="middle"
                            >
                                {`${slot.type} (${slot.count})`}
                            </Text>
                        </group>
                    </group>
                )
            })}
        </group>
    );
}
