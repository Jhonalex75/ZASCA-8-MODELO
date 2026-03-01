import { useState } from 'react';
import { usePlcStore } from '../../store/usePlcStore';
import { Package, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { clsx } from 'clsx';

export const InventoryPanel = () => {
    // Computed from Store (Reactive)
    const trays = usePlcStore(state => state.trayDb);
    const updateTags = usePlcStore(state => state.updateTags);
    const targetTray = usePlcStore(state => state.markers.M10_TargetTray);
    const currentTray = usePlcStore(state => state.markers.M11_CurrentTray);
    const targetRef = usePlcStore(state => state.markers.M12_TargetRef);

    const [expanded, setExpanded] = useState<number | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'STOCK' | 'EMPTY'>('ALL');
    const [search, setSearch] = useState('');

    const handleSelectTray = (id: number) => {
        updateTags({ M10_TargetTray: id, M12_TargetRef: null });
        setExpanded(id);
    };

    const handleSelectRef = (e: React.MouseEvent, trayId: number, type: string) => {
        e.stopPropagation(); // Don't collapse
        updateTags({ M10_TargetTray: trayId, M12_TargetRef: type });
    };

    // Filtering
    const filteredTrays = trays.filter(tray => {
        const totalItems = tray.slots.reduce((acc, s) => acc + s.count, 0);
        const matchesSearch = `Tray ${tray.id}`.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;
        if (filter === 'STOCK') return totalItems > 0;
        if (filter === 'EMPTY') return totalItems === 0;
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-industrial-100 border-l border-industrial-300 font-sans">
            {/* Header */}
            <div className="bg-industrial-800 text-white p-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                <span>📦 Inventario ({trays.length})</span>
                <span className="bg-industrial-700 px-2 py-0.5 rounded text-[10px]">
                    Total: {trays.reduce((acc, t) => acc + t.slots.reduce((sum, s) => sum + s.count, 0), 0)}
                </span>
            </div>

            {/* Filters */}
            <div className="p-2 space-y-2 bg-industrial-200 border-b border-industrial-300">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar Bandeja..."
                        className="w-full pl-7 pr-2 py-1 text-xs rounded border border-gray-400 focus:border-siemens-accent outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-1">
                    {['ALL', 'STOCK', 'EMPTY'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={clsx(
                                "flex-1 text-[10px] uppercase font-bold py-1 rounded",
                                filter === f ? "bg-siemens-accent text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
                            )}
                        >
                            {f === 'ALL' ? 'Todas' : f === 'STOCK' ? 'Con Stock' : 'Vacías'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredTrays.map(tray => {
                    const totalStock = tray.slots.reduce((a, b) => a + b.count, 0);
                    const isSelected = targetTray === tray.id;
                    const isExpanded = expanded === tray.id;
                    const isCurrent = currentTray === tray.id;

                    return (
                        <div
                            key={tray.id}
                            className={clsx(
                                "border rounded transition-all duration-200 bg-white",
                                isSelected ? "border-siemens-accent shadow-md ring-1 ring-siemens-accent/30" : "border-gray-300 hover:border-gray-400",
                                isCurrent && "border-l-4 border-l-green-500"
                            )}
                        >
                            {/* Tray Header */}
                            <div
                                onClick={() => handleSelectTray(tray.id)}
                                className={clsx(
                                    "p-2 flex items-center justify-between cursor-pointer hover:bg-gray-50",
                                    isSelected && "bg-blue-50"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-industrial-800">
                                            BANDEJA {tray.id}
                                            {isCurrent && <span className="ml-2 text-[10px] text-green-600 bg-green-100 px-1 rounded animate-pulse">ACTUAL</span>}
                                        </span>
                                        <span className="text-[10px] text-gray-500">{totalStock} unidades / 6 refs</span>
                                    </div>
                                </div>
                                {totalStock === 0 && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1 rounded">VACÍA</span>}
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t border-gray-200 bg-gray-50 p-2 space-y-1">
                                    {tray.slots.map(slot => (
                                        <div
                                            key={slot.type}
                                            onClick={(e) => handleSelectRef(e, tray.id, slot.type)}
                                            className={clsx(
                                                "flex justify-between items-center p-1.5 rounded cursor-pointer text-xs group",
                                                targetRef === slot.type && isSelected ? "bg-siemens-accent text-white" : "hover:bg-white border border-transparent hover:border-gray-200"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: slot.color }}
                                                />
                                                <span className="font-mono">{slot.label}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Package size={10} className="opacity-50" />
                                                <span className="font-bold">{slot.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-2 flex justify-between items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("HMI: Picking from Tray", tray.id);
                                                updateTags({ M13_PickTrigger: true }); // Trigger PLC
                                            }}
                                            className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm transition flex-1"
                                        >
                                            RETIRAR 1 UND (C4)
                                        </button>
                                        <div className="text-[9px] text-gray-400 text-right">
                                            C4 Supply: {usePlcStore.getState().counters.C4_Supply ?? 100}
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-center text-gray-400 pt-1">
                                        Click en referencia para picking específico
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
