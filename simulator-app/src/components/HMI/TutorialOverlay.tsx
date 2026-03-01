import { useState, useEffect } from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';
import { usePlcStore } from '../../store/usePlcStore';

const STEPS = [
    {
        id: 'boot',
        title: 'Welcome to ZASCA Simulator',
        description: 'This is a digital twin of a Vertical Carousel. Let\'s get it running. First, check the System Status.',
        target: 'status-card'
    },
    {
        id: 'start',
        title: 'Start the Machine',
        description: 'Press the GREEN START button on the Control Panel to energize the motor.',
        target: 'btn-start',
        check: (state: any) => state.markers.M0_2_Running
    },
    {
        id: 'operation',
        title: 'Select Reference',
        description: 'Navigate to the OPERATION screen to select an item to retrieve.',
        target: 'nav-oper',
        check: (_: any) => false
    }
];

export const TutorialOverlay = () => {
    const [stepIndex, setStepIndex] = useState(0);
    const [visible, setVisible] = useState(true);
    const { markers } = usePlcStore();

    // Auto-advance logic
    useEffect(() => {
        if (!visible) return;
        const currentStep = STEPS[stepIndex];

        if (currentStep.check) {
            if (currentStep.check({ markers })) {
                // Wait a bit then advance
                const timer = setTimeout(() => {
                    if (stepIndex < STEPS.length - 1) setStepIndex(s => s + 1);
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [markers, stepIndex, visible]);

    if (!visible) return (
        <button onClick={() => setVisible(true)} className="absolute bottom-4 left-4 z-50 bg-white/10 p-2 rounded-full hover:bg-white/20 text-white">
            <HelpCircle />
        </button>
    );

    const step = STEPS[stepIndex];

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full animate-fade-in">
            <div className="bg-white/90 backdrop-blur border-l-4 border-siemens-accent shadow-xl p-4 rounded-r-lg">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-black flex items-center gap-2">
                        <span className="bg-siemens-accent text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                            {stepIndex + 1}
                        </span>
                        {step.title}
                    </h3>
                    <button onClick={() => setVisible(false)} className="text-gray-500 hover:text-gray-800">×</button>
                </div>
                <p className="text-gray-800 text-sm mb-4 font-medium">{step.description}</p>

                <div className="flex justify-between items-center">
                    <div className="flex gap-1">
                        {STEPS.map((_, i) => (
                            <div key={i} className={`h-1.5 w-8 rounded-full ${i === stepIndex ? 'bg-siemens-accent' : i < stepIndex ? 'bg-siemens-active' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                    <button
                        onClick={() => setStepIndex(s => Math.min(s + 1, STEPS.length - 1))}
                        className="text-xs font-bold text-siemens-accent flex items-center hover:underline"
                    >
                        SKIP <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
