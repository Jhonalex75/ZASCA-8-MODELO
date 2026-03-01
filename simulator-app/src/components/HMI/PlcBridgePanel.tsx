/**
 * ============================================================
 * PLC BRIDGE PANEL
 * ============================================================
 * Panel interactivo en el HMI del simulador que permite al
 * operario conectarse al servidor plc-bridge (o al PLC real)
 * y enviar comandos / ver estado en tiempo real.
 *
 * Incluye flujo completo de picking igual que OperationPanel:
 *   TRAER → (llega) → seleccionar refs → SACAR → RETIRAR
 * ============================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { plcBridge } from '../../services/PlcWebSocketService';
import { usePlcStore } from '../../store/usePlcStore';
import { Wifi, WifiOff, Zap, Square, ChevronUp, ChevronDown, AlertTriangle, RefreshCw, Radio, Thermometer, Gauge, Hand, CheckSquare, Package } from 'lucide-react';
import { clsx } from 'clsx';

interface PlcStatus {
    encoderPos: number;
    vfdSpeed: number;
    motorRunning: boolean;
    systemReady: boolean;
    systemFault: boolean;
    brakeReleased: boolean;
    autoMode: boolean;
    torque: number;
    current: number;
    temperature: number;
    targetTray: number;
}

export const PlcBridgePanel = () => {
    // Zustand store — MISMA interfaz que OperationPanel
    const updateTags = usePlcStore(state => state.updateTags);
    const updateInventory = usePlcStore(state => state.updateInventory);
    const setPresented = usePlcStore(state => state.setPresented);
    const trayDb = usePlcStore(state => state.trayDb);

    // PLC signals — EXACTAMENTE las mismas que OperationPanel
    const estop = usePlcStore(state => state.inputs.I0_0_EStop);
    const posReached = usePlcStore(state => state.markers.M0_2_PosReached);
    const reflexSensor = usePlcStore(state => state.inputs.I0_6_ReflexSensor);
    const running = usePlcStore(state => state.outputs.Q0_2_Ind_Run);

    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    // selectedTray: 1-20 para UI, se convierte a 0-19 para tags
    const [selectedTray, setSelectedTray] = useState(1);
    const [selRefs, setSelRefs] = useState<string[]>([]);
    const [pickStep, setPickStep] = useState<'IDLE' | 'MOVING' | 'ARRIVED' | 'EXTRACTED'>('IDLE');
    const [log, setLog] = useState<string[]>(['[INFO] Panel PLC Bridge listo']);
    const [status, setStatus] = useState<PlcStatus>({
        encoderPos: 0, vfdSpeed: 0, motorRunning: false,
        systemReady: false, systemFault: false, brakeReleased: false,
        autoMode: false, torque: 0, current: 0, temperature: 25,
        targetTray: 0,
    });
    const logRef = useRef<HTMLDivElement>(null);

    // Auto-scroll del log
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [log]);

    // Sync picking state with PLC signals — COPIA EXACTA de OperationPanel
    useEffect(() => {
        if (running && !posReached) setPickStep('MOVING');          // Motor encendido, no ha llegado
        if (posReached && pickStep === 'MOVING') setPickStep('ARRIVED'); // Llegó a posición
        if (reflexSensor) setPickStep('EXTRACTED');                 // Sensor de obstrucción activo
        if (!reflexSensor && pickStep === 'EXTRACTED') setPickStep('ARRIVED'); // Se liberó el sensor
    }, [running, posReached, reflexSensor, pickStep]);

    const addLog = useCallback((msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLog(prev => [...prev.slice(-30), `[${time}] ${msg}`]);
    }, []);

    // Suscribirse a eventos del WebSocket
    useEffect(() => {
        const unsubConn = plcBridge.onConnection((isConnected) => {
            setConnected(isConnected);
            setConnecting(false);
            addLog(isConnected ? '✅ Conectado al PLC Bridge' : '❌ Desconectado');
        });

        const unsubState = plcBridge.onState((data) => {
            setStatus({
                encoderPos: data.ST_EncoderPos,
                vfdSpeed: data.ST_VFD_Speed,
                motorRunning: data.ST_MotorRunning,
                systemReady: data.ST_SystemReady,
                systemFault: data.ST_SystemFault,
                brakeReleased: data.ST_BrakeReleased,
                autoMode: data.ST_AutoMode,
                torque: data.TEL_Torque,
                current: data.TEL_Current,
                temperature: data.TEL_Temperature,
                targetTray: 0,
            });
        });

        // Si ya estaba conectado
        if (plcBridge.connected) {
            setConnected(true);
        }

        return () => {
            unsubConn();
            unsubState();
        };
    }, [addLog]);

    // --- Handlers ---
    // Cada handler hace DOS cosas:
    // 1. Envía el comando al plc-bridge via WebSocket
    // 2. Actualiza el store Zustand para que el simulador 3D interno también responda

    const handleConnect = () => {
        if (connected) {
            plcBridge.disconnect();
            addLog('🔌 Desconectando...');
            setConnected(false);
        } else {
            setConnecting(true);
            addLog('📡 Conectando a localhost:3001...');
            plcBridge.connect();
        }
    };

    // trayId a nivel del componente: convierte display (1-20) a ID (0-19)
    // Usado por selectAllRefs, currentTrayData, y handleSelectTray
    const trayId = selectedTray - 1;

    // handleSelectTray = COPIA EXACTA de OperationPanel.handleMove
    const handleSelectTray = () => {
        // Reset picking state
        setSelRefs([]);
        setPresented(null, []);

        // 1. Enviar al plc-bridge si conectado
        if (connected) {
            plcBridge.selectTray(selectedTray);
        }
        // 2. Actualizar store interno — EXACTO como OperationPanel.handleMove
        updateTags({
            M10_TargetTray: trayId,        // ← 0-19, NO 1-20
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
        setPickStep('MOVING');
        addLog(`📦 Comando: Traer Bandeja #${selectedTray} (ID=${trayId})`);
    };

    const handleStart = () => {
        // 1. Enviar al plc-bridge
        if (connected) {
            plcBridge.start();
        }
        // 2. Actualizar store interno → pulso de START como en OperationPanel
        updateTags({
            I0_1_Start: true,
            I0_0_EStop: true,
            I0_2_Stop: true,
            I0_4_DoorClosed: true,
            I0_5_SafetyCurtain: true,
        });
        setTimeout(() => updateTags({ I0_1_Start: false }), 200);
        addLog('▶️ Comando: START');
    };

    const handleStop = () => {
        // 1. Enviar al plc-bridge
        if (connected) {
            plcBridge.stop();
        }
        // 2. Actualizar store interno → pulso de STOP
        updateTags({ I0_2_Stop: false });
        setTimeout(() => updateTags({ I0_2_Stop: true }), 200);
        addLog('⏹️ Comando: STOP');
    };

    // E-Stop toggle — IGUAL que OperationPanel.toggleEstop
    const toggleEstop = () => {
        // Also forward to bridge if connected
        if (connected && estop) {
            plcBridge.estop();
        }
        updateTags({ I0_0_EStop: !estop });
        if (estop) addLog('🛑 E-STOP ACTIVADO');
        else addLog('✅ E-STOP LIBERADO');
    };

    // ─── Picking handlers — COPIA EXACTA de OperationPanel ───
    // (usa trayId del nivel componente, definido arriba)

    const handleExtract = () => {
        updateTags({ I0_6_ReflexSensor: true }); // Bloquear motor
        setPresented(trayId, selRefs);            // Animación 3D (usa ID 0-indexed)
        setPickStep('EXTRACTED');
        if (connected) plcBridge.stop();
        addLog(`📤 SACAR: ${selRefs.length} ref(s) de Bandeja #${selectedTray}`);
    };

    const handleRemove = () => {
        updateTags({ I0_6_ReflexSensor: false });
        updateTags({ M0_0_AutoMode: false });     // FIX: Desactivar auto para nuevo ciclo
        setPresented(null, []);

        // Actualizar inventario — IGUAL que OperationPanel.handleRemove
        const tray = trayDb.find(t => t.id === trayId);
        if (tray) {
            selRefs.forEach(refType => {
                const refIdx = tray.slots.findIndex(s => s.type === refType);
                if (refIdx >= 0 && tray.slots[refIdx].count > 0) {
                    updateInventory(trayId, refIdx, -1);
                }
            });
        }

        addLog(`✅ RETIRADO: ${selRefs.length} ref(s) — inventario actualizado`);
        setSelRefs([]);
        setPickStep('IDLE');  // FIX: Volver a IDLE para ciclo limpio
    };

    // Multi-Select Logic — IGUAL que OperationPanel
    const toggleRef = (ref: string) => {
        setSelRefs(prev =>
            prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
        );
    };

    const selectAllRefs = () => {
        const tray = trayDb.find(t => t.id === trayId);
        if (!tray) return;
        const allRefs = tray.slots.filter(s => s.count > 0).map(s => s.type);
        setSelRefs(allRefs);
    };

    const mode = plcBridge.bridgeInfo?.mode || 'desconocido';
    const currentTrayData = trayDb.find(t => t.id === trayId);

    return (
        <div className="flex flex-col gap-3 h-full">

            {/* ═══════════ SECCIÓN 1: CONEXIÓN ═══════════ */}
            <div className="p-3 bg-black/60 rounded border border-green-900">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3 border-b border-green-900/50 pb-1">
                    🌉 Conexión PLC Bridge
                </h3>

                {/* Botón de Conexión */}
                <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className={clsx(
                        "w-full py-3 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border-2",
                        connecting
                            ? "bg-yellow-900/30 border-yellow-700 text-yellow-400 animate-pulse cursor-wait"
                            : connected
                                ? "bg-green-900/30 border-green-500 text-green-400 hover:bg-green-900/50 shadow-[0_0_15px_rgba(0,255,0,0.2)]"
                                : "bg-cyan-900/30 border-cyan-600 text-cyan-400 hover:bg-cyan-900/50 shadow-[0_0_10px_rgba(0,200,255,0.15)]"
                    )}
                >
                    {connecting ? (
                        <><RefreshCw size={18} className="animate-spin" /> CONECTANDO...</>
                    ) : connected ? (
                        <><Wifi size={18} /> CONECTADO — Click para desconectar</>
                    ) : (
                        <><WifiOff size={18} /> CONECTAR AL PLC BRIDGE</>
                    )}
                </button>

                {/* Indicador de modo */}
                {connected && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                        <Radio size={12} className="text-green-500 animate-pulse" />
                        <span className="text-green-600">
                            Modo: <span className={clsx("font-bold", mode === 'live' ? "text-orange-400" : "text-cyan-400")}>
                                {mode === 'live' ? '🏭 PLC REAL' : '🎮 SIMULADOR'}
                            </span>
                        </span>
                    </div>
                )}
            </div>

            {/* ═══════════ SECCIÓN 2: ESTADO EN TIEMPO REAL ═══════════ */}
            {connected && (
                <div className="p-3 bg-black/60 rounded border border-green-900">
                    <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 border-b border-green-900/50 pb-1">
                        📊 Estado del PLC
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                        {/* Fila 1: Indicadores LED */}
                        <div className="col-span-2 flex gap-3 mb-2 justify-center">
                            <Led on={status.systemReady} label="LISTO" color="green" />
                            <Led on={status.motorRunning} label="MOTOR" color="cyan" />
                            <Led on={status.brakeReleased} label="FRENO" color="yellow" />
                            <Led on={status.autoMode} label="AUTO" color="blue" />
                            <Led on={status.systemFault} label="FALLA" color="red" />
                        </div>
                        {/* Datos numéricos */}
                        <DataRow icon={<Gauge size={11} />} label="Posición" value={`${status.encoderPos.toFixed(1)}°`} />
                        <DataRow icon={<Zap size={11} />} label="Velocidad" value={`${status.vfdSpeed.toFixed(1)}%`} />
                        <DataRow icon={<Gauge size={11} />} label="Torque" value={`${status.torque.toFixed(1)} Nm`} />
                        <DataRow icon={<Zap size={11} />} label="Corriente" value={`${status.current.toFixed(2)} A`} />
                        <DataRow icon={<Thermometer size={11} />} label="Temp" value={`${status.temperature.toFixed(0)}°C`} />
                    </div>
                </div>
            )}

            {/* ═══════════ SECCIÓN 3: COMANDOS ═══════════ */}
            <div className="p-3 bg-black/60 rounded border border-green-900">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3 border-b border-green-900/50 pb-1">
                    🎮 Comandos al PLC
                </h3>

                {/* Selector de Bandeja */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-green-700 w-16">Bandeja:</span>
                    <button
                        onClick={() => setSelectedTray(t => Math.max(1, t - 1))}
                        className="w-8 h-8 bg-green-900/30 border border-green-800 rounded text-green-400 hover:bg-green-900/50 flex items-center justify-center active:scale-90 transition-all"
                    >
                        <ChevronDown size={16} />
                    </button>
                    <div className="flex-1 h-8 bg-black border border-green-700 rounded flex items-center justify-center font-bold text-green-400 font-mono text-lg">
                        #{selectedTray}
                    </div>
                    <button
                        onClick={() => setSelectedTray(t => Math.min(20, t + 1))}
                        className="w-8 h-8 bg-green-900/30 border border-green-800 rounded text-green-400 hover:bg-green-900/50 flex items-center justify-center active:scale-90 transition-all"
                    >
                        <ChevronUp size={16} />
                    </button>
                    <button
                        onClick={handleSelectTray}
                        disabled={pickStep === 'MOVING' || reflexSensor || !estop}
                        className={clsx(
                            "px-3 h-8 rounded font-bold text-xs border transition-all active:scale-95",
                            pickStep === 'MOVING'
                                ? "bg-green-900/50 border-green-800 text-green-800 cursor-not-allowed"
                                : "bg-cyan-900/40 border-cyan-600 text-cyan-400 hover:bg-cyan-900/60"
                        )}
                    >
                        MOVER
                    </button>
                </div>

                {/* Botones START / STOP */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                        onClick={handleStart}
                        disabled={!connected}
                        className={clsx(
                            "py-2.5 rounded font-bold text-sm flex items-center justify-center gap-1.5 border-2 transition-all active:scale-95",
                            connected
                                ? "bg-green-900/30 border-green-500 text-green-400 hover:bg-green-900/50 shadow-[0_0_10px_rgba(0,255,0,0.15)]"
                                : "bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed"
                        )}
                    >
                        <Zap size={16} /> START
                    </button>
                    <button
                        onClick={handleStop}
                        disabled={!connected}
                        className={clsx(
                            "py-2.5 rounded font-bold text-sm flex items-center justify-center gap-1.5 border-2 transition-all active:scale-95",
                            connected
                                ? "bg-yellow-900/30 border-yellow-500 text-yellow-400 hover:bg-yellow-900/50"
                                : "bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed"
                        )}
                    >
                        <Square size={16} /> STOP
                    </button>
                </div>

                {/* E-STOP — IGUAL que OperationPanel */}
                <button
                    onClick={toggleEstop}
                    className={clsx(
                        "w-full py-2.5 rounded font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all active:scale-95",
                        !estop
                            ? "bg-red-600 text-white border-red-800 animate-pulse shadow-[0_0_20px_rgba(255,0,0,0.4)]"
                            : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                    )}
                >
                    <AlertTriangle size={16} />
                    {!estop ? 'EMERGENCY STOP ACTIVE' : 'E-STOP OK'}
                </button>
            </div>

            {/* ═══════════ SECCIÓN 4: PICKING DE ARNESES ═══════════ */}
            <div className={clsx(
                "p-3 rounded border transition-colors flex flex-col gap-2",
                pickStep === 'ARRIVED' || pickStep === 'EXTRACTED'
                    ? "bg-black/60 border-green-500 ring-1 ring-green-500/30"
                    : "bg-black/30 border-green-900/30 opacity-50"
            )}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Hand size={13} /> Picking ({selRefs.length})
                    </h3>
                    <button
                        onClick={selectAllRefs}
                        disabled={pickStep !== 'ARRIVED' && pickStep !== 'EXTRACTED'}
                        className="text-[10px] text-green-400 underline hover:text-green-200 disabled:opacity-30"
                    >
                        TODOS
                    </button>
                </div>

                {/* Status indicator */}
                <div className={clsx(
                    "text-[10px] font-bold px-2 py-1 rounded text-center",
                    pickStep === 'IDLE' && "bg-gray-900/50 text-gray-500",
                    pickStep === 'MOVING' && "bg-green-900/40 text-green-400 animate-pulse",
                    pickStep === 'ARRIVED' && "bg-yellow-900/40 text-yellow-400",
                    pickStep === 'EXTRACTED' && "bg-red-900/40 text-red-400",
                )}>
                    {pickStep === 'IDLE' && 'ESPERANDO ORDEN...'}
                    {pickStep === 'MOVING' && '▶ GIRANDO...'}
                    {pickStep === 'ARRIVED' && '✓ EN POSICIÓN — SELECCIONE ARNESES'}
                    {pickStep === 'EXTRACTED' && '🔒 BLOQUEADO — RETIRE LOS ARNESES'}
                </div>

                {/* Reference chips grid */}
                <div className="grid grid-cols-3 gap-1.5">
                    {currentTrayData?.slots.map(slot => (
                        <button
                            key={slot.type}
                            onClick={() => toggleRef(slot.type)}
                            disabled={(pickStep !== 'ARRIVED' && pickStep !== 'EXTRACTED') || slot.count === 0}
                            className={clsx(
                                "flex flex-col items-center justify-center p-1 rounded border transition-all text-xs h-11 relative",
                                selRefs.includes(slot.type)
                                    ? "bg-green-600 text-white border-green-400 shadow-[0_0_10px_rgba(0,255,0,0.3)]"
                                    : "bg-black/50 text-green-700 border-green-900/50 hover:border-green-500 hover:text-green-500",
                                slot.count === 0 && "opacity-30 cursor-not-allowed"
                            )}
                        >
                            <span className="font-bold text-[10px]">REF {slot.type}</span>
                            <span className="text-[8px] opacity-80">{slot.count} UND</span>
                            {selRefs.includes(slot.type) && <CheckSquare size={10} className="absolute top-0.5 right-0.5 text-green-200" />}
                        </button>
                    ))}
                </div>

                {/* SACAR / RETIRAR buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleExtract}
                        disabled={pickStep !== 'ARRIVED' || selRefs.length === 0}
                        className="bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 font-bold py-1.5 rounded text-xs hover:bg-yellow-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
                    >
                        <Package size={13} /> SACAR ({selRefs.length})
                    </button>
                    <button
                        onClick={handleRemove}
                        disabled={pickStep !== 'EXTRACTED'}
                        className="bg-green-600/20 text-green-400 border border-green-600/50 font-bold py-1.5 rounded text-xs hover:bg-green-600/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
                    >
                        <CheckSquare size={13} /> RETIRAR
                    </button>
                </div>
            </div>

            {/* ═══════════ SECCIÓN 5: LOG DE MENSAJES ═══════════ */}
            <div className="flex-1 min-h-0 flex flex-col">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">
                    📋 Log de Comunicación
                </h3>
                <div
                    ref={logRef}
                    className="flex-1 bg-black rounded border border-green-900/50 p-2 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed text-green-700"
                >
                    {log.map((line, i) => (
                        <div key={i} className={clsx(
                            line.includes('✅') && 'text-green-400',
                            line.includes('❌') && 'text-red-400',
                            line.includes('⚠️') && 'text-yellow-400',
                            line.includes('📦') && 'text-cyan-400',
                            line.includes('📤') && 'text-yellow-400',
                            line.includes('🛑') && 'text-red-500 font-bold',
                        )}>
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ═══════════ Sub-componentes ═══════════ */

/** Indicador LED circular */
const Led = ({ on, label, color }: { on: boolean; label: string; color: string }) => {
    const colors: Record<string, string> = {
        green: on ? 'bg-green-500 shadow-[0_0_8px_#00ff00]' : 'bg-green-900/50',
        cyan: on ? 'bg-cyan-400 shadow-[0_0_8px_#00ffff]' : 'bg-cyan-900/50',
        yellow: on ? 'bg-yellow-400 shadow-[0_0_8px_#ffff00]' : 'bg-yellow-900/50',
        blue: on ? 'bg-blue-400 shadow-[0_0_8px_#4488ff]' : 'bg-blue-900/50',
        red: on ? 'bg-red-500 shadow-[0_0_8px_#ff0000] animate-pulse' : 'bg-red-900/50',
    };
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div className={clsx("w-3 h-3 rounded-full transition-all", colors[color])} />
            <span className="text-[8px] text-green-800 uppercase">{label}</span>
        </div>
    );
};

/** Fila de dato numérico */
const DataRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-center gap-1 text-green-700">
        {icon}
        <span className="text-green-800">{label}:</span>
        <span className="ml-auto text-green-400 font-bold">{value}</span>
    </div>
);
