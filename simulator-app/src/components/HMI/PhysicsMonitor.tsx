import { useEffect, useRef } from 'react';
import { physicsEngine } from '../../simulation/Physics/PhysicsEngine';
import { usePlcStore } from '../../store/usePlcStore';
import { useShallow } from 'zustand/react/shallow';
import { Radio } from 'lucide-react';

export const PhysicsMonitor = () => {
    // Refs for DOM updates (High Freq)
    const omegaRef = useRef<HTMLSpanElement>(null);
    const accelRef = useRef<HTMLSpanElement>(null);
    const torqueRef = useRef<HTMLSpanElement>(null);
    const motorRpmRef = useRef<HTMLSpanElement>(null);
    const posXRef = useRef<HTMLSpanElement>(null);
    const posYRef = useRef<HTMLSpanElement>(null);
    const posZRef = useRef<HTMLSpanElement>(null);
    const targetThetaRef = useRef<HTMLSpanElement>(null);
    const trayLabelRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Graph Data
    const graphData = useRef<{ sp: number[], av: number[] }>({
        sp: new Array(100).fill(0),
        av: new Array(100).fill(0)
    });

    // Track previous Velocity for Accel calc
    const prevOmega = useRef(0);
    const lastTime = useRef(performance.now());

    // Connect to Store to get Target Tray (Low Freq update is fine for the ID)
    const { M10_TargetTray } = usePlcStore(useShallow(state => state.markers));

    useEffect(() => {
        let frameId: number;

        const update = () => {
            const now = performance.now();
            const dt = (now - lastTime.current) / 1000;
            lastTime.current = now;

            // 1. Get Global Physics (Machine State)
            const { omega, torque } = physicsEngine;

            // Get PLC State for Graph
            const state = usePlcStore.getState();
            // Speed Setpoint is 0-100% or similar. Let's normalize/scale if needed.
            // In VFD, 100% = MaxFreq (87Hz).
            // Let's plot raw values or normalized.
            // Omega is rad/s. Max Omega ~ 15 rad/s (approx).
            // SpeedSetpoint (QW64) is 0-100 (%).
            // Let's plot both normalized to -100..100 range or just raw scaled.
            // Omega 15 rad/s ~ 150 (x10).
            // Setpoint 100% ~ 100.

            const sp = state.analogOutputs.QW64_SpeedSetpoint || 0;
            const av = omega * 6.0; // Scale approx to match 0-100 range (15rad/s * 6 = 90)

            // Update Graph Data
            const gd = graphData.current;
            gd.sp.shift(); gd.sp.push(sp);
            gd.av.shift(); gd.av.push(av);

            // 2. Derive Acceleration (Alpha)
            // alpha = dw/dt
            const alpha = dt > 0 ? (omega - prevOmega.current) / dt : 0;
            prevOmega.current = omega;

            // 3. Get Tray Position (Specific to Target)
            const { position } = physicsEngine.getTrayPosition(M10_TargetTray);
            const [x, y, z] = position;

            // Check if at Target (approx)
            // We use M0_2_PosReached or check error locally
            const atTarget = state.markers.M0_2_PosReached;

            // 4. Update DOM
            if (omegaRef.current) omegaRef.current.innerText = `${Math.abs(omega).toFixed(3)}`; // Rad/s
            if (accelRef.current) accelRef.current.innerText = `${Math.abs(alpha).toFixed(2)}`; // Rad/s^2
            if (torqueRef.current) torqueRef.current.innerText = `${Math.abs(torque).toFixed(1)}`; // Nm

            // Calculate Motor RPM: OutputRadS * GearRatio * (60/2PI)
            const motorRpm = Math.abs(omega) * 366.1 * 9.5493;
            if (motorRpmRef.current) motorRpmRef.current.innerText = `${motorRpm.toFixed(0)}`;

            // USE LOCAL STORE VALUE for Target Theta
            const freshMarkers = usePlcStore.getState().markers;
            if (targetThetaRef.current) targetThetaRef.current.innerText = `${freshMarkers.M36_TargetTheta.toFixed(1)}`;

            if (posXRef.current) posXRef.current.innerText = `${x.toFixed(2)}`;
            if (posYRef.current) posYRef.current.innerText = `${y.toFixed(2)}`;
            if (posZRef.current) posZRef.current.innerText = `${z.toFixed(2)}`;

            if (trayLabelRef.current) trayLabelRef.current.innerText = `BANDEJA #${M10_TargetTray}`;

            // 5. Draw Graph
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    const w = canvasRef.current.width;
                    const h = canvasRef.current.height;
                    const zeroy = h / 2;

                    ctx.clearRect(0, 0, w, h);

                    // Grid
                    ctx.strokeStyle = '#164e63'; // cyan-900
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, zeroy); ctx.lineTo(w, zeroy);
                    ctx.stroke();

                    // Step (Setpoint) - Yellow
                    ctx.strokeStyle = '#facc15'; // yellow-400
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    // Draw SP
                    gd.sp.forEach((val, i) => {
                        const px = (i / 100) * w;
                        // Scale: 100% = 30px height (half canvas)
                        const py = zeroy - (val * 0.25);
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    });
                    ctx.stroke();

                    // Response (Omega) - Cyan (or RED if at target)
                    // "cambie a color rojo cuando se posicione sobre el punto final"
                    ctx.strokeStyle = atTarget ? '#ef4444' : '#22d3ee'; // red-500 : cyan-400
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    gd.av.forEach((val, i) => {
                        const px = (i / 100) * w;
                        const py = zeroy - (val * 0.25);
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    });
                    ctx.stroke();
                }
            }

            frameId = requestAnimationFrame(update);
        };

        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, [M10_TargetTray]);

    return (
        <div className="absolute top-1/2 left-4 -translate-y-1/2 z-50 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-lg p-4 shadow-[0_0_20px_rgba(6,182,212,0.2)] w-64 text-cyan-400 font-mono">

                {/* Header */}
                <div className="flex items-center gap-2 mb-3 border-b border-cyan-800 pb-2">
                    <Radio size={20} className="animate-pulse text-cyan-300" />
                    <div>
                        <h3 className="text-xs font-bold text-cyan-200 tracking-wider">TELEMETRÍA</h3>
                        <div ref={trayLabelRef} className="text-sm font-bold text-white">BANDEJA #--</div>
                    </div>
                </div>

                {/* Grid Data */}
                <div className="space-y-3 text-xs">

                    {/* Motor Specs */}
                    <div className="bg-cyan-900/20 p-2 rounded border border-cyan-500/30">
                        <div className="font-bold text-[10px] text-cyan-200 mb-1">MOTOR: SEW DRE90M6</div>
                        <div className="grid grid-cols-2 gap-1 text-[9px] text-cyan-400 opacity-90">
                            <div>POWER: 1.5 HP</div>
                            <div>GEAR: 366.1:1</div>
                            <div>TORQUE: 1580 Nm</div>
                            <div>POLES: 6 (1200)</div>
                        </div>
                        <div className="mt-1 pt-1 border-t border-cyan-800 flex justify-between items-center text-[9px]">
                            <span className="text-cyan-500 font-bold">MOTOR RPM:</span>
                            <span ref={motorRpmRef} className="font-mono text-white">0</span>
                        </div>
                    </div>

                    {/* Dynamics */}
                    <div className="space-y-1">
                        <div className="text-[10px] text-cyan-600 uppercase mb-1">Dinámica</div>
                        <Row label="Vel. Angular" valueRef={omegaRef} unit="rad/s" />
                        <Row label="Aceleración" valueRef={accelRef} unit="rad/s²" />
                        <Row label="Torque Motor" valueRef={torqueRef} unit="N·m" />
                        <Row label="Target Theta" valueRef={targetThetaRef} unit="°" />
                    </div>

                    {/* Kinematics */}
                    <div className="space-y-1 pt-2 border-t border-cyan-900">
                        <div className="text-[10px] text-cyan-600 uppercase mb-1">Posición Espacial</div>
                        <Row label="Eje X (Ancho)" valueRef={posXRef} unit="m" />
                        <Row label="Eje Y (Alto)" valueRef={posYRef} unit="m" />
                        <Row label="Eje Z (Prof)" valueRef={posZRef} unit="m" />
                    </div>

                    {/* Velocity/Frequency Graph (Step Response) */}
                    <div className="space-y-1 pt-2 border-t border-cyan-900">
                        <div className="text-[10px] text-cyan-600 uppercase mb-1 flex justify-between">
                            <span>Respuesta Escalon</span>
                            <span className="text-[9px] text-yellow-500">CMD</span>
                        </div>
                        <canvas ref={canvasRef} width={220} height={60} className="w-full bg-cyan-900/20 rounded border border-cyan-500/30" />
                    </div>

                </div>

                {/* Footer status */}
                <div className="mt-3 pt-2 border-t border-cyan-900 flex justify-between text-[9px] text-cyan-700">
                    <span className={usePlcStore.getState().inputs.I0_6_ReflexSensor ? "text-red-500 font-bold animate-pulse" : "text-green-600"}>
                        {usePlcStore.getState().inputs.I0_6_ReflexSensor ? "SENSOR: BLOQUEADO" : "SENSOR: LIBRE (ACTIVO)"}
                    </span>
                    <span>T: {new Date().toLocaleTimeString()}</span>
                </div>
            </div>
        </div>
    );
};

const Row = ({ label, valueRef, unit }: any) => (
    <div className="flex justify-between items-center group">
        <span className="opacity-70 group-hover:opacity-100 transition-opacity">{label}</span>
        <div className="flex items-baseline gap-1">
            <span ref={valueRef} className="font-bold text-white">0.00</span>
            <span className="text-[9px] text-cyan-600 w-8 text-right">{unit}</span>
        </div>
    </div>
);
