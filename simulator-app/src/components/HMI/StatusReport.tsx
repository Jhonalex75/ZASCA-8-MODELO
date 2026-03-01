import { useMemo } from 'react';
import { usePlcStore } from '../../store/usePlcStore';
import { clsx } from 'clsx';

export const StatusReport = () => {
    const trayDb = usePlcStore(state => state.trayDb);

    const stats = useMemo(() => {
        let total = 0;
        const trays = trayDb.map(tray => {
            const itemCount = tray.slots.reduce((acc, slot) => acc + slot.count, 0);
            const items = tray.slots
                .filter(s => s.count > 0)
                .map(s => `${s.type}(${s.count})`)
                .join(', ');

            total += itemCount;

            return {
                id: tray.id,
                count: itemCount,
                desc: itemCount > 0 ? items : 'EMPTY'
            };
        });

        return { total, trays };
    }, [trayDb]);

    return (
        <div className="absolute right-[420px] top-6 z-10 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-sm border border-green-900 p-4 rounded shadow-2xl text-green-500 font-mono text-xs w-[280px] max-h-[80vh] flex flex-col pointer-events-auto">
                <h2 className="text-sm font-bold border-b border-green-800 pb-2 mb-2 uppercase tracking-wider flex justify-between">
                    <span>System Status</span>
                    <span className="animate-pulse">●</span>
                </h2>

                <div className="mb-4">
                    <div className="text-green-700 text-xs">TOTAL HARNESSES</div>
                    <div className="text-3xl font-bold text-green-400 flex items-baseline gap-2">
                        {stats.total}
                        <span className="text-[10px] font-normal text-green-800">UNITS LOADED</span>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-green-900/10 rounded p-2">
                    <div className="flex justify-between text-green-600 border-b border-green-800 pb-1 mb-2 font-bold text-[10px]">
                        <span>TRAY ID</span>
                        <span>CONTENT REF</span>
                    </div>
                    <div className="overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {stats.trays.map(tray => (
                            <div key={tray.id} className={clsx("flex justify-between items-center py-0.5", tray.count === 0 ? "text-green-900/50" : "text-green-400")}>
                                <span className="font-mono font-bold w-8">#{tray.id.toString().padStart(2, '0')}</span>
                                <span className={clsx("text-right flex-1 truncate text-xs", tray.count === 0 && "italic")}>{tray.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-4 pt-2 border-t border-green-900 text-[10px] text-green-800 text-center flex justify-between">
                    <span>STATUS: ONLINE</span>
                    <span>PLC: CONNECTED</span>
                </div>
            </div>
        </div>
    );
};
