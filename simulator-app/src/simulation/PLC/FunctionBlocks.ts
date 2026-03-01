/**
 * SIMULATED PLC FUNCTION BLOCKS
 * mimic Siemens S7-1200 instructions
 */

// FB_Safety: Aggregates safety signals into a global SafetyOK status
export const FB_Safety = (
    EStop: boolean,      // NC (True = OK)
    LightCurtain: boolean, // NC (True = OK)
    DoorClosed: boolean,   // NC (True = OK)
    Reset: boolean         // NO (True = Pressed)
): { SafetyOk: boolean; FaultActive: boolean } => {

    // Simple logic: All must be True.
    // Real usage: Often requires a Reset signal to re-energize safety relay after failure.

    const allSafe = EStop && LightCurtain && DoorClosed;

    // Fake usage of Reset to satisfy linter until latching is implemented
    const ack = Reset;
    if (ack) { /* Reset Logic Placeholer */ }

    return {
        SafetyOk: allSafe,
        FaultActive: !allSafe
    };
};

// FB_Motor: Direct On Line (DOL) with Reversing
export const FB_Motor = (
    Start: boolean,    // NO
    Stop: boolean,     // NC (True = Idle)
    SafetyOk: boolean,
    Direction: 'CW' | 'CCW',
    CurrentState: { Running: boolean; Direction: 'CW' | 'CCW' }
) => {
    let { Running, Direction: CmdDir } = CurrentState;

    // Interlock
    if (!SafetyOk) {
        Running = false;
    }
    // Stop Command (Stop is NC, so False = Pressed)
    else if (!Stop) {
        Running = false;
    }
    // Start Command
    else if (Start) {
        Running = true;
        CmdDir = Direction;
    }

    return {
        Running,
        Direction: CmdDir,
        Q_CW: Running && CmdDir === 'CW',
        Q_CCW: Running && CmdDir === 'CCW'
    }
};

// FB_Positioning: Calculates Shortest Path
export const FB_Positioning = (
    CurrentTray: number, // 1-20
    TargetTray: number,  // 1-20
    TotalTrays: number = 20
): { Direction: 'CW' | 'CCW'; Distance: number; Arrived: boolean } => {
    if (CurrentTray === TargetTray) return { Direction: 'CW', Distance: 0, Arrived: true };

    // Calculate CW distance
    // CW: 1 -> 2 -> 3
    let cwDist = TargetTray - CurrentTray;
    if (cwDist < 0) cwDist += TotalTrays;

    // Calculate CCW distance
    let ccwDist = TotalTrays - cwDist;

    // Select shortest
    if (cwDist <= ccwDist) {
        return { Direction: 'CW', Distance: cwDist, Arrived: false };
    } else {
        return { Direction: 'CCW', Distance: ccwDist, Arrived: false };
    }
};
