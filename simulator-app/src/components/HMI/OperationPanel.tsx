import { useState, useEffect } from 'react';
import { usePlcStore } from '../../store/usePlcStore';
import { clsx } from 'clsx';
import { Power, Box, Hand, AlertTriangle, CheckSquare } from 'lucide-react';

export const OperationPanel = () => {
    // PLC Interface
    const updateTags = usePlcStore(state => state.updateTags);
    const updateInventory = usePlcStore(state => state.updateInventory);
    const setPresented = usePlcStore(state => state.setPresented);
    const trayDb = usePlcStore(state => state.trayDb);

    // Inputs/Markers
    const estop = usePlcStore(state => state.inputs.I0_0_EStop);
    const posReached = usePlcStore(state => state.markers.M0_2_PosReached);
    const reflexSensor = usePlcStore(state => state.inputs.I0_6_ReflexSensor);
    const running = usePlcStore(state => state.outputs.Q0_2_Ind_Run);

    // Local UI State
    const [selTray, setSelTray] = useState<string>("0");
    const [selRefs, setSelRefs] = useState<string[]>([]); // Multi-Select Array
    const [step, setStep] = useState<'IDLE' | 'MOVING' | 'ARRIVED' | 'EXTRACTED'>('IDLE');

    // Sync PLC State
    useEffect(() => {
        if (running && !posReached) setStep('MOVING'); // Only sync if running
        if (posReached && step === 'MOVING') setStep('ARRIVED');
        if (reflexSensor) setStep('EXTRACTED');
        if (!reflexSensor && step === 'EXTRACTED') setStep('ARRIVED');
    }, [running, posReached, reflexSensor, step]);

    // Handlers
    const handleMove = () => {
        setSelRefs([]); // Reset selection on new move
        setPresented(null, []); // Reset visual
        updateTags({
            M10_TargetTray: parseInt(selTray),
            M12_TargetRef: null,
            M0_0_AutoMode: true,
            M0_2_PosReached: false,   // FIX: Resetear flag de posición
            M0_1_Moving: false,       // FIX: Será activado por el Processor
            I0_2_Stop: true,
            I0_0_EStop: true,
            I0_4_DoorClosed: true,
            I0_5_SafetyCurtain: true,
            I0_6_ReflexSensor: false
        });
        updateTags({ I0_1_Start: true });
        setTimeout(() => updateTags({ I0_1_Start: false }), 200);
        setStep('MOVING');
    };

    const handleExtract = () => {
        updateTags({ I0_6_ReflexSensor: true }); // Block sensor
        setPresented(parseInt(selTray), selRefs); // Trigger Animation
        setStep('EXTRACTED');
    };

    const handleRemove = () => {
        updateTags({ I0_6_ReflexSensor: false }); // Clear sensor
        updateTags({ M0_0_AutoMode: false });     // FIX: Desactivar auto para nuevo ciclo
        setPresented(null, []); // Clear Animation

        // Update Inventory for ALL selected refs
        const tId = parseInt(selTray);
        const tray = trayDb.find(t => t.id === tId);

        if (tray) {
            selRefs.forEach(refType => {
                const refIdx = tray.slots.findIndex(s => s.type === refType);
                if (refIdx >= 0 && tray.slots[refIdx].count > 0) {
                    updateInventory(tId, refIdx, -1);
                }
            });
        }

        setSelRefs([]); // Clear selection after removal
        setStep('IDLE');  // FIX: Volver a IDLE para ciclo limpio
    };

    // Multi-Select Logic
    const toggleRef = (ref: string) => {
        setSelRefs(prev =>
            prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
        );
    };

    const selectAll = () => {
        const tray = trayDb.find(t => t.id === parseInt(selTray));
        if (!tray) return;
        // Select all refs that have count > 0
        const allRefs = tray.slots.filter(s => s.count > 0).map(s => s.type);
        setSelRefs(allRefs);
    };

    const toggleEstop = () => updateTags({ I0_0_EStop: !estop });

    const currentTrayData = trayDb.find(t => t.id === parseInt(selTray));

    return (
        <div className="flex flex-col h-full bg-industrial-200 p-2 font-sans select-none overflow-y-auto gap-4">

            {/* 1. SELECCION DE BANDEJA */}
            <div className="bg-black/40 p-3 rounded shadow-sm border border-green-900">
                <div className="text-xs font-bold text-green-500 uppercase mb-2 flex items-center gap-2">
                    <Box size={14} /> 1. Seleccionar Bandeja
                </div>
                <div className="flex gap-2">
                    <select
                        value={selTray}
                        onChange={(e) => setSelTray(e.target.value)}
                        disabled={step !== 'IDLE' && step !== 'ARRIVED'}
                        className="flex-1 border p-1 rounded font-mono text-sm bg-black border-green-700 text-green-400 focus:outline-none focus:border-green-500"
                    >
                        {trayDb.map(t => (
                            <option key={t.id} value={t.id}>BANDEJA {t.id}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleMove}
                        disabled={step === 'MOVING' || reflexSensor || !estop}
                        className={clsx(
                            "px-4 rounded text-black font-bold text-xs shadow transition-all",
                            step === 'MOVING' ? "bg-green-900/50 text-green-800" : "bg-green-500 hover:bg-green-400"
                        )}
                    >
                        MOVER
                    </button>
                </div>
            </div>

            {/* 2. ESTADO DEL EQUIPO */}
            <div className="bg-black/60 p-3 rounded text-green-500 flex justify-between items-center shadow-inner border border-green-900/50">
                <div className="flex flex-col">
                    <span className="text-[10px] text-green-700">ESTADO</span>
                    <span className={clsx("font-bold", running ? "text-green-400 animate-pulse" : "text-green-600")}>
                        {step === 'MOVING' ? 'GIRANDO...' : step === 'EXTRACTED' ? 'BLOQUEADO (SENSOR)' : 'POSICIÓN OK'}
                    </span>
                </div>
                {reflexSensor && (
                    <div className="flex flex-col items-center text-red-500 animate-bounce">
                        <AlertTriangle size={24} />
                        <span className="text-[9px] font-bold">OBSTRUCCIÓN</span>
                    </div>
                )}
            </div>

            {/* 3. SELECCION DE ARNESES (MULTI-SELECT) */}
            <div className={clsx(
                "p-3 rounded shadow-sm border transition-colors flex flex-col gap-2",
                step === 'ARRIVED' || step === 'EXTRACTED'
                    ? "bg-black/40 border-green-500 ring-1 ring-green-500/30"
                    : "bg-black/20 border-green-900/30 opacity-60"
            )}>
                <div className="flex justify-between items-center">
                    <div className="text-xs font-bold text-green-500 uppercase flex items-center gap-2">
                        <Hand size={14} /> 3. Picking ({selRefs.length})
                    </div>
                    <button
                        onClick={selectAll}
                        className="text-[10px] text-green-400 underline hover:text-green-200"
                        disabled={step !== 'ARRIVED' && step !== 'EXTRACTED'}
                    >
                        TODOS
                    </button>
                </div>

                {/* GRID OF CHIPS */}
                <div className="grid grid-cols-3 gap-2">
                    {currentTrayData?.slots.map(slot => (
                        <button
                            key={slot.type}
                            onClick={() => toggleRef(slot.type)}
                            disabled={(step !== 'ARRIVED' && step !== 'EXTRACTED') || slot.count === 0}
                            className={clsx(
                                "flex flex-col items-center justify-center p-1 rounded border transition-all text-xs h-12 relative",
                                selRefs.includes(slot.type)
                                    ? "bg-green-600 text-white border-green-400 shadow-[0_0_10px_rgba(0,255,0,0.3)]"
                                    : "bg-black/50 text-green-700 border-green-900/50 hover:border-green-500 hover:text-green-500",
                                slot.count === 0 && "opacity-30 cursor-not-allowed"
                            )}
                        >
                            <span className="font-bold">REF {slot.type}</span>
                            <span className="text-[9px] opacity-80">{slot.count} UND</span>
                            {selRefs.includes(slot.type) && <CheckSquare size={12} className="absolute top-1 right-1 text-green-200" />}
                        </button>
                    ))}
                </div>

                {/* ACTIONS */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                        onClick={handleExtract}
                        disabled={step !== 'ARRIVED' || selRefs.length === 0}
                        className="bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 font-bold py-2 rounded shadow hover:bg-yellow-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        SACAR ({selRefs.length})
                    </button>
                    <button
                        onClick={handleRemove}
                        disabled={step !== 'EXTRACTED'}
                        className="bg-green-600/20 text-green-400 border border-green-600/50 font-bold py-2 rounded shadow hover:bg-green-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        RETIRAR
                    </button>
                </div>
            </div>

            {/* E-STOP GLOBAL */}
            <div className="mt-auto flex justify-center pt-4 border-t border-gray-300">
                <button
                    onClick={toggleEstop}
                    className={clsx(
                        "w-full h-12 rounded shadow-lg border-2 flex items-center justify-center gap-2 font-bold transition-all",
                        !estop ? "bg-red-600 text-white border-red-800 animate-pulse" : "bg-gray-200 border-gray-400 text-gray-600"
                    )}
                >
                    <Power size={20} />
                    {!estop ? "EMERGENCY STOP ACTIVE" : "E-STOP OK"}
                </button>
            </div>
        </div>
    );
};
