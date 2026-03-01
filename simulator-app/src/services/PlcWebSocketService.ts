/**
 * ============================================================
 * PLC BRIDGE - WebSocket Service
 * ============================================================
 * Servicio que conecta la UI React con el servidor plc-bridge
 * usando Socket.io para streaming de datos en tiempo real.
 * 
 * Este servicio mapea los tags del PLC bridge (ST_*, TEL_*)
 * a los tags internos del store de React (M*, I*, Q*).
 * ============================================================
 */

import { io, Socket } from 'socket.io-client';
import { usePlcStore } from '../store/usePlcStore';

// Tipos para los datos recibidos del PLC bridge
interface PlcStatePacket {
    timestamp: number;
    // Estado
    ST_EncoderPos: number;
    ST_VFD_Speed: number;
    ST_MotorRunning: boolean;
    ST_SystemReady: boolean;
    ST_SystemFault: boolean;
    ST_BrakeReleased: boolean;
    ST_AutoMode: boolean;
    ST_FaultCode: number;
    ST_TargetPos: number;
    ST_ErrorPos: number;
    // Telemetría
    TEL_Torque: number;
    TEL_Current: number;
    TEL_Temperature: number;
}

interface BridgeInfo {
    mode: 'mock' | 'live';
    pollMs: number;
}

interface CommandAck {
    command: string;
    ok: boolean;
    error?: string;
    trayId?: number;
}

// Callbacks para eventos
type StateCallback = (state: PlcStatePacket) => void;
type ConnectionCallback = (connected: boolean) => void;

class PlcWebSocketService {
    private socket: Socket | null = null;
    private url: string;
    private _connected = false;
    private _bridgeInfo: BridgeInfo | null = null;
    private _stateListeners: StateCallback[] = [];
    private _connectionListeners: ConnectionCallback[] = [];
    private _autoUpdateStore = true;

    constructor(url = 'http://localhost:3001') {
        this.url = url;
    }

    /**
     * Conectar al servidor PLC Bridge
     */
    connect(): void {
        if (this.socket) {
            console.warn('[PlcWS] Ya conectado');
            return;
        }

        console.log(`[PlcWS] Conectando a ${this.url}...`);

        this.socket = io(this.url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity,
        });

        // --- Eventos de conexión ---
        this.socket.on('connect', () => {
            console.log('[PlcWS] ✅ Conectado al PLC Bridge');
            this._connected = true;
            this._notifyConnectionListeners(true);
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`[PlcWS] ❌ Desconectado: ${reason}`);
            this._connected = false;
            this._notifyConnectionListeners(false);
        });

        this.socket.on('connect_error', (err) => {
            console.error(`[PlcWS] Error de conexión: ${err.message}`);
        });

        // --- Datos del bridge ---
        this.socket.on('bridge-info', (info: BridgeInfo) => {
            this._bridgeInfo = info;
            console.log(`[PlcWS] Bridge Mode: ${info.mode}, Poll: ${info.pollMs}ms`);
        });

        // --- Streaming de estado del PLC (cada ~100ms) ---
        this.socket.on('plc-state', (data: PlcStatePacket) => {
            // Notificar listeners personalizados
            for (const cb of this._stateListeners) {
                cb(data);
            }

            // Auto-actualizar el store de React
            if (this._autoUpdateStore) {
                this._mapToStore(data);
            }
        });

        // --- Confirmación de comandos ---
        this.socket.on('command-ack', (ack: CommandAck) => {
            if (ack.ok) {
                console.log(`[PlcWS] ✅ Comando '${ack.command}' ejecutado`);
            } else {
                console.error(`[PlcWS] ❌ Comando '${ack.command}' falló: ${ack.error}`);
            }
        });
    }

    /**
     * Mapear datos del PLC Bridge al store Zustand de React
     * Bridge Tags → React Store Tags
     */
    private _mapToStore(data: PlcStatePacket): void {
        const store = usePlcStore.getState();

        // Mapear posición del encoder a pulsos (como en SimulationLoop.tsx)
        const encoderPulses = Math.floor(data.ST_EncoderPos * 10);

        // Actualizar inputs analógicos y markers
        store.updateFromPhys(
            {}, // Digital inputs no cambian desde el PLC bridge
            {
                IW66_EncoderPulses: encoderPulses,
                IW68_MotorCurrent: data.TEL_Current,
            },
            {
                M20_Theta: data.ST_EncoderPos,
                M24_Omega: data.ST_VFD_Speed,
                M32_Torque: data.TEL_Torque,
                M36_TargetTheta: data.ST_TargetPos,
                M0_0_AutoMode: data.ST_AutoMode,
                M0_1_Moving: data.ST_MotorRunning,
                M0_3_Fault: data.ST_SystemFault,
                M0_5_ReadyToPick: data.ST_SystemReady,
            }
        );

        // Actualizar outputs
        store.updateTags({
            Q0_0_MotorOn: data.ST_MotorRunning,
            Q0_1_BrakeRelease: data.ST_BrakeReleased,
            Q0_2_Ind_Run: data.ST_MotorRunning,
            Q0_3_Ind_Ready: data.ST_SystemReady,
            Q0_4_Ind_Fault: data.ST_SystemFault,
            QW64_SpeedSetpoint: data.ST_VFD_Speed,
        });
    }

    // --- Comandos al PLC ---

    /**
     * Seleccionar una bandeja
     */
    selectTray(trayId: number): void {
        this.socket?.emit('select-tray', { trayId });
    }

    /**
     * Iniciar modo automático
     */
    start(): void {
        this.socket?.emit('start');
    }

    /**
     * Parada normal
     */
    stop(): void {
        this.socket?.emit('stop');
    }

    /**
     * Parada de emergencia
     */
    estop(): void {
        this.socket?.emit('estop');
    }

    // --- Suscripción a eventos ---

    /**
     * Registrar callback para cada actualización de estado
     */
    onState(callback: StateCallback): () => void {
        this._stateListeners.push(callback);
        return () => {
            this._stateListeners = this._stateListeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Registrar callback para cambios de conexión
     */
    onConnection(callback: ConnectionCallback): () => void {
        this._connectionListeners.push(callback);
        return () => {
            this._connectionListeners = this._connectionListeners.filter(cb => cb !== callback);
        };
    }

    private _notifyConnectionListeners(connected: boolean): void {
        for (const cb of this._connectionListeners) {
            cb(connected);
        }
    }

    // --- Getters ---

    get connected(): boolean {
        return this._connected;
    }

    get bridgeInfo(): BridgeInfo | null {
        return this._bridgeInfo;
    }

    /**
     * Activar/desactivar la escritura automática al store de React
     */
    set autoUpdateStore(enabled: boolean) {
        this._autoUpdateStore = enabled;
    }

    /**
     * Desconectar
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this._connected = false;
            console.log('[PlcWS] 🔌 Desconectado');
        }
    }
}

// Singleton global
export const plcBridge = new PlcWebSocketService();
export default PlcWebSocketService;
