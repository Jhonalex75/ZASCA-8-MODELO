import { Wrench, ShieldAlert, XCircle } from 'lucide-react';
import { usePlcStore } from '../../store/usePlcStore';

export const FaultSimulator = () => {
    const { inputs } = usePlcStore();

    const toggleFault = (key: keyof typeof inputs, current: boolean) => {
        // Toggle: if True (Healthy/NC), setting False breaks it. 
        // Logic: NC contacts (EStop, Door) are True when Healthy.
        const newValue = !current;
        usePlcStore.getState().updateTags({ [key]: newValue });
    };

    return (
        <div className="absolute bottom-4 right-[420px] w-60 bg-red-900/90 text-white rounded shadow-xl border border-red-700 p-2 font-sans text-xs z-30">
            <h4 className="flex items-center gap-2 font-bold border-b border-red-700 pb-1 mb-2">
                <Wrench size={14} /> FAULT INJECTION
            </h4>

            <div className="flex flex-col gap-2">
                <button
                    onClick={() => toggleFault('I0_0_EStop', inputs.I0_0_EStop)}
                    className={`flex items-center gap-2 px-2 py-1 rounded border ${!inputs.I0_0_EStop ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-red-950 border-red-800 opacity-50'}`}
                >
                    <ShieldAlert size={14} />
                    {inputs.I0_0_EStop ? 'TRIP E-STOP' : 'RESET E-STOP'}
                </button>

                <button
                    onClick={() => {
                        // Toggle Reflex Sensor (I0_6). True = Obstructed/Alarm. False = Clear.
                        // We use the store's updateTags method if available or setInput
                        usePlcStore.getState().updateTags({ I0_6_ReflexSensor: !inputs.I0_6_ReflexSensor });
                    }}
                    className={`flex items-center gap-2 px-2 py-1 rounded border ${inputs.I0_6_ReflexSensor ? 'bg-orange-600 border-orange-400 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                >
                    <XCircle size={14} />
                    {inputs.I0_6_ReflexSensor ? 'CLEAR REFLEX SENSOR' : 'SENSOR CLEAR'}
                </button>
            </div>

            <div className="mt-2 text-[10px] text-red-200 italic">
                * Simulates physical breakdowns
            </div>
        </div>
    );
};
