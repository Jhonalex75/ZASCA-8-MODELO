
import { useState, useRef, useEffect } from 'react';

import { VfdPanel } from './VfdPanel';
import { clsx } from 'clsx';
import { Monitor, Settings, AlertTriangle, Activity, PlayCircle, Radio, Eye } from 'lucide-react';
import { usePlcStore } from '../../store/usePlcStore';
import { LadderViewer } from './LadderViewer';
import { IOMap } from './IOMap';
import { OperationPanel } from './OperationPanel';
import { OperatorGuide } from './OperatorGuide';
import { PhysicsMonitor } from './PhysicsMonitor';
import { PlcBridgePanel } from './PlcBridgePanel';
import { CarouselSchematicView } from './CarouselSchematicView';

export const HmiLayout = () => {
    const [page, setPage] = useState<'OVERVIEW' | 'OPERATION' | 'ALARMS' | 'MAINTENANCE' | 'BRIDGE' | 'ANIM'>('OVERVIEW');

    // Subscribe to key tags for Header
    const updateTags = usePlcStore(state => state.updateTags);
    const safetyOk = usePlcStore(state => state.markers.M0_4_InterlocksOk);

    // Navigation Helper
    const nav = (p: any) => setPage(p);

    // Timer Ref for Auto-Stop
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear timer on page change
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [page]);

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex">
            {/* OPERATOR HELP GUIDE (Top Center) */}
            <OperatorGuide page={page} />
            <VfdPanel />
            <LadderViewer />

            {/* TELEMETRY MONITOR (Left Middle) */}
            <PhysicsMonitor />

            {/* CENTER: 3D VIEWPORT (Transparent) */}
            <div className="flex-1 pointer-events-none">
                {/* 3D Scene is behind this due to z-index or sibling structure in App.tsx */}
            </div>

            {/* RIGHT PANEL: OPERATION & HMI */}
            <div className="w-[400px] h-full bg-black/90 border-l-4 border-siemens-header flex flex-col pointer-events-auto shadow-2xl font-sans text-green-500 backdrop-blur-sm">

                {/* Header */}
                <div className="h-16 bg-black text-green-500 border-b border-green-800 flex items-center justify-between px-4">
                    <span className="font-bold text-lg tracking-widest">SIEMENS HMI</span>
                    <div className="flex gap-2">
                        <div className={clsx("w-3 h-3 rounded-full", safetyOk ? "bg-green-500 shadow-[0_0_10px_#00ff00]" : "bg-red-500")} />
                        <span className="text-xs font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-black border-b border-green-900">
                    <NavBtn icon={Monitor} label="MAIN" active={page === 'OVERVIEW'} onClick={() => nav('OVERVIEW')} />
                    <NavBtn icon={Activity} label="OPER" active={page === 'OPERATION'} onClick={() => nav('OPERATION')} />
                    <NavBtn icon={AlertTriangle} label="ALARM" active={page === 'ALARMS'} onClick={() => nav('ALARMS')} />
                    <NavBtn icon={Settings} label="MAINT" active={page === 'MAINTENANCE'} onClick={() => nav('MAINTENANCE')} />
                    <NavBtn icon={Radio} label="BRIDGE" active={page === 'BRIDGE'} onClick={() => nav('BRIDGE')} />
                    <NavBtn icon={Eye} label="ANIM" active={page === 'ANIM'} onClick={() => nav('ANIM')} />
                </div>

                {/* Content */}
                <div className="flex-1 p-4 bg-transparent overflow-y-auto custom-scrollbar">
                    {page === 'OVERVIEW' && (
                        <div className="flex flex-col gap-4 h-full">
                            <div className="p-4 bg-black/60 rounded border border-green-900 shadow-md">
                                <h2 className="font-bold text-lg mb-4 text-green-500 uppercase tracking-wider border-b border-green-900 pb-2">
                                    Control Manual
                                </h2>

                                <div className="grid grid-cols-1 gap-4">
                                    {/* 10s Auto Run Button */}
                                    <button
                                        onMouseDown={() => {
                                            // FORCE START LOGIC - MAX SPEED DEMO (10s)
                                            const state = usePlcStore.getState();
                                            const current = state.markers.M11_CurrentTray || 0;

                                            // Force Jump 10 Trays (Half Turn) to guarantee Max Speed Cruise
                                            // This ensures absErr > 150 deg, triggering 100% VFD Output
                                            const target = (current + 10) % 20;

                                            // 2. Set Tags
                                            updateTags({
                                                M10_TargetTray: target,
                                                I0_1_Start: true,
                                                I0_0_EStop: true,       // E-Stop Released
                                                I0_2_Stop: true,        // Stop Button NOT Pressed
                                                I0_4_DoorClosed: true,  // Doors Closed
                                                I0_5_SafetyCurtain: true,
                                                I0_6_ReflexSensor: false
                                            });

                                            console.log(`CMD: START MANUAL -> Tray ${target}`);
                                        }}
                                        onMouseUp={() => {
                                            // Ensure minimum pulse for PLC Scan (200ms)
                                            setTimeout(() => {
                                                updateTags({ I0_1_Start: false });
                                            }, 200);

                                            // Auto-stop after 10s
                                            if (timerRef.current) clearTimeout(timerRef.current);

                                            timerRef.current = setTimeout(() => {
                                                console.log("CMD: AUTO STOP (10s)");
                                                updateTags({ I0_2_Stop: false });
                                                setTimeout(() => updateTags({ I0_2_Stop: true }), 200);
                                            }, 10000);
                                        }}
                                        className="bg-green-600 text-black border-2 border-green-400 rounded p-4 font-bold shadow-lg active:scale-95 hover:bg-green-500 transition-all flex flex-col items-center gap-2"
                                    >
                                        <PlayCircle size={32} />
                                        <span>INICIAR CICLO (10s)</span>
                                    </button>

                                    <div className="text-[10px] text-green-700 text-center">
                                        * Busca automáticamente la siguiente bandeja llena.
                                    </div>
                                </div>
                            </div>

                            {/* EMERGENCY STOP */}
                            <div className="mt-auto">
                                <button
                                    onClick={() => updateTags({ I0_0_EStop: !usePlcStore.getState().inputs.I0_0_EStop })}
                                    className={clsx(
                                        "w-full h-24 font-bold text-lg rounded shadow-[0_0_20px_#ff0000] border-4 active:scale-95 transition-all flex flex-col items-center justify-center gap-2",
                                        usePlcStore.getState().inputs.I0_0_EStop
                                            ? "bg-red-900/50 border-red-900 text-red-500 opacity-80 hover:bg-red-900 hover:opacity-100"
                                            : "bg-red-600 border-red-500 text-white animate-pulse shadow-[0_0_40px_#ff0000]"
                                    )}
                                >
                                    <AlertTriangle size={32} />
                                    {usePlcStore.getState().inputs.I0_0_EStop ? "PARO DE EMERGENCIA (INACTIVO)" : "PARO DE EMERGENCIA ACTIVADO"}
                                    <span className="text-[10px] font-normal opacity-80 uppercase">
                                        {usePlcStore.getState().inputs.I0_0_EStop ? "CLICK PARA PARAR" : "CLICK PARA REARMAR"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {page === 'OPERATION' && (
                        <div className="h-full">
                            <OperationPanel />
                        </div>
                    )}

                    {page === 'MAINTENANCE' && (
                        <div className="flex flex-col gap-4 h-full p-4">
                            <div className="flex-1 bg-black/50 rounded border border-gray-600 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                                <Monitor size={48} className="mb-4 opacity-50" />
                                <h3 className="text-lg font-bold text-neutral-400">HERRAMIENTAS DE MANTENIMIENTO</h3>
                                <p className="text-xs mt-2 max-w-[200px]">
                                    Utilice el botón flotante "PLC LADDER" para abrir el diagnóstico en tiempo real.
                                </p>
                            </div>
                            <div className="h-48 bg-black rounded overflow-hidden border border-gray-600">
                                <IOMap />
                            </div>
                        </div>
                    )}

                    {page === 'BRIDGE' && (
                        <div className="h-full">
                            <PlcBridgePanel />
                        </div>
                    )}

                    {page === 'ANIM' && (
                        <div className="h-full">
                            <CarouselSchematicView />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="h-8 bg-industrial-300 flex items-center px-4 text-xs">
                    <span>OPERATOR_1</span>
                    <span className="ml-auto">192.168.0.1</span>
                </div>
            </div>
        </div>
    );
};

const NavBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={clsx(
            "flex-1 py-3 flex flex-col items-center justify-center text-xs font-bold transition-colors border-r border-green-900/30 last:border-r-0",
            active
                ? "bg-green-900/20 border-t-2 border-green-500 text-green-400 shadow-[inset_0_0_20px_rgba(0,255,0,0.1)]"
                : "text-green-800 hover:text-green-600 hover:bg-green-900/10"
        )}
    >
        <Icon size={20} className="mb-1" />
        {label}
    </button>
);
