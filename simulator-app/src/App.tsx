import { Scene } from './components/3D/Scene';
import { HmiLayout } from './components/HMI/HmiLayout';


import { FaultSimulator } from './components/HMI/FaultSimulator';
import { StatusReport } from './components/HMI/StatusReport';


function App() {
  return (
    <div className="w-screen h-screen bg-industrial-900 overflow-hidden relative flex">
      <FaultSimulator />
      {/* Left/Main: 3D Scene */}
      <div className="flex-1 relative">
        <Scene />
        {/* Overlay Title */}
        <div className="absolute top-4 left-4 pointer-events-none">
          <h1 className="text-2xl font-bold text-white tracking-widest opacity-50">ZASCA SIMULATOR</h1>
          <p className="text-xs text-siemens-accent font-mono">VERTICAL CAROUSEL PATERNOSTER</p>
        </div>
        <StatusReport />
      </div>

      {/* Right: HMI Panel */}
      <HmiLayout />
    </div>
  )
}

export default App
