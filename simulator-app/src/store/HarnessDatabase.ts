
export type HarnessType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type TraySlot = {
    type: HarnessType;
    count: number;
    color: string;
    label: string;
};

export type TrayData = {
    id: number;
    slots: TraySlot[];
};

export const HARNESS_CONFIG: Record<HarnessType, { color: string, label: string }> = {
    'A': { color: '#ef4444', label: 'Ref A' }, // Red-500
    'B': { color: '#22c55e', label: 'Ref B' }, // Green-500
    'C': { color: '#3b82f6', label: 'Ref C' }, // Blue-500
    'D': { color: '#eab308', label: 'Ref D' }, // Yellow-500
    'E': { color: '#06b6d4', label: 'Ref E' }, // Cyan-500
    'F': { color: '#d946ef', label: 'Ref F' }, // Fuchsia-500
};

// Generate 20 Trays with 6 Slots each
export const TRAY_DB: TrayData[] = Array.from({ length: 20 }).map((_, i) => {
    return {
        id: i, // 0-based index for logic ease, displayed as "Tray 0" or "Tray 1" depending on pref. User said "BANDEJA 0 (Home)"
        slots: (() => {
            const itemsCount = Math.floor(Math.random() * 7); // 0 to 6 items total
            const slots = Array.from({ length: 6 }).map((_, idx) => ({
                type: String.fromCharCode(65 + idx) as HarnessType,
                count: 0,
                color: HARNESS_CONFIG[String.fromCharCode(65 + idx) as HarnessType].color,
                label: HARNESS_CONFIG[String.fromCharCode(65 + idx) as HarnessType].label
            }));

            // Randomly fill 'itemsCount' slots with 1
            const indices = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
            for (let k = 0; k < itemsCount; k++) {
                slots[indices[k]].count = 1;
            }
            return slots;
        })()
    };
});
