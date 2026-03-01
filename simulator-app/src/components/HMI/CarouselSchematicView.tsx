/**
 * CarouselSchematicView.tsx
 * 
 * Vista esquemática 2D lateral del carrusel paternoster.
 * Muestra 7 bandejas visibles que se desplazan verticalmente
 * según la posición del encoder, con indicadores de arneses.
 * 
 * Equivalente WinCC: Scr_Animacion
 */

import { useState, useCallback, useMemo } from 'react';
import { usePlcStore } from '../../store/usePlcStore';
import type { TrayData, TraySlot } from '../../store/HarnessDatabase';

const TOTAL_TRAYS = 20;
const CYCLE_DEGS = 2864.79; // Ciclo real del carrusel (chain_len/radius * 180/PI)
const TRAY_SPACING_DEG = CYCLE_DEGS / TOTAL_TRAYS; // ~143.24° between trays
const VISIBLE_TRAYS = 7; // How many trays to render in the strip

/** Small colored dot representing a harness slot */
const HarnessDot = ({ slot, size = 10 }: { slot: TraySlot; size?: number }) => (
    <div
        style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: slot.count > 0 ? slot.color : '#333',
            border: slot.count > 0 ? `1px solid ${slot.color}` : '1px solid #555',
            opacity: slot.count > 0 ? 1 : 0.4,
            boxShadow: slot.count > 0 ? `0 0 4px ${slot.color}60` : 'none',
            transition: 'all 0.3s ease',
        }}
        title={`${slot.label}: ${slot.count}`}
    />
);

/** A single tray row in the schematic */
const TrayRow = ({
    tray,
    isTarget,
    isAtPickZone,
    trayHeight,
}: {
    tray: TrayData;
    isTarget: boolean;
    isAtPickZone: boolean;
    trayHeight: number;
}) => {
    const totalItems = tray.slots.reduce((sum, s) => sum + s.count, 0);
    const isEmpty = totalItems === 0;

    return (
        <div
            style={{
                height: trayHeight,
                display: 'flex',
                alignItems: 'center',
                padding: '0 6px',
                gap: 4,
                borderBottom: '1px solid #333',
                borderTop: isAtPickZone ? '2px solid #00ff88' : 'none',
                background: isAtPickZone
                    ? 'linear-gradient(90deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05))'
                    : isTarget
                        ? 'rgba(59,130,246,0.1)'
                        : 'transparent',
                transition: 'background 0.3s ease',
            }}
        >
            {/* Tray ID */}
            <div
                style={{
                    width: 36,
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: isAtPickZone || isTarget ? 'bold' : 'normal',
                    color: isAtPickZone ? '#00ff88' : isTarget ? '#60a5fa' : '#888',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                }}
            >
                {tray.id.toString().padStart(2, '0')}
            </div>

            {/* Tray body / harness dots */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    background: isEmpty ? '#111' : '#1a1a2e',
                    borderRadius: 3,
                    padding: '3px 4px',
                    border: isAtPickZone
                        ? '1px solid #00ff88'
                        : isTarget
                            ? '1px solid #3b82f6'
                            : '1px solid #2a2a3e',
                    boxShadow: isAtPickZone ? '0 0 8px rgba(0,255,136,0.3)' : 'none',
                }}
            >
                {tray.slots.map((slot, idx) => (
                    <HarnessDot key={idx} slot={slot} size={9} />
                ))}
            </div>

            {/* Item count */}
            <div
                style={{
                    width: 18,
                    textAlign: 'center',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: isEmpty ? '#555' : '#aaa',
                    flexShrink: 0,
                }}
            >
                {totalItems}
            </div>
        </div>
    );
};


export const CarouselSchematicView = () => {
    const trayDb = usePlcStore(s => s.trayDb);
    const theta = usePlcStore(s => s.markers.M20_Theta);
    const targetTray = usePlcStore(s => s.markers.M10_TargetTray);
    const currentTray = usePlcStore(s => s.markers.M11_CurrentTray);
    const isMoving = usePlcStore(s => s.markers.M0_1_Moving);
    const posReached = usePlcStore(s => s.markers.M0_2_PosReached);
    const estop = usePlcStore(s => s.inputs.I0_0_EStop);
    const reflexSensor = usePlcStore(s => s.inputs.I0_6_ReflexSensor);
    const running = usePlcStore(s => s.outputs.Q0_2_Ind_Run);
    const updateTags = usePlcStore(s => s.updateTags);
    const updateInventory = usePlcStore(s => s.updateInventory);
    const setPresented = usePlcStore(s => s.setPresented);

    const [selectedTray, setSelectedTray] = useState(0);
    const [selRefs, setSelRefs] = useState<string[]>([]);

    // Use M11_CurrentTray from the Processor for pick zone display
    // (avoids the old bug where theta%360/18 gave wrong tray due to ~2865° cycle)
    const pickZoneTray = currentTray;

    // Build the visible tray list (centered on pick zone)
    const visibleTrays = useMemo(() => {
        const result: { tray: TrayData; isAtPickZone: boolean }[] = [];
        const halfVisible = Math.floor(VISIBLE_TRAYS / 2);

        for (let i = -halfVisible; i <= halfVisible; i++) {
            const trayIdx = ((currentTray + i) % TOTAL_TRAYS + TOTAL_TRAYS) % TOTAL_TRAYS;
            result.push({
                tray: trayDb[trayIdx],
                isAtPickZone: i === 0,
            });
        }
        return result;
    }, [currentTray, trayDb]);

    // Calculate fractional offset for smooth scrolling using real cycle
    const fractionalOffset = useMemo(() => {
        const exactPosition = theta / TRAY_SPACING_DEG;
        return (exactPosition - Math.round(exactPosition)) * 44; // 44px per tray
    }, [theta]);

    // Picking state
    const pickState = useMemo(() => {
        if (!estop) return 'ESTOP';
        if (reflexSensor) return 'EXTRACTED';
        if (running && !posReached) return 'MOVING';
        if (posReached) return 'ARRIVED';
        return 'IDLE';
    }, [estop, reflexSensor, running, posReached]);

    const handleMove = useCallback(() => {
        if (pickState === 'MOVING' || reflexSensor || !estop) return;

        updateTags({
            M10_TargetTray: selectedTray,
            M12_TargetRef: null,
            M0_0_AutoMode: true,
            M0_2_PosReached: false,   // FIX: Resetear flag de posición
            M0_1_Moving: false,       // FIX: Será activado por el Processor
            I0_2_Stop: true,
            I0_0_EStop: true,
            I0_4_DoorClosed: true,
            I0_5_SafetyCurtain: true,
            I0_6_ReflexSensor: false,
        });
        updateTags({ I0_1_Start: true });
        setTimeout(() => updateTags({ I0_1_Start: false }), 200);
    }, [selectedTray, pickState, reflexSensor, estop, updateTags]);

    const handleExtract = useCallback(() => {
        if (!posReached) return;
        updateTags({ I0_6_ReflexSensor: true, I0_2_Stop: false });
        setTimeout(() => updateTags({ I0_2_Stop: true }), 200);
        setPresented(pickZoneTray, selRefs);
    }, [posReached, updateTags, setPresented, pickZoneTray, selRefs]);

    const handleRemove = useCallback(() => {
        if (!reflexSensor) return;
        updateTags({ I0_6_ReflexSensor: false, M0_0_AutoMode: false });
        setPresented(null, []);

        // Update inventory for ALL selected refs (same as OPER)
        const tray = trayDb[pickZoneTray];
        if (tray && selRefs.length > 0) {
            selRefs.forEach(refType => {
                const refIdx = tray.slots.findIndex(s => s.type === refType);
                if (refIdx >= 0 && tray.slots[refIdx].count > 0) {
                    updateInventory(pickZoneTray, refIdx, -1);
                }
            });
        }
        setSelRefs([]);
    }, [reflexSensor, updateTags, setPresented, updateInventory, trayDb, pickZoneTray, selRefs]);

    // Reference selection handlers (same as OPER)
    const toggleRef = useCallback((ref: string) => {
        setSelRefs(prev =>
            prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]
        );
    }, []);

    const selectAll = useCallback(() => {
        const tray = trayDb[pickZoneTray];
        if (!tray) return;
        const allRefs = tray.slots.filter(s => s.count > 0).map(s => s.type);
        setSelRefs(allRefs);
    }, [trayDb, pickZoneTray]);

    // Status text and color
    const statusConfig = useMemo(() => {
        switch (pickState) {
            case 'ESTOP': return { text: 'E-STOP ACTIVO', color: '#ef4444', bg: '#7f1d1d' };
            case 'MOVING': return { text: `GIRANDO → BDJ ${targetTray}...`, color: '#22c55e', bg: '#14532d' };
            case 'ARRIVED': return { text: 'POSICIÓN OK', color: '#eab308', bg: '#422006' };
            case 'EXTRACTED': return { text: 'BLOQUEADO — RETIRE ARNÉS', color: '#f97316', bg: '#431407' };
            default: return { text: 'ESPERANDO ORDEN', color: '#6b7280', bg: '#1f2937' };
        }
    }, [pickState, targetTray]);

    const TRAY_H = 44;
    const stripHeight = VISIBLE_TRAYS * TRAY_H;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: "'Inter', 'Segoe UI', monospace",
            color: '#e0e0e0',
            fontSize: 12,
            gap: 8,
        }}>
            {/* STATUS BAR */}
            <div style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: statusConfig.bg,
                border: `1px solid ${statusConfig.color}40`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: statusConfig.color,
                    boxShadow: `0 0 8px ${statusConfig.color}`,
                    animation: pickState === 'MOVING' ? 'pulse 1s infinite' : 'none',
                }} />
                <span style={{ color: statusConfig.color, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 }}>
                    {statusConfig.text}
                </span>
                <span style={{ marginLeft: 'auto', color: '#666', fontSize: 10 }}>
                    θ {theta.toFixed(1)}°
                </span>
            </div>

            {/* MAIN CONTENT: CAROUSEL + CONTROLS */}
            <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
                {/* LEFT: SCHEMATIC CAROUSEL */}
                <div style={{
                    width: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                }}>
                    <div style={{
                        fontSize: 9, color: '#666', textAlign: 'center',
                        padding: '2px 0', textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                        ▲ SUBIDA
                    </div>

                    {/* Chain left decoration */}
                    <div style={{
                        position: 'relative',
                        height: stripHeight,
                        overflow: 'hidden',
                        border: '1px solid #333',
                        borderRadius: 4,
                        background: '#0a0a0f',
                    }}>
                        {/* Chain lines (decorative) */}
                        <div style={{
                            position: 'absolute', left: 2, top: 0, bottom: 0,
                            width: 3, background: 'repeating-linear-gradient(to bottom, #333 0px, #555 2px, #333 4px)',
                            opacity: 0.5,
                        }} />
                        <div style={{
                            position: 'absolute', right: 2, top: 0, bottom: 0,
                            width: 3, background: 'repeating-linear-gradient(to bottom, #333 0px, #555 2px, #333 4px)',
                            opacity: 0.5,
                        }} />

                        {/* Pick zone indicator arrows */}
                        <div style={{
                            position: 'absolute',
                            left: -1,
                            top: Math.floor(VISIBLE_TRAYS / 2) * TRAY_H + TRAY_H / 2 - 6,
                            color: '#00ff88',
                            fontSize: 12,
                            fontWeight: 'bold',
                            zIndex: 10,
                            textShadow: '0 0 6px #00ff88',
                        }}>▶</div>
                        <div style={{
                            position: 'absolute',
                            right: -1,
                            top: Math.floor(VISIBLE_TRAYS / 2) * TRAY_H + TRAY_H / 2 - 6,
                            color: '#00ff88',
                            fontSize: 12,
                            fontWeight: 'bold',
                            zIndex: 10,
                            textShadow: '0 0 6px #00ff88',
                        }}>◀</div>

                        {/* Scrolling tray strip */}
                        <div style={{
                            position: 'absolute',
                            left: 8,
                            right: 8,
                            top: -fractionalOffset,
                            transition: 'top 0.1s linear',
                        }}>
                            {visibleTrays.map(({ tray, isAtPickZone }, idx) => (
                                <TrayRow
                                    key={`${idx}-${tray.id}`}
                                    tray={tray}
                                    isTarget={tray.id === targetTray}
                                    isAtPickZone={isAtPickZone}
                                    trayHeight={TRAY_H}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{
                        fontSize: 9, color: '#666', textAlign: 'center',
                        padding: '2px 0', textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                        ▼ BAJADA
                    </div>

                    {/* Legend */}
                    <div style={{
                        marginTop: 4,
                        padding: '4px 6px',
                        background: '#111',
                        borderRadius: 4,
                        border: '1px solid #222',
                    }}>
                        <div style={{ fontSize: 8, color: '#555', marginBottom: 3, textTransform: 'uppercase' }}>Leyenda</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map((ref, i) => {
                                const colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#06b6d4', '#d946ef'];
                                return (
                                    <div key={ref} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <div style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            backgroundColor: colors[i],
                                        }} />
                                        <span style={{ fontSize: 8, color: '#888' }}>{ref}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT: CONTROLS */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minWidth: 0,
                }}>
                    {/* SELECTOR */}
                    <div style={{
                        padding: '8px',
                        background: '#111',
                        borderRadius: 6,
                        border: '1px solid #222',
                    }}>
                        <div style={{ fontSize: 9, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Seleccionar Bandeja
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <select
                                value={selectedTray}
                                onChange={(e) => setSelectedTray(Number(e.target.value))}
                                disabled={pickState === 'MOVING'}
                                style={{
                                    flex: 1,
                                    background: '#1a1a2e',
                                    color: '#e0e0e0',
                                    border: '1px solid #333',
                                    borderRadius: 4,
                                    padding: '6px 8px',
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    cursor: 'pointer',
                                }}
                            >
                                {trayDb.map((t) => {
                                    const total = t.slots.reduce((s, sl) => s + sl.count, 0);
                                    return (
                                        <option key={t.id} value={t.id}>
                                            BDJ {t.id.toString().padStart(2, '0')} — {total} arneses
                                        </option>
                                    );
                                })}
                            </select>
                            <button
                                onClick={handleMove}
                                disabled={pickState === 'MOVING' || reflexSensor || !estop}
                                style={{
                                    padding: '6px 14px',
                                    background: pickState === 'MOVING' || reflexSensor || !estop ? '#333' : '#166534',
                                    color: pickState === 'MOVING' || reflexSensor || !estop ? '#666' : '#86efac',
                                    border: `1px solid ${pickState === 'MOVING' || reflexSensor || !estop ? '#444' : '#22c55e'}`,
                                    borderRadius: 4,
                                    fontWeight: 'bold',
                                    fontSize: 11,
                                    cursor: pickState === 'MOVING' || reflexSensor || !estop ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                MOVER
                            </button>
                        </div>
                    </div>

                    {/* CURRENT TRAY DETAIL */}
                    <div style={{
                        flex: 1,
                        padding: '8px',
                        background: '#111',
                        borderRadius: 6,
                        border: '1px solid #222',
                        overflow: 'auto',
                    }}>
                        <div style={{ fontSize: 9, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Bandeja en Posición: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
                                BDJ {pickZoneTray.toString().padStart(2, '0')}
                            </span>
                        </div>

                        {/* Per-ref inventory display — clickable for selection */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {trayDb[pickZoneTray]?.slots.map((slot, idx) => {
                                const isSelected = selRefs.includes(slot.type);
                                const canSelect = slot.count > 0 && (pickState === 'ARRIVED' || pickState === 'EXTRACTED');
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => canSelect && toggleRef(slot.type)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '4px 6px',
                                            background: isSelected ? `${slot.color}25` : slot.count > 0 ? `${slot.color}15` : '#0a0a0f',
                                            borderRadius: 4,
                                            border: isSelected
                                                ? `2px solid ${slot.color}`
                                                : `1px solid ${slot.count > 0 ? `${slot.color}40` : '#1a1a2e'}`,
                                            cursor: canSelect ? 'pointer' : 'default',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{
                                            width: 12, height: 12, borderRadius: '50%',
                                            backgroundColor: slot.count > 0 ? slot.color : '#333',
                                            boxShadow: isSelected ? `0 0 8px ${slot.color}` : slot.count > 0 ? `0 0 6px ${slot.color}60` : 'none',
                                        }} />
                                        <span style={{
                                            fontSize: 11,
                                            color: isSelected ? '#fff' : slot.count > 0 ? '#ddd' : '#555',
                                            fontWeight: slot.count > 0 ? 'bold' : 'normal',
                                        }}>
                                            {slot.label}
                                        </span>
                                        <span style={{
                                            marginLeft: 'auto', fontSize: 11,
                                            color: isSelected ? '#fff' : slot.count > 0 ? slot.color : '#444',
                                            fontFamily: 'monospace',
                                        }}>
                                            {slot.count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Select All / Clear buttons */}
                        {(pickState === 'ARRIVED' || pickState === 'EXTRACTED') && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <button
                                    onClick={selectAll}
                                    style={{
                                        flex: 1,
                                        padding: '3px 6px',
                                        fontSize: 9,
                                        background: '#1a1a2e',
                                        color: '#60a5fa',
                                        border: '1px solid #333',
                                        borderRadius: 3,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    ✓ Seleccionar Todo
                                </button>
                                <button
                                    onClick={() => setSelRefs([])}
                                    style={{
                                        flex: 1,
                                        padding: '3px 6px',
                                        fontSize: 9,
                                        background: '#1a1a2e',
                                        color: '#888',
                                        border: '1px solid #333',
                                        borderRadius: 3,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    ✕ Limpiar
                                </button>
                            </div>
                        )}

                        {/* Summary */}
                        <div style={{
                            marginTop: 8,
                            padding: '4px 8px',
                            background: '#0a0a0f',
                            borderRadius: 4,
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 10,
                            color: '#666',
                        }}>
                            <span>Total arneses:</span>
                            <span style={{ color: '#aaa', fontWeight: 'bold' }}>
                                {trayDb[pickZoneTray]?.slots.reduce((s, sl) => s + sl.count, 0) || 0}
                            </span>
                        </div>
                    </div>

                    {/* PICKING BUTTONS */}
                    <div style={{
                        display: 'flex',
                        gap: 6,
                    }}>
                        <button
                            onClick={handleExtract}
                            disabled={pickState !== 'ARRIVED'}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                background: pickState === 'ARRIVED' ? '#854d0e' : '#1a1a2e',
                                color: pickState === 'ARRIVED' ? '#fde047' : '#555',
                                border: `1px solid ${pickState === 'ARRIVED' ? '#eab308' : '#333'}`,
                                borderRadius: 4,
                                fontWeight: 'bold',
                                fontSize: 11,
                                cursor: pickState === 'ARRIVED' ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                            }}
                        >
                            📦 SACAR
                        </button>
                        <button
                            onClick={handleRemove}
                            disabled={pickState !== 'EXTRACTED'}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                background: pickState === 'EXTRACTED' ? '#0e4429' : '#1a1a2e',
                                color: pickState === 'EXTRACTED' ? '#86efac' : '#555',
                                border: `1px solid ${pickState === 'EXTRACTED' ? '#22c55e' : '#333'}`,
                                borderRadius: 4,
                                fontWeight: 'bold',
                                fontSize: 11,
                                cursor: pickState === 'EXTRACTED' ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                            }}
                        >
                            ✓ RETIRAR
                        </button>
                    </div>

                    {/* TELEMETRY MINI */}
                    <div style={{
                        padding: '6px 8px',
                        background: '#111',
                        borderRadius: 6,
                        border: '1px solid #222',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 4,
                        fontSize: 10,
                        fontFamily: 'monospace',
                    }}>
                        <div style={{ color: '#666' }}>Current: <span style={{ color: '#aaa' }}>BDJ {currentTray}</span></div>
                        <div style={{ color: '#666' }}>Target: <span style={{ color: '#60a5fa' }}>BDJ {targetTray}</span></div>
                        <div style={{ color: '#666' }}>Encoder: <span style={{ color: '#aaa' }}>{theta.toFixed(1)}°</span></div>
                        <div style={{ color: '#666' }}>Motor: <span style={{ color: isMoving ? '#22c55e' : '#555' }}>{isMoving ? 'ON' : 'OFF'}</span></div>
                    </div>
                </div>
            </div>

            {/* CSS Animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};
