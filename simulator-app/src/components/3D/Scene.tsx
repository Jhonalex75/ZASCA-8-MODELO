import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, Text } from '@react-three/drei';
import { SimulationLoop } from '../../simulation/SimulationLoop';
import { CarouselMechanism } from './CarouselMechanism';
import { Structure } from './Structure';
import { SafetyCage } from './SafetyCage';
import { LoadingZones } from './LoadingZones';

export const Scene = () => {
    return (
        <div className="w-full h-full relative bg-industrial-900">
            <Canvas shadows camera={{ position: [4, 2.5, 6], fov: 45 }}>
                {/* Simulation Core */}
                <SimulationLoop />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <spotLight
                    position={[5, 8, 5]}
                    angle={0.5}
                    penumbra={1}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                />

                {/* Environment */}
                <Grid
                    args={[30, 30]}
                    cellColor="#475569"
                    sectionColor="#334155"
                    fadeDistance={25}
                    fadeStrength={1}
                />
                <Environment preset="warehouse" />
                <ContactShadows opacity={0.5} scale={20} blur={2} far={4} resolution={256} color="#000000" />

                {/* Controls */}
                <OrbitControls makeDefault target={[0, 2, 0]} maxPolarAngle={Math.PI / 1.8} />

                {/* Industrial Machine */}
                <group>
                    <CarouselMechanism />
                    <Structure />
                    <SafetyCage />
                    <LoadingZones />
                </group>

                {/* Coordinate Helper (User Request) */}
                <group position={[0, 0, 0]}>
                    <axesHelper args={[2]} />
                    {/* Using Drei Text for labels */}
                    <Text position={[2.2, 0, 0]} color="red" fontSize={0.2} anchorX="left">X (Width)</Text>
                    <Text position={[0, 2.2, 0]} color="green" fontSize={0.2} anchorX="left">Y (Height)</Text>
                    <Text position={[0, 0, 2.2]} color="blue" fontSize={0.2} anchorX="left">Z (Length/Depth)</Text>
                </group>

            </Canvas>

            {/* Overlay UI (Status) */}
            <div className="absolute bottom-4 left-4 bg-black/80 p-4 rounded-lg text-xs font-mono text-green-400 backdrop-blur-md border border-green-900 pointer-events-none select-none shadow-2xl z-10">
                <h3 className="text-siemens-accent font-bold mb-2 border-b border-gray-700 pb-1">SIMULATION DIAGNOSTICS</h3>
                <div className="space-y-1">
                    <p className="flex justify-between gap-4"><span>SYSTEM:</span> <span className="text-white">ONLINE</span></p>
                    <p className="flex justify-between gap-4"><span>SCAN:</span> <span className="text-white">50ms</span></p>
                    <p className="flex justify-between gap-4"><span>FPS:</span> <span className="text-white">60</span></p>
                </div>
            </div>
        </div>
    );
};
