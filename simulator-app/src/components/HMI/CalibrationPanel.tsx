import React from 'react';
import { usePlcStore } from '../../store/usePlcStore';
import { Settings, X } from 'lucide-react';
// import Draggable from 'react-draggable'; // Disabled due to npm issue

export const CalibrationPanel: React.FC = () => {
    const { markers, updateTags } = usePlcStore();
    const [visible, setVisible] = React.useState(true);

    if (!visible) {
        return (
            <button
                onClick={() => setVisible(true)}
                className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded shadow-lg border border-gray-600 hover:bg-gray-700 z-50"
            >
                <Settings size={24} />
            </button>
        );
    }

    return (
        // <Draggable handle=".handle"> -> REMOVED RELIANCE ON PACKAGE
        // Relocated to CENTER-LEFT to avoid Telemetry (Left) and Operation (Right)
        // Added pointer-events-auto to enable interaction
        <div className="fixed top-20 left-96 w-80 bg-gray-900 border-2 border-yellow-500 rounded-lg shadow-2xl z-50 text-gray-200 font-mono pointer-events-auto">
            {/* Header */}
            <div className="handle bg-yellow-600 px-3 py-1 flex justify-between items-center cursor-move">
                <span className="font-bold text-black flex items-center gap-2">
                    <Settings size={18} /> CALIBRATION
                </span>
                <button onClick={() => setVisible(false)} className="text-black hover:text-white">
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-6">

                {/* Offset Control */}
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-yellow-400 font-bold">OFFSET (Deg)</label>
                        <span className="bg-black px-2 text-green-400">{(markers.M60_CalibrationOffset || -7.5).toFixed(1)}°</span>
                    </div>
                    <input
                        type="range"
                        min="-20"
                        max="5"
                        step="0.5"
                        value={markers.M60_CalibrationOffset ?? -7.5}
                        onChange={(e) => updateTags({ M60_CalibrationOffset: parseFloat(e.target.value) })}
                        className="w-full accent-yellow-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-400 text-center">
                        Tune until Red Zone centers perfectly.
                    </p>
                </div>

                {/* Speed Limit Control */}
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-blue-400 font-bold">SLOW SPEED (%)</label>
                        <span className="bg-black px-2 text-cyan-400">{(markers.M62_SlowSpeedLimit || 15.0).toFixed(0)}%</span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        step="1"
                        value={markers.M62_SlowSpeedLimit ?? 15.0}
                        onChange={(e) => updateTags({ M62_SlowSpeedLimit: parseFloat(e.target.value) })}
                        className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-400 text-center">
                        Adjust "Drastic Slow Down" speed.
                    </p>
                </div>

                {/* Telemetry Display */}
                <div className="border border-gray-700 p-2 text-xs bg-black rounded">
                    <div className="flex justify-between">
                        <span>M36 Target:</span>
                        <span className="text-white">{markers.M36_TargetTheta.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                        <span>M20 Current:</span>
                        <span className="text-white">{markers.M20_Theta.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Error:</span>
                        <span className="text-red-400">{Math.abs(markers.M36_TargetTheta - markers.M20_Theta).toFixed(2)}°</span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t border-gray-700">
                        <span>VFD Out:</span>
                        <span className="text-green-400">{(usePlcStore.getState().analogOutputs.QW64_SpeedSetpoint || 0).toFixed(1)}%</span>
                    </div>
                </div>

            </div>
        </div>
    );
};
