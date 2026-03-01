
import { useState } from 'react';
import { X } from 'lucide-react';

interface OperatorGuideProps {
    page: 'OVERVIEW' | 'OPERATION' | 'ALARMS' | 'MAINTENANCE' | 'BRIDGE' | 'ANIM';
    step?: string; // Optional: specific step in operation
}

export const OperatorGuide = ({ page }: OperatorGuideProps) => {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    return (
        <div className="absolute top-4 left-8 z-40 pointer-events-none text-left">
            <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-xl p-6 shadow-[0_0_30px_rgba(0,255,255,0.1)] max-w-xl transition-all duration-500 pointer-events-auto relative">

                <button
                    onClick={() => setVisible(false)}
                    className="absolute top-2 right-2 text-cyan-500/50 hover:text-cyan-200 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* HEADLINE */}
                <h3 className="text-cyan-400 font-bold text-lg tracking-widest mb-4 uppercase drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
                    {page === 'OVERVIEW' ? '1. INICIO Y VERIFICACIÓN' :
                        page === 'OPERATION' ? '2. PROCESO DE PICKING' : 'MODO MANTENIMIENTO'}
                </h3>

                {/* STEPS CONTENT */}
                <div className="text-cyan-200 text-sm space-y-2 font-mono leading-relaxed">

                    {page === 'OVERVIEW' && (
                        <>
                            <p>1. Verifique que el indicador de seguridad (Encabezado) esté en <span className="text-green-400 font-bold">VERDE</span>.</p>
                            <p>2. Presione <span className="text-yellow-400 font-bold">INICIAR CICLO</span> para validar el giro de bandejas.</p>
                            <p>3. Confirme visualmente que el carrusel se mueve correctamente.</p>
                            <div className="mt-2 text-xs text-cyan-500/80 italic">
                                * En caso de emergencia, use el botón rojo inferior.
                            </div>
                        </>
                    )}

                    {page === 'OPERATION' && (
                        <>
                            <div className="grid grid-cols-3 gap-4 text-left">
                                <div>
                                    <span className="text-cyan-400 font-bold block mb-1">PASO 1: MOVER</span>
                                    Seleccione la bandeja deseada y presione <span className="text-green-400">MOVER</span>. Espere a "POSICIÓN OK".
                                </div>
                                <div>
                                    <span className="text-cyan-400 font-bold block mb-1">PASO 2: SACAR</span>
                                    Elija Referencia y presione <span className="text-yellow-400">SACAR</span>. El sensor bloqueará el motor.
                                </div>
                                <div>
                                    <span className="text-cyan-400 font-bold block mb-1">PASO 3: RETIRAR</span>
                                    Presione <span className="text-green-400">RETIRAR</span> para liberar el sensor y descontar inventario.
                                </div>
                            </div>
                        </>
                    )}

                    {page === 'MAINTENANCE' && (
                        <p>Panel de diagnóstico de señales y lógica de escalera.</p>
                    )}

                    {page === 'ALARMS' && (
                        <p>Monitor de alarmas activas e historial de fallos.</p>
                    )}

                </div>
            </div>
        </div>
    );
};
