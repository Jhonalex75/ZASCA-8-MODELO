import { useRef, memo } from 'react';
import { Box, Cylinder, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { usePlcStore } from '../../store/usePlcStore';

// Dynamic Component: Updates frequently with Encoder
const EncoderVisual = () => {
    const encoderRef = useRef<any>(null);
    // Subscribe only to relevant markers to avoid unnecessary re-renders.
    // M11 changes every frame, so this component WILL re-render 60fps.
    // But it is very lightweight (just a cylinder and div), unlike the main Structure.
    const { M0_1_Moving, M11_CurrentTray } = usePlcStore(state => state.markers);

    useFrame((_, delta) => {
        if (encoderRef.current && M0_1_Moving) {
            encoderRef.current.rotation.z += delta * 5;
        }
    });

    // Safety check for NaN
    const displayValue = (M11_CurrentTray !== undefined && !isNaN(M11_CurrentTray))
        ? M11_CurrentTray.toFixed(1)
        : "0.0";

    return (
        <group position={[0.75 + 0.2, -4.2 / 2 + 0.5, 0]}>
            <Cylinder ref={encoderRef} args={[0.15, 0.15, 0.1, 16]} rotation={[Math.PI / 2, 0, 0]} material-color="#444">
                <Box args={[0.2, 0.02, 0.12]} material-color="silver" />
            </Cylinder>
            <Html position={[0, 0.3, 0]} transform scale={0.2} occlude>
                <div className="bg-white text-black text-xs p-1 rounded font-mono border border-gray-500 whitespace-nowrap">
                    ENC: {displayValue}
                </div>
            </Html>
        </group>
    );
};

// Dynamic Component: Updates with Reflex Signal
const ReflexSensor = () => {
    // Correct store key is I0_6_ReflexSensor
    const isBlocked = usePlcStore(state => state.inputs.I0_6_ReflexSensor);

    // Position Calculation:
    // User requested Sensor at World (X=0.50, Y=0.34, Z=0).
    // Structure Group is centered at World Y = 1.6 (approx).
    // So Local Y = 0.34 - 1.6 = -1.26.
    return (
        <group position={[0.5, -1.26, 0]}>
            <Box args={[0.05, 0.1, 0.05]} material-color="black" />
            {/* Status LED Centered */}
            <Box args={[0.02, 0.02, 0.02]} position={[0, 0, 0.026]} material-color={isBlocked ? "red" : "green"} />
            {/* Label Centered */}
            <Html position={[0, -0.1, 0]} transform scale={0.2} occlude>
                <div className="bg-black text-white text-xs p-1 rounded font-mono border border-gray-500 whitespace-nowrap flex flex-col items-center">
                    <span>REFLEX</span>
                    <span className={isBlocked ? "text-red-500 font-bold" : "text-green-500"}>
                        {isBlocked ? "BLOCKED" : "READY"}
                    </span>
                </div>
            </Html>
        </group>
    );
};

export const Structure = memo(() => {
    const PILLAR_HEIGHT = 4.2;
    const WIDTH = 1.0;
    const DEPTH = 4.5;
    const COLOR_FRAME = "#0060A9";
    const COLOR_BEAM = "#FF6600";

    return (
        <group position={[0, PILLAR_HEIGHT / 2 - 0.5, 0]}>
            {/* 4 Corner Pillars */}
            <Box args={[0.1, PILLAR_HEIGHT, 0.1]} position={[WIDTH / 2, 0, DEPTH / 2]} material-color={COLOR_FRAME} />
            <Box args={[0.1, PILLAR_HEIGHT, 0.1]} position={[-WIDTH / 2, 0, DEPTH / 2]} material-color={COLOR_FRAME} />
            <Box args={[0.1, PILLAR_HEIGHT, 0.1]} position={[WIDTH / 2, 0, -DEPTH / 2]} material-color={COLOR_FRAME} />
            <Box args={[0.1, PILLAR_HEIGHT, 0.1]} position={[-WIDTH / 2, 0, -DEPTH / 2]} material-color={COLOR_FRAME} />

            {/* Top Beams */}
            <Box args={[WIDTH + 0.1, 0.15, 0.1]} position={[0, PILLAR_HEIGHT / 2, DEPTH / 2]} material-color={COLOR_BEAM} />
            <Box args={[WIDTH + 0.1, 0.15, 0.1]} position={[0, PILLAR_HEIGHT / 2, -DEPTH / 2]} material-color={COLOR_BEAM} />
            <Box args={[0.1, 0.15, DEPTH + 0.1]} position={[WIDTH / 2, PILLAR_HEIGHT / 2, 0]} material-color={COLOR_BEAM} />
            <Box args={[0.1, 0.15, DEPTH + 0.1]} position={[-WIDTH / 2, PILLAR_HEIGHT / 2, 0]} material-color={COLOR_BEAM} />

            {/* Bottom Beams (Base) */}
            <Box args={[WIDTH + 0.1, 0.15, 0.1]} position={[0, -PILLAR_HEIGHT / 2 + 0.1, DEPTH / 2]} material-color={COLOR_FRAME} />
            <Box args={[WIDTH + 0.1, 0.15, 0.1]} position={[0, -PILLAR_HEIGHT / 2 + 0.1, -DEPTH / 2]} material-color={COLOR_FRAME} />

            {/* Cross Bracing (Back) */}
            <Box args={[WIDTH * 1.2, 0.05, 0.05]} position={[0, 0, -DEPTH / 2]} rotation={[0, 0, 0.5]} material-color="#333" />
            <Box args={[WIDTH * 1.2, 0.05, 0.05]} position={[0, 0, -DEPTH / 2]} rotation={[0, 0, -0.5]} material-color="#333" />

            {/* SENSORS & ACTUATORS - Now Isolated */}
            <ReflexSensor />
            <EncoderVisual />

        </group>
    );
});
