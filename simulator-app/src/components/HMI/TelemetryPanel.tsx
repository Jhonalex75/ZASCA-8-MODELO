import { useEffect, useRef } from 'react';
import { usePlcStore } from '../../store/usePlcStore';
import { Activity } from 'lucide-react';

export const TelemetryPanel = () => {
    // Direct refs to new store values
    const thetaRef = useRef<HTMLSpanElement>(null);
    const omegaRef = useRef<HTMLSpanElement>(null);
    const alphaRef = useRef<HTMLSpanElement>(null);
    const torqueRef = useRef<HTMLSpanElement>(null);
    const targetRef = useRef<HTMLSpanElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let raf: number;

        // Graph Data
        const historyLength = 100;
        const data = new Array(historyLength).fill(0);
        let ctx: CanvasRenderingContext2D | null = null;
        if (canvasRef.current) {
            ctx = canvasRef.current.getContext('2d');
        }

        const update = () => {
            const state = usePlcStore.getState();
            // Use Analog Output for Speed Setpoint (Frequency/Speed command)
            const speed = state.analogOutputs.QW64_SpeedSetpoint || 0;
            const { M20_Theta, M24_Omega, M28_Alpha, M32_Torque, M36_TargetTheta } = state.markers;

            if (thetaRef.current) thetaRef.current.innerText = M20_Theta.toFixed(1) + "°";
            if (omegaRef.current) omegaRef.current.innerText = M24_Omega.toFixed(3) + " rad/s";
            if (alphaRef.current) alphaRef.current.innerText = M28_Alpha.toFixed(3) + " rad/s²";
            if (torqueRef.current) torqueRef.current.innerText = M32_Torque.toFixed(1) + " Nm";
            if (targetRef.current) targetRef.current.innerText = M36_TargetTheta.toFixed(1) + "°";

            // Update Graph
            data.shift();
            data.push(speed);

            if (ctx && canvasRef.current) {
                const w = canvasRef.current.width;
                const h = canvasRef.current.height;
                ctx.clearRect(0, 0, w, h);

                // Draw Grid
                ctx.strokeStyle = '#14532d'; // green-900
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
                ctx.stroke();

                // Draw Line
                ctx.strokeStyle = '#4ade80'; // green-400
                ctx.lineWidth = 2;
                ctx.beginPath();
                const step = w / (historyLength - 1);

                // Scale: Max +/- 80 (Speed) -> Height
                const scale = h / 160;

                data.forEach((val, i) => {
                    const x = i * step;
                    const y = (h / 2) - (val * scale);
                    if (i === 0) ctx!.moveTo(x, y);
                    else ctx!.lineTo(x, y);
                });
                ctx.stroke();
            }

            raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div className="h-full bg-black text-green-500 font-mono text-xs p-2 flex flex-col gap-2 overflow-y-auto custom-scrollbar border-r border-industrial-700">
            <div className="flex items-center gap-2 border-b border-green-900 pb-1 mb-1">
                <Activity size={14} className="text-green-400" />
                <span className="font-bold">PHYSICS TELEMETRY</span>
            </div>

            {/* Motor Specs Updated per P-001 / Report 3 */}
            <div className="bg-green-900/10 p-2 rounded border border-green-900/30 mb-2">
                <div className="font-bold text-[10px] text-green-400 mb-1">MOTOR: AC INDUCTION 5HP</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] opacity-70">
                    <div>POWER: 5 HP</div>
                    <div>GEAR: 40:1</div>
                    <div>TRANS: 3:1</div>
                    <div>RPM: ~14.6</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Item label="THETA (Pos)" refEl={thetaRef} unit="" />
                <Item label="OMEGA (Vel)" refEl={omegaRef} unit="" />
                <Item label="ALPHA (Acc)" refEl={alphaRef} unit="" />
                <Item label="TORQUE" refEl={torqueRef} unit="" />
                <div className="col-span-2 h-px bg-green-900/50 my-1" />
                <Item label="TARGET" refEl={targetRef} unit="" className="text-yellow-400" />
            </div>

            {/* Real-time Graph */}
            <div className="mt-auto pt-2">
                <div className="text-[10px] opacity-50 mb-1">FREQ. CMD (STEP FUNC)</div>
                <canvas ref={canvasRef} width={200} height={60} className="w-full bg-green-900/20 rounded border border-green-900/50" />
            </div>
        </div>
    );
};

const Item = ({ label, refEl, unit, className }: any) => (
    <div className="flex justify-between items-baseline">
        <span className="opacity-70">{label}:</span>
        <div>
            <span ref={refEl} className={`font-bold ${className || 'text-green-100'}`}>0.00</span>
            <span className="ml-1 opacity-50">{unit}</span>
        </div>
    </div>
);
