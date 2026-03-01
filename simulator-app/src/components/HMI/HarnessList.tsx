import { TRAY_DB } from '../../store/HarnessDatabase';
import { Package, MapPin } from 'lucide-react';

interface Props {
    onSelect: (trayId: number) => void;
}

export const HarnessList = ({ onSelect }: Props) => {
    return (
        <div className="space-y-2 pr-2">
            {TRAY_DB.map((tray) => (
                <button
                    key={tray.id}
                    onClick={() => onSelect(tray.id)}
                    className="w-full bg-white border border-gray-300 rounded p-3 flex items-center justify-between hover:bg-siemens-active/10 hover:border-siemens-active transition-colors text-left group"
                >
                    <div>
                        <div className="font-bold text-industrial-800 flex items-center gap-2">
                            <Package size={16} className="text-siemens-accent" />
                            Tray #{tray.id}
                        </div>
                        <div className="text-xs text-gray-500">
                            {tray.slots.filter(s => s.count > 0).length} Harness Types
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 font-mono">LOCATION</span>
                        <div className="flex items-center gap-1 font-bold text-industrial-600 bg-gray-100 px-2 py-0.5 rounded group-hover:bg-white">
                            <MapPin size={12} />
                            Slot {tray.id}
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
};
