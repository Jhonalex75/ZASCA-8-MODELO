import { usePlcStore } from '../../store/usePlcStore';

export const IOMap = () => {
    const { inputs, outputs } = usePlcStore();

    const Row = ({ addr, tag, value, type }: any) => (
        <tr className="border-b border-neutral-700 hover:bg-neutral-800 transition-colors">
            <td className="p-2 font-mono text-cyan-500">{addr}</td>
            <td className="p-2 text-neutral-300 font-mono text-xs">{tag}</td>
            <td className="p-2 font-mono text-xs text-neutral-500">{type}</td>
            <td className="p-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${value ? 'bg-green-600 text-black shadow-[0_0_10px_#22c55e]' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'}`}>
                    {value ? 'TRUE' : 'FALSE'}
                </span>
            </td>
        </tr>
    );

    return (
        <div className="bg-[#1e1e1e] p-4 h-full overflow-y-auto custom-scrollbar select-none">
            <div className="flex justify-between items-center border-b border-neutral-700 pb-2 mb-4">
                <div className="text-siemens-accent font-bold text-lg">I/O MAPPING</div>
                <div className="text-[10px] font-mono text-neutral-500">DIGITAL INTERFACE</div>
            </div>

            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="text-neutral-500 font-mono text-[10px] uppercase tracking-wider border-b border-neutral-800">
                        <th className="p-2">Address</th>
                        <th className="p-2">Tag Name</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                    {/* INPUTS */}
                    <Row addr="%I0.0" tag="E_Stop_Mush" type="BOOL" value={inputs.I0_0_EStop} />
                    <Row addr="%I0.1" tag="Btn_Start" type="BOOL" value={inputs.I0_1_Start} />
                    <Row addr="%I0.2" tag="Btn_Stop" type="BOOL" value={inputs.I0_2_Stop} />
                    <Row addr="%I0.3" tag="Res_Spare" type="BOOL" value={false} />
                    <Row addr="%I0.4" tag="Sens_Door" type="BOOL" value={inputs.I0_4_DoorClosed} />
                    <Row addr="%I0.5" tag="Sens_Curtain" type="BOOL" value={inputs.I0_5_SafetyCurtain} />
                    <Row addr="%I0.6" tag="Sens_Reflex" type="BOOL" value={inputs.I0_6_ReflexSensor} />

                    {/* OUTPUTS */}
                    <Row addr="%Q0.0" tag="Mtr_Main_On" type="BOOL" value={outputs.Q0_0_MotorOn} />
                    <Row addr="%Q0.1" tag="Mtr_Brake_Rel" type="BOOL" value={outputs.Q0_1_BrakeRelease} />
                    <Row addr="%Q0.2" tag="Ind_Run" type="BOOL" value={outputs.Q0_2_Ind_Run} />
                    <Row addr="%Q0.3" tag="Ind_Ready" type="BOOL" value={outputs.Q0_3_Ind_Ready} />
                    <Row addr="%Q0.6" tag="Tower_Green" type="BOOL" value={outputs.Q0_6_Tower_Green} />
                    <Row addr="%Q0.7" tag="Tower_Yellow" type="BOOL" value={outputs.Q0_7_Tower_Yellow} />
                    <Row addr="%Q1.0" tag="Tower_Red" type="BOOL" value={outputs.Q1_0_Tower_Red} />
                </tbody>
            </table>
        </div>
    );
};
