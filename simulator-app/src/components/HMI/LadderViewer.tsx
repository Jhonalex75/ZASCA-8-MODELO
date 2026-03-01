import React, { useRef, useState, useEffect } from 'react';
import { usePlcStore } from '../../store/usePlcStore';
import { clsx } from 'clsx';
import { X, Minimize2, Maximize2 } from 'lucide-react';

/* 
  PROFESSIONAL TIA PORTAL STYLE LADDER VIEWER (RESTORED & SAFEGUARDED)
  - Colors: Siemens Teal (#009999), Slate Grays, Industrial Green (#25E625)
  - Components: SVG-based Coils and Contacts (IEC 61131-3 Standard)
  - Safety: Full null-checks and safe accessors.
  - Resilience: ErrorBoundary included to protect 3D Model.
*/

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<any, { hasError: boolean, error: string }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: '' };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error: error.toString() };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("LadderViewer Crash:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded m-4 text-xs font-mono max-w-[400px]">
                    <strong>Ladder Viewer Crashed:</strong><br />
                    {this.state.error}
                    <br /><button className="mt-2 bg-red-200 p-1 rounded border border-red-300" onClick={() => this.setState({ hasError: false })}>Retry</button>
                    <p className="mt-2 text-[10px] text-gray-500">The 3D Model is safe.</p>
                </div>
            );
        }
        return this.props.children;
    }
}


// --- STYLES ---
// --- STYLES (DARK GLASS THEME) ---
const COLORS = {
    active: "#00ff00", // Bright Green for Active
    inactive: "#64748b", // Slate-500 for Inactive Elements (Visible on Dark)
    header: "#1e293b", // Slate-800
    teal: "#00b5b5", // Brighter Teal
    wire: "#64748b", // Slate-500
    bg: "transparent"
};

// 1. TIA Network Header
const NetworkHeader = ({ num, title, comment }: { num: number, title?: string, comment?: string }) => (
    <div className="flex flex-col mb-4 select-none group">
        <div className="bg-slate-800/80 border-l-[6px] border-[#00b5b5] px-3 py-2 flex items-center justify-between shadow-sm transition-colors group-hover:bg-slate-700/80 rounded-r">
            <div className="flex items-center gap-2">
                <span className="font-bold text-cyan-400 text-sm font-sans">Network {num}</span>
                {title && <span className="text-gray-200 text-sm font-semibold ml-4 break-words">{title}</span>}
            </div>
        </div>
        {comment && (
            <div className="bg-slate-800/50 px-4 py-2 border-l-[6px] border-slate-700 text-xs text-gray-400 italic font-sans border-b border-slate-700">
                {comment}
            </div>
        )}
    </div>
);

// 2. Power Rail (Vertical)
const PowerRail = ({ position }: { position: 'left' | 'right' }) => (
    <div className={clsx(
        "w-[4px] h-full bg-slate-600",
        position === 'left' ? "mr-1" : "ml-auto"
    )} />
);

// 3. Wire
const Wire = ({ active, length = 'flex-1', vertical = false }: { active: boolean, length?: string, vertical?: boolean }) => (
    <div className={clsx(
        "transition-all duration-200",
        vertical ? "w-[2px]" : "h-[2px]",
        length
    )} style={{ backgroundColor: active ? COLORS.active : COLORS.inactive, boxShadow: active ? `0 0 4px ${COLORS.active}` : 'none' }} />
);

// 4. Contact (NO) - SVG
const ContactNO = ({ address, value, active, label }: { address: string, value: boolean, active: boolean, label?: string }) => {
    const isEnergized = active && value;
    const strokeColor = isEnergized ? COLORS.active : COLORS.inactive;

    return (
        <div className="flex flex-col items-center relative mx-1 min-w-[60px]">
            <div className={`absolute -top-6 text-[11px] font-mono font-bold ${value ? "text-[#008800]" : "text-[#555]"}`}>{address}</div>
            {label && <div className="absolute -top-3 text-[9px] text-[#005f87] opacity-80 whitespace-nowrap">"{label}"</div>}

            <div className="flex items-center">
                <Wire active={active} length="w-2" />
                {/* SVG CONTACT NO */}
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <line x1="0" y1="20" x2="12" y2="20" stroke={active ? strokeColor : COLORS.inactive} strokeWidth="2" />
                    <line x1="28" y1="20" x2="40" y2="20" stroke={isEnergized ? strokeColor : COLORS.inactive} strokeWidth="2" />
                    <line x1="12" y1="10" x2="12" y2="30" stroke={strokeColor} strokeWidth="3" />
                    <line x1="28" y1="10" x2="28" y2="30" stroke={strokeColor} strokeWidth="3" />
                </svg>
                <div className={clsx("absolute -bottom-4 text-[9px] font-mono font-bold", value ? "text-[#008800]" : "text-[#aaa]")}>
                    {value ? 'TRUE' : 'FALSE'}
                </div>
                <Wire active={isEnergized} length="w-2" />
            </div>
        </div>
    );
};

// 5. Contact (NC) - SVG
const ContactNC = ({ address, value, active, label }: { address: string, value: boolean, active: boolean, label?: string }) => {
    const isConducive = !value;
    const isEnergized = active && isConducive;
    const strokeColor = isEnergized ? COLORS.active : COLORS.inactive;

    return (
        <div className="flex flex-col items-center relative mx-1 min-w-[60px]">
            <div className={`absolute -top-6 text-[11px] font-mono font-bold ${value ? "text-[#008800]" : "text-[#555]"}`}>{address}</div>
            {label && <div className="absolute -top-3 text-[9px] text-[#005f87] opacity-80 whitespace-nowrap">"{label}"</div>}

            <div className="flex items-center">
                <Wire active={active} length="w-2" />
                {/* SVG CONTACT NC */}
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <line x1="0" y1="20" x2="12" y2="20" stroke={active ? strokeColor : COLORS.inactive} strokeWidth="2" />
                    <line x1="28" y1="20" x2="40" y2="20" stroke={isEnergized ? strokeColor : COLORS.inactive} strokeWidth="2" />
                    <line x1="12" y1="10" x2="12" y2="30" stroke={strokeColor} strokeWidth="3" />
                    <line x1="28" y1="10" x2="28" y2="30" stroke={strokeColor} strokeWidth="3" />
                    <line x1="10" y1="30" x2="30" y2="10" stroke={strokeColor} strokeWidth="2" />
                </svg>
                <Wire active={isEnergized} length="w-2" />
            </div>
        </div>
    );
};

// 6. Coil (Output) - SVG
const Coil = ({ address, value, label, active }: { address: string, value: boolean, active?: boolean, label?: string }) => {
    const isEnergized = value;
    const strokeColor = isEnergized ? COLORS.active : COLORS.inactive;

    return (
        <div className="flex flex-col items-center relative mx-1 ml-auto mr-4 min-w-[60px]">
            <div className="absolute -top-6 text-[11px] font-mono font-bold text-amber-500">{address}</div>
            {label && <div className="absolute -top-3 text-[9px] text-[#005f87] opacity-80 whitespace-nowrap">"{label}"</div>}

            <div className="flex items-center">
                <Wire active={value} length="w-2" />
                {/* SVG COIL */}
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <path d="M 0 20 L 8 20" stroke={active ? strokeColor : COLORS.inactive} strokeWidth="2" fill="none" />
                    <path d="M 32 20 L 40 20" stroke="none" />
                    <path d="M 10 10 A 15 15 0 0 0 10 30" stroke={strokeColor} strokeWidth="2" fill="none" />
                    <path d="M 30 10 A 15 15 0 0 1 30 30" stroke={strokeColor} strokeWidth="2" fill="none" />
                </svg>
                <div className={clsx("absolute top-3 left-4 w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]", isEnergized ? "bg-[#25E625]" : "bg-transparent")} />
            </div>
        </div>
    );
};

// 7. Function Block
const FunctionBlock = ({ title, active, children }: any) => (
    <div className={clsx(
        "border bg-slate-800/90 mx-2 shadow-lg min-w-[140px] flex flex-col relative transition-all rounded",
        active ? "border-[#00ff00] ring-1 ring-[#00ff00]" : "border-slate-600"
    )}>
        <div className="absolute top-3 -left-2 w-2 h-[2px] bg-slate-500"></div>
        <div className="bg-slate-700/50 text-gray-200 text-[10px] text-center font-bold py-1 border-b border-slate-600 tracking-wide uppercase">{title}</div>
        <div className="p-2 font-mono text-[10px] text-[#005f87] flex flex-col gap-1">
            {children}
        </div>
    </div>
);


const LadderContent = () => {
    // Default safe position - RIGHT SIDE
    const [pos, setPos] = useState({ x: 550, y: 100 });
    const [minimized, setMinimized] = useState(true); // START MINIMIZED
    const [visible, setVisible] = useState(true);

    // Initial Center Adjustment
    useEffect(() => {
        if (window.innerWidth > 1000) {
            setPos({ x: window.innerWidth - 950, y: 120 });
        }
    }, []);

    // Drag Logic
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (minimized) return; // Optional
        isDragging.current = true;
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging.current) {
                setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
            }
        };
        const handleMouseUp = () => { isDragging.current = false; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    // PLC Data
    // PLC Data - Granular Selectors to avoid infinite re-render loops due to object identity
    const inputs = usePlcStore(s => s.inputs);
    const outputs = usePlcStore(s => s.outputs);
    const markers = usePlcStore(s => s.markers);
    const analogOutputs = usePlcStore(s => s.analogOutputs);

    // Logic for Views
    const r0_estop = inputs?.I0_0_EStop;
    const s1 = r0_estop;
    const s2 = s1 && inputs?.I0_4_DoorClosed;
    const s3 = s2 && inputs?.I0_5_SafetyCurtain;
    const s4 = s3 && !inputs?.I0_6_ReflexSensor;

    const r2_start_active = inputs?.I0_1_Start;
    const r2_latch_active = markers?.M0_0_AutoMode;
    const r2_stop_ok = inputs?.I0_2_Stop;
    const r2_safety_ok = markers?.M0_4_InterlocksOk;
    const r2_branch_active = r2_start_active || r2_latch_active;
    const r2_out = r2_branch_active && r2_stop_ok && r2_safety_ok;


    // TOGGLE BUTTON 
    if (!visible) return (
        <button
            onClick={() => setVisible(true)}
            className="absolute top-24 right-4 bg-white/90 text-[#005f87] p-2 rounded shadow-lg border border-[#005f87] hover:bg-white z-50 text-xs font-bold flex items-center gap-2 pointer-events-auto backdrop-blur-sm"
        >
            <Maximize2 size={16} /> LADDER VIEW
        </button>
    );

    return (
        <div
            style={{
                left: pos.x,
                top: pos.y,
                width: minimized ? '300px' : '900px',
                height: minimized ? '40px' : '650px',
            }}
            className="fixed z-50 bg-slate-900/90 backdrop-blur-md border border-slate-600 shadow-2xl flex flex-col font-sans select-none pointer-events-auto rounded-lg overflow-hidden ring-1 ring-white/10"
        >
            {/* --- WINDOW HEADER (Siemens Dark) --- */}
            <div
                onMouseDown={handleMouseDown}
                className="bg-slate-950/80 h-9 flex justify-between items-center px-3 cursor-move text-gray-200 shadow-md select-none relative z-10 border-b border-slate-700"
            >
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#009999] rounded-[1px]" />
                    <span className="font-bold text-xs tracking-wide text-gray-100">OB1 [Main Program Cycle]</span>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => setMinimized(!minimized)} className="hover:bg-white/10 p-1 rounded transition">
                        {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                    </button>
                    <button onClick={() => setVisible(false)} className="hover:bg-red-600 p-1 rounded transition text-[#eee]">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* --- WORKSPACE --- */}
            {!minimized && (
                <div className="flex-1 overflow-auto bg-transparent relative custom-scrollbar">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.1]"
                        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '15px 15px' }}>
                    </div>

                    <div className="p-6 pb-20 max-w-[1200px] min-w-[800px]">

                        {/* LEGEND - Added for User Clarity */}
                        <div className="mb-6 flex gap-4 text-[10px] font-mono border-b border-slate-700 pb-2 text-gray-400">
                            <div className="flex items-center gap-2"><span className="text-green-400 font-bold">I</span> = INPUT (Sensor/Button)</div>
                            <div className="flex items-center gap-2"><span className="text-amber-500 font-bold">Q</span> = OUTPUT (Motor/Light)</div>
                            <div className="flex items-center gap-2"><span className="text-cyan-400 font-bold">M</span> = MEMORY (Internal Flag/Logic)</div>
                        </div>

                        {/* NETWORK 1: Safety Chain */}
                        <NetworkHeader num={1} title="Safety Chain Verification" comment="Ensures all guards and sensors are safe before enabling operation." />
                        <div className="flex items-center h-[90px] border-b border-slate-700 mb-2 pl-4">
                            <PowerRail position="left" />
                            <Wire active={true} length="w-6" />

                            <ContactNO address="I0.0" label="ESTOP_BTN" value={inputs?.I0_0_EStop ?? false} active={true} />
                            <Wire active={s1 ?? false} length="w-6" />

                            <ContactNO address="I0.4" label="DOOR_SW" value={inputs?.I0_4_DoorClosed ?? false} active={s1 ?? false} />
                            <Wire active={s2 ?? false} length="w-6" />

                            <ContactNO address="I0.5" label="CURTAIN" value={inputs?.I0_5_SafetyCurtain ?? false} active={s2 ?? false} />
                            <Wire active={s3 ?? false} length="w-6" />

                            <ContactNC address="I0.6" label="ObjectDetect" value={inputs?.I0_6_ReflexSensor ?? false} active={s3 ?? false} />
                            <Wire active={s4 ?? false} />

                            {/* RENAMED FOR CLARITY: SAFETY_OK -> SAFE_FLAG */}
                            <Coil address="M0.4" label="SAFE_FLAG (Mem)" value={markers?.M0_4_InterlocksOk ?? false} active={s4 ?? false} />
                            <PowerRail position="right" />
                        </div>


                        {/* NETWORK 2: Start/Stop Latch */}
                        <NetworkHeader num={2} title="Auto Mode Latch (Start Circuit)" comment="Green button starts logic. Red button stops it. Uses Memory M0.0." />
                        <div className="flex h-[140px] border-b border-slate-700 mb-2 pl-4 relative">
                            <PowerRail position="left" />

                            <div className="flex flex-col h-full justify-center gap-6 relative ml-6">
                                {/* Branches */}
                                <div className="flex items-center">
                                    <div className="absolute top-[30px] -left-4 w-[2px] h-[55px] bg-slate-500"></div>
                                    <ContactNO address="I0.1" label="START_BTN" value={inputs?.I0_1_Start ?? false} active={true} />
                                    <Wire active={r2_start_active ?? false} length="w-12" /> {/* Extended Wire to fix gap */}
                                </div>
                                <div className="flex items-center">
                                    <ContactNO address="M0.0" label="AUTO_FLAG" value={markers?.M0_0_AutoMode ?? false} active={true} />
                                    <Wire active={r2_latch_active ?? false} length="w-12" /> {/* Extended Wire to fix gap */}
                                </div>
                            </div>

                            {/* MOVED LEFT TO CLOSE GAP (180px -> 160px) and FIXED VERTICAL LINE COLOR */}
                            <div className="absolute left-[165px] top-[55px] flex items-center">
                                <div className="absolute -top-[25px] -left-[10px] w-[2px] h-[60px] bg-slate-500"></div>

                                <Wire active={r2_branch_active ?? false} length="w-4" />
                                {/* RENAMED: SAFETY -> SAFE_CHECK */}
                                <ContactNO address="M0.4" label="SAFE_CHECK" value={markers?.M0_4_InterlocksOk ?? false} active={r2_branch_active ?? false} />
                                <Wire active={(r2_branch_active && r2_safety_ok) ?? false} length="w-4" />

                                <ContactNO address="I0.2" label="STOP_BTN" value={inputs?.I0_2_Stop ?? false} active={(r2_branch_active && r2_safety_ok) ?? false} />
                                <Wire active={r2_out ?? false} length="w-8" />

                                <Coil address="M0.0" label="AUTO_ON (Mem)" value={markers?.M0_0_AutoMode ?? false} active={r2_out ?? false} />
                            </div>
                            <PowerRail position="right" />
                        </div>


                        {/* NETWORK 3: Drive Control */}
                        <NetworkHeader num={3} title="Drive Control & Positioning" comment="Main VFD output logic and position feedback." />
                        <div className="flex items-center h-[110px] border-b border-slate-700 mb-2 pl-4">
                            <PowerRail position="left" />
                            <Wire active={markers?.M0_1_Moving ?? false} length="w-6" />

                            <FunctionBlock title="VFD_CTRL" active={markers?.M0_1_Moving ?? false}>
                                <div className="flex justify-between font-bold"><span>SPD:</span> <span>{(analogOutputs?.QW64_SpeedSetpoint ?? 0).toFixed(1)}%</span></div>
                                <div className="flex justify-between text-amber-500"><span>TRQ:</span> <span>{(markers?.M32_Torque ?? 0).toFixed(1)}Nm</span></div>
                            </FunctionBlock>

                            <Wire active={markers?.M0_1_Moving ?? false} length="w-6" />

                            {/* Direction Coils */}
                            <div className="flex flex-col gap-2">
                                <Coil address="M0.6" label="DIR_CW (Down)" value={markers?.M0_6_DirCW ?? false} active={markers?.M0_6_DirCW ?? false} />
                                <Coil address="M0.7" label="DIR_CCW (Up)" value={markers?.M0_7_DirCCW ?? false} active={markers?.M0_7_DirCCW ?? false} />
                            </div>

                            <Coil address="Q0.0" label="M_RUN" value={outputs?.Q0_0_MotorOn ?? false} active={outputs?.Q0_0_MotorOn ?? false} />
                            <Coil address="Q0.1" label="BRAKE" value={outputs?.Q0_1_BrakeRelease ?? false} active={outputs?.Q0_1_BrakeRelease ?? false} />
                            <PowerRail position="right" />
                        </div>

                        {/* NETWORK 4: Position Feedback */}
                        <div className="flex items-center h-[110px] mb-2 pl-4">
                            <PowerRail position="left" />
                            <Wire active={true} length="w-6" />

                            <FunctionBlock title="POS_COMP" active={markers?.M0_2_PosReached ?? false}>
                                <div className="flex justify-between"><span>ACT:</span> <span>{(markers?.M20_Theta ?? 0).toFixed(0)}°</span></div>
                                <div className="flex justify-between"><span>TGT:</span> <span>{(markers?.M36_TargetTheta ?? 0).toFixed(0)}°</span></div>
                                <div className="mt-1 border-t border-slate-600 pt-1 flex justify-between font-bold text-green-400"><span>ERR:</span> <span>{Math.abs((markers?.M36_TargetTheta ?? 0) - (markers?.M20_Theta ?? 0)).toFixed(1)}°</span></div>
                            </FunctionBlock>

                            <Wire active={markers?.M0_2_PosReached ?? false} />
                            <Coil address="M0.2" label="IN_POS" value={markers?.M0_2_PosReached ?? false} active={markers?.M0_2_PosReached ?? false} />
                            <PowerRail position="right" />
                        </div>



                        {/* NETWORK 5: Tray Selection Logic */}
                        <NetworkHeader num={5} title="Tray Selection & Sequencer" comment="Target Tray selection and Step Sequence ID." />
                        <div className="flex items-center h-[110px] border-b border-slate-700 mb-2 pl-4">
                            <PowerRail position="left" />
                            <Wire active={true} length="w-6" />

                            <FunctionBlock title="TRAY_LOGIC" active={true}>
                                <div className="flex justify-between"><span>STEP_ID:</span> <span>{markers?.M15_StepId ?? 0}</span></div>
                                <div className="flex justify-between text-green-400"><span>TARGET:</span> <span>#{markers?.M10_TargetTray ?? 0}</span></div>
                                <div className="flex justify-between text-amber-500"><span>CURRENT:</span> <span>#{markers?.M11_CurrentTray ?? 0}</span></div>
                            </FunctionBlock>

                            <PowerRail position="right" />
                        </div>

                        {/* NETWORK 6: Motor & Encoder Feedback */}
                        <NetworkHeader num={6} title="Motor & Encoder Feedback" comment="Raw Encoder Pulses and Motor Current Draw." />
                        <div className="flex items-center h-[110px] mb-2 pl-4">
                            <PowerRail position="left" />
                            <Wire active={outputs?.Q0_0_MotorOn ?? false} length="w-6" />

                            <div className="flex gap-4">
                                <FunctionBlock title="ENCODER" active={true}>
                                    <div className="flex justify-between"><span>RAW:</span> <span>{(markers?.M20_Theta ?? 0).toFixed(0)}</span></div>
                                    <div className="flex justify-between text-gray-400">PULSES</div>
                                </FunctionBlock>

                                <FunctionBlock title="MOTOR_DRIVE" active={outputs?.Q0_0_MotorOn ?? false}>
                                    <div className="flex justify-between text-yellow-500"><span>AMPS:</span> <span>{(markers?.M32_Torque / 10).toFixed(1)} A</span></div>
                                    <div className="flex justify-between text-cyan-400"><span>FREQ:</span> <span>{((analogOutputs?.QW64_SpeedSetpoint / 100) * 80).toFixed(1)} Hz</span></div>
                                </FunctionBlock>
                            </div>

                            <Wire active={outputs?.Q0_0_MotorOn ?? false} length="w-6" />
                            <PowerRail position="right" />
                        </div>

                        {/* NETWORK 7: CYCLE TIMER (T4) */}
                        <NetworkHeader num={7} title="Cycle Monitoring Timer (T4)" comment="Runs for 10s after Start to monitor initial stabilization." />
                        <div className="flex items-center h-[110px] border-b border-slate-700 mb-2 pl-4">
                            <PowerRail position="left" />

                            <ContactNO address="I0.1 (Start)" label="START_CMD" value={inputs?.I0_1_Start || markers?.M0_0_AutoMode} active={true} />
                            <Wire active={markers?.M0_0_AutoMode ?? false} length="w-6" />

                            <FunctionBlock title="TON (T4)" active={markers?.M0_0_AutoMode ?? false}>
                                <div className="flex justify-between text-yellow-300"><span>PT:</span> <span>10s</span></div>
                                <div className="flex justify-between text-cyan-300"><span>ET:</span> <span>{((markers?.M82_T4_ET || 0) / 1000).toFixed(1)}s</span></div>
                                <div className="mt-1 border-t border-slate-600 font-bold text-center text-white">
                                    {usePlcStore.getState().timers.T4_RunMonitor ? 'DONE' : 'RUN'}
                                </div>
                            </FunctionBlock>

                            <Wire active={usePlcStore.getState().timers.T4_RunMonitor ?? false} length="w-6" />
                            <Coil address="M80.0" label="T4_DONE" value={usePlcStore.getState().timers.T4_RunMonitor ?? false} active={usePlcStore.getState().timers.T4_RunMonitor ?? false} />
                            <PowerRail position="right" />
                        </div>

                        {/* NETWORK 8: SUPPLY COUNTER (C4) */}
                        <NetworkHeader num={8} title="Harness Supply Counter (C4)" comment="Decrements when 'RETIRAR' is pressed in Inventory." />
                        <div className="flex items-center h-[110px] mb-2 pl-4">
                            <PowerRail position="left" />
                            <Wire active={true} length="w-6" />

                            <FunctionBlock title="CTD (C4)" active={true}>
                                <div className="flex justify-between text-green-400"><span>PV:</span> <span>{usePlcStore.getState().counters.C4_Supply ?? 100}</span></div>
                                <div className="flex justify-between text-xs text-gray-400"><span>RESET:</span> <span>A</span></div>
                                <div className="flex justify-between text-xs text-gray-400"><span>LOAD:</span> <span>100</span></div>
                            </FunctionBlock>

                            <Wire active={false} length="w-6" />
                            {/* Visual Only Wire for now unless we drive a lamp */}

                            <PowerRail position="right" />
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

// Export Wrapped Component
export const LadderViewer = () => (
    <ErrorBoundary>
        <LadderContent />
    </ErrorBoundary>
);
