import { useState, useEffect } from 'react';
import { Settings, X, Activity, Cpu, Zap, Minimize2, Maximize2, BarChart2 } from 'lucide-react';
import { vfd } from '../../simulation/Hardware/VirtualVFD';
import { usePlcStore } from '../../store/usePlcStore';

export const VfdPanel = () => {
    // Local state for UI updates (polled)
    const [telemetry, setTelemetry] = useState({
        freq: 0,
        amps: 0,
        volt: 0,
        isRun: false
    });

    // Get Step Info from Store
    const stepId = usePlcStore(state => state.markers.M15_StepId);
    const speedCmd = usePlcStore(state => state.analogOutputs.QW64_SpeedSetpoint);

    const [params, setParams] = useState({
        p1120: vfd.RampUp_P1120,
        p1121: vfd.RampDown_P1121
    });

    const [minimized, setMinimized] = useState(false);
    const [visible, setVisible] = useState(true);

    // Poll VFD state independently of React render cycle for performance
    useEffect(() => {
        const interval = setInterval(() => {
            setTelemetry({
                freq: vfd.outputFrequency,
                amps: vfd.outputCurrent,
                volt: vfd.outputVoltage,
                isRun: vfd.isRun
            });
            // Also sync params in case changed elsewhere
            setParams({
                p1120: vfd.RampUp_P1120,
                p1121: vfd.RampDown_P1121
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleChangeParam = (key: 'p1120' | 'p1121', val: string) => {
        const num = parseFloat(val);
        if (!isNaN(num)) {
            if (key === 'p1120') vfd.RampUp_P1120 = num;
            if (key === 'p1121') vfd.RampDown_P1121 = num;
            setParams(prev => ({ ...prev, [key]: num }));
        }
    };

    if (!visible) return (
        <button
            onClick={() => setVisible(true)}
            className="absolute top-4 right-[420px] bg-gray-800 text-white p-2 rounded shadow-lg border border-gray-600 hover:bg-gray-700 z-50 text-xs font-bold flex items-center gap-2 pointer-events-auto"
        >
            <Cpu size={14} /> VFD
        </button>
    );

    return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 text-gray-200 rounded-lg shadow-2xl border border-gray-700 w-64 z-50 font-sans transition-all duration-300 pointer-events-auto ${minimized ? 'h-10 overflow-hidden' : ''}`}>
            {/* Header / Draggable Handle */}
            <div className="bg-gray-800 p-2 flex justify-between items-center cursor-move border-b border-gray-700">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <Cpu size={14} />
                    <span>SINAMICS G120C</span>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setMinimized(!minimized)} className="hover:text-white p-1">
                        {minimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                    </button>
                    <button onClick={() => setVisible(false)} className="hover:text-red-400 p-1">
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!minimized && (
                <div className="p-3 text-xs space-y-4">
                    {/* Status Display (BOP Style) */}
                    <div className="bg-orange-600/10 border border-orange-500/30 rounded p-2 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-gray-400">Estado</span>
                            <span className={`font-bold ${telemetry.isRun ? 'text-green-400' : 'text-gray-500'}`}>
                                {telemetry.isRun ? 'RUN' : 'READY'}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-mono font-bold text-orange-500">
                                {telemetry.freq.toFixed(1)} <span className="text-[10px] text-gray-400">Hz</span>
                            </div>
                        </div>
                    </div>

                    {/* Step Function Control Visualization */}
                    <div className="bg-gray-800 p-2 rounded border border-gray-700">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1">
                                <BarChart2 size={10} /> Escalon de Velocidad
                            </span>
                            <span className="text-[9px] text-gray-400">STEP ID: {stepId}</span>
                        </div>
                        <div className="flex gap-1 h-8 items-end bg-gray-900/50 rounded p-1 border border-dashed border-gray-700/50">
                            {/* Visual Steps Bars */}
                            <div className={`flex-1 rounded-sm transition-all ${stepId > 0 ? 'bg-cyan-900' : 'bg-gray-800'}`} style={{ height: '20%' }}></div>
                            <div className={`flex-1 rounded-sm transition-all ${stepId > 1 ? 'bg-cyan-700' : 'bg-gray-800'}`} style={{ height: '40%' }}></div>
                            <div className={`flex-1 rounded-sm transition-all ${stepId > 2 ? 'bg-cyan-600' : 'bg-gray-800'}`} style={{ height: '60%' }}></div>
                            <div className={`flex-1 rounded-sm transition-all ${stepId > 3 ? 'bg-cyan-500' : 'bg-gray-800'}`} style={{ height: '80%' }}></div>
                            <div className={`flex-1 rounded-sm transition-all ${stepId > 4 ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-gray-800'}`} style={{ height: '100%' }}></div>
                        </div>
                        <div className="mt-1 flex justify-between text-[9px] font-mono">
                            <span className="text-gray-500">CMD:</span>
                            <span className="text-yellow-400 font-bold">{speedCmd.toFixed(1)} %</span>
                        </div>
                    </div>

                    {/* Meters */}
                    <div className="grid grid-cols-2 gap-2">
                        <Meter label="CURRENT" value={telemetry.amps.toFixed(2)} unit="A" icon={<Activity size={10} />} color="text-yellow-400" />
                        <Meter label="VOLTAGE" value={telemetry.volt.toFixed(0)} unit="V" icon={<Zap size={10} />} color="text-blue-400" />
                    </div>

                    {/* Parameters Edit */}
                    <div className="space-y-2 pt-2 border-t border-gray-700">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-bold">
                            <span>Parámetros (Rampas)</span>
                            <Settings size={10} />
                        </div>

                        <ParamInput
                            label="P1120 (Subida)"
                            value={params.p1120}
                            onChange={(v: string) => handleChangeParam('p1120', v)}
                        />
                        <ParamInput
                            label="P1121 (Bajada)"
                            value={params.p1121}
                            onChange={(v: string) => handleChangeParam('p1121', v)}
                        />
                    </div>

                    {/* Motor Specs Badge */}
                    <div className="mt-2 text-[9px] text-gray-500 border-t border-gray-800 pt-1 text-center font-mono">
                        SEW FA47/G DRE90M4 • 1.5 HP • i=366.1
                    </div>
                </div>
            )}
        </div>
    );
};

const Meter = ({ label, value, unit, icon, color }: any) => (
    <div className="bg-gray-800 p-1.5 rounded flex flex-col items-center">
        <span className="text-[9px] text-gray-500 flex items-center gap-1 mb-0.5">{icon} {label}</span>
        <span className={`font-mono font-bold ${color}`}>{value} <span className="text-[9px] opacity-70 text-gray-400">{unit}</span></span>
    </div>
);

const ParamInput = ({ label, value, onChange }: any) => (
    <div className="flex justify-between items-center bg-gray-800 p-1 rounded px-2">
        <span className="text-gray-400">{label}</span>
        <div className="flex items-center gap-1">
            <input
                type="number"
                step="0.1"
                className="w-12 bg-gray-900 border border-gray-700 text-right text-cyan-300 rounded focus:border-cyan-500 outline-none px-1 py-0.5"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <span className="text-gray-500">s</span>
        </div>
    </div>
);
