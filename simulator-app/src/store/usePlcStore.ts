import { create } from 'zustand';
import { TRAY_DB } from './HarnessDatabase';
import type { TrayData } from './HarnessDatabase';

// --- MAPA DE MEMORIA DEL PLC (IEC 61131-3 Style) ---

export type Inputs = {
    // Digital Inputs (I)
    I0_0_EStop: boolean;        // NC
    I0_1_Start: boolean;        // NO
    I0_2_Stop: boolean;         // NC
    I0_3_Reset: boolean;        // NO
    I0_4_DoorClosed: boolean;   // NC (Safety)
    I0_5_SafetyCurtain: boolean;// NC (Safety)
    I0_6_ReflexSensor: boolean; // NO (Detection)
    I0_7_HomeSensor: boolean;   // NO (Reference)
};

export type AnalogInputs = {
    // Analog Inputs (IW)
    IW64_TraySensors: number;   // Bitmask 20 bits
    IW66_EncoderPulses: number; // 0-3600
    IW68_MotorCurrent: number;  // Amps
    IW70_LoadWeight: number;    // Kg
};

export type Outputs = {
    // Digital Outputs (Q)
    Q0_0_MotorOn: boolean;
    Q0_1_BrakeRelease: boolean; // True = Released
    Q0_2_Ind_Run: boolean;      // Green Lamp
    Q0_3_Ind_Ready: boolean;    // Yellow Lamp
    Q0_4_Ind_Fault: boolean;    // Red Lamp
    Q0_5_Horn: boolean;         // Alarm Siren
    Q0_6_Tower_Green: boolean;
    Q0_7_Tower_Yellow: boolean;
    Q1_0_Tower_Red: boolean;
};

export type AnalogOutputs = {
    // Analog Outputs (QW)
    QW64_SpeedSetpoint: number; // 0-100%
    QW66_TorqueLimit: number;   // Nm
};

export type Markers = {
    // Internal Flags (M)
    M0_0_AutoMode: boolean;
    M0_1_Moving: boolean;
    M0_2_PosReached: boolean;
    M0_3_Fault: boolean;
    M0_4_InterlocksOk: boolean;
    M0_5_ReadyToPick: boolean;
    M0_6_DirCW: boolean;
    M0_7_DirCCW: boolean;
    M82_T4_ET: number; // For Visualization Only

    // Data Registers (DB1 equivalent)
    M13_PickTrigger: boolean;   // From HMI
    M13_PickTrigger_Old?: boolean; // Internal State

    // Data Registers (DB1 equivalent)
    M10_TargetTray: number;     // 0-19
    M11_CurrentTray: number;    // 0-19
    M12_TargetRef: string | null; // 'A'-'F' or null
    M15_StepId: number;         // PLC Sequence Step

    // Physics Telemetry (Mapped to M20-M32)
    M20_Theta: number;          // Deg
    M24_Omega: number;          // Rad/s
    M28_Alpha: number;          // Rad/s^2
    M32_Torque: number;         // Nm
    M36_TargetTheta: number;    // Deg

    // PID Telemetry
    M40_PidP: number;
    M42_PidI: number;
    M44_PidD: number;
    M50_ForcedVentilation: boolean; // Independent Cooling Fan

    // Live Calibration
    M60_CalibrationOffset: number; // Degrees (+/-)
    M62_SlowSpeedLimit: number;    // % (0-100)
};

export type Counters = {
    C1_Production: number;
    C2_Error: number;
    C3_Pick: number;
    C4_Supply: number; // New: Harness Inventory in Machine
};

export type Timers = {
    T1_Stabilize: boolean; // Done flag
    T2_Wait: boolean;
    T3_MoveTimeout: boolean;
    T4_RunMonitor: boolean; // New: 10s Timer
};

interface PlcState {
    inputs: Inputs;
    analogInputs: AnalogInputs;
    outputs: Outputs;
    analogOutputs: AnalogOutputs;
    markers: Markers;
    counters: Counters;
    timers: Timers; // Visual state of timers for debug

    trayDb: TrayData[]; // Inventory DB (M100+)

    // Visualization State
    presentedTrayId: number | null;
    presentedHarnesses: string[];

    // Actions
    updateTags: (tags: Partial<Inputs & AnalogInputs & Outputs & AnalogOutputs & Markers>) => void;
    updateInventory: (trayId: number, refIndex: number, change: number) => void;
    setTimerState: (timer: keyof Timers, done: boolean) => void;
    setCounter: (counter: keyof Counters, val: number) => void;
    setPresented: (trayId: number | null, refs: string[]) => void;

    // Helper to bulk set from Simulation
    updateFromPhys: (
        inputs: Partial<Inputs>,
        ai: Partial<AnalogInputs>,
        markers: Partial<Markers>
    ) => void;
}

export const usePlcStore = create<PlcState>((set) => ({
    trayDb: TRAY_DB,

    presentedTrayId: null,
    presentedHarnesses: [],

    inputs: {
        I0_0_EStop: true, // NC (Safe = True)
        I0_1_Start: false,
        I0_2_Stop: true,  // NC
        I0_3_Reset: false,
        I0_4_DoorClosed: true,
        I0_5_SafetyCurtain: true,
        I0_6_ReflexSensor: false,
        I0_7_HomeSensor: false,
    },
    analogInputs: {
        IW64_TraySensors: 0,
        IW66_EncoderPulses: 0,
        IW68_MotorCurrent: 0,
        IW70_LoadWeight: 0,
    },
    outputs: {
        Q0_0_MotorOn: false,
        Q0_1_BrakeRelease: false,
        Q0_2_Ind_Run: false,
        Q0_3_Ind_Ready: false,
        Q0_4_Ind_Fault: false,
        Q0_5_Horn: false,
        Q0_6_Tower_Green: false,
        Q0_7_Tower_Yellow: false,
        Q1_0_Tower_Red: false,
    },
    analogOutputs: {
        QW64_SpeedSetpoint: 0.0,
        QW66_TorqueLimit: 25.0,
    },
    markers: {
        M0_0_AutoMode: false,
        M0_1_Moving: false,
        M0_2_PosReached: false,
        M0_3_Fault: false,
        M0_4_InterlocksOk: false,
        M0_5_ReadyToPick: false,
        M0_6_DirCW: false,        // New: Clockwise (Down)
        M0_7_DirCCW: false,       // New: Counter-Clockwise (Up)

        M13_PickTrigger: false,   // From HMI

        M10_TargetTray: 0,
        M11_CurrentTray: 0,
        M12_TargetRef: null,
        M15_StepId: 0,

        M20_Theta: 0.0,
        M24_Omega: 0.0,
        M28_Alpha: 0.0,
        M32_Torque: 0.0,
        M36_TargetTheta: 0.0,

        M40_PidP: 0.0,
        M42_PidI: 0.0,
        M44_PidD: 0.0,
        M50_ForcedVentilation: true, // Installed and Running by Default

        M60_CalibrationOffset: -7.5, // Default
        M62_SlowSpeedLimit: 15.0,    // Default
        M82_T4_ET: 0,                // New: T4 Elapsed Time (ms)
    },
    counters: {
        C1_Production: 0,
        C2_Error: 0,
        C3_Pick: 0,
        C4_Supply: 100 // Default 100 Harnesses
    },
    timers: {
        T1_Stabilize: false,
        T2_Wait: false,
        T3_MoveTimeout: false,
        T4_RunMonitor: false
    },

    updateTags: (tags) => set((state) => {
        // Deep merge logic (simplified for perf - flattening would be better but keeping structure)
        const next = { ...state };
        // We iterate keys to distribute into sub-objects
        // This is slow, but safe for React state
        Object.keys(tags).forEach(k => {
            if (k in state.inputs) (next.inputs as any)[k] = (tags as any)[k];
            else if (k in state.outputs) (next.outputs as any)[k] = (tags as any)[k];
            else if (k in state.markers) (next.markers as any)[k] = (tags as any)[k];
            else if (k in state.analogInputs) (next.analogInputs as any)[k] = (tags as any)[k];
            else if (k in state.analogOutputs) (next.analogOutputs as any)[k] = (tags as any)[k];
        });
        return next;
    }),

    updateFromPhys: (i, ai, m) => set(state => ({
        inputs: { ...state.inputs, ...i },
        analogInputs: { ...state.analogInputs, ...ai },
        markers: { ...state.markers, ...m }
    })),

    updateInventory: (trayId, refIndex, change) => set((state) => {
        const newDb = [...state.trayDb];
        const tray = { ...newDb[trayId] };
        const slots = [...tray.slots];
        const slot = { ...slots[refIndex] };

        slot.count = Math.max(0, slot.count + change);
        slots[refIndex] = slot;
        tray.slots = slots;
        newDb[trayId] = tray;

        return { trayDb: newDb };
    }),

    setTimerState: (t, done) => set(s => ({ timers: { ...s.timers, [t]: done } })),
    setCounter: (c, val) => set(s => ({ counters: { ...s.counters, [c]: val } })),
    setPresented: (tId, refs) => set({ presentedTrayId: tId, presentedHarnesses: refs })
}));
