/**
 * ============================================================
 * PLC BRIDGE - REST API Client
 * ============================================================
 * Cliente HTTP para los endpoints REST del plc-bridge.
 * Usado para comandos puntuales y consultas de inventario.
 * ============================================================
 */

const BASE_URL = 'http://localhost:3001/api';

// Tipos de respuesta
interface ApiResponse {
    ok: boolean;
    message?: string;
    error?: string;
}

interface StatusResponse extends ApiResponse {
    mode: string;
    data: Record<string, unknown>;
}

interface InventoryItem {
    trayId: number;
    reference: string;
    quantity: number;
    weight: number;
}

interface InventoryResponse extends ApiResponse {
    inventory: InventoryItem[];
}

interface SearchResponse extends ApiResponse {
    foundTrayId: number;
}

interface InfoResponse {
    name: string;
    version: string;
    mode: string;
    plcIp: string;
    pollInterval: number;
    uptime: number;
}

// --- Funciones HTTP ---

async function apiCall<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, unknown>
): Promise<T> {
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
}

// --- API Pública ---

export const PlcBridgeAPI = {
    /** Obtener estado completo del PLC */
    getStatus: () => apiCall<StatusResponse>('GET', '/status'),

    /** Obtener inventario de 20 bandejas */
    getInventory: () => apiCall<InventoryResponse>('GET', '/inventory'),

    /** Info del servidor bridge */
    getInfo: () => apiCall<InfoResponse>('GET', '/info'),

    /** Seleccionar bandeja (0-19) */
    selectTray: (trayId: number) =>
        apiCall<ApiResponse>('POST', '/select-tray', { trayId }),

    /** Iniciar modo automático */
    start: () => apiCall<ApiResponse>('POST', '/start'),

    /** Parada normal */
    stop: () => apiCall<ApiResponse>('POST', '/stop'),

    /** Parada de emergencia */
    estop: () => apiCall<ApiResponse>('POST', '/estop'),

    /** Resetear parada de emergencia */
    resetEstop: () => apiCall<ApiResponse>('POST', '/estop/reset'),

    /** Buscar referencia en inventario */
    search: (reference: string) =>
        apiCall<SearchResponse>('POST', '/search', { reference }),

    /** Actualizar inventario de una bandeja */
    updateInventory: (
        trayId: number,
        data: { reference?: string; quantity?: number; weight?: number }
    ) => apiCall<ApiResponse>('POST', '/inventory/update', { trayId, ...data }),
};

export type { InventoryItem, InfoResponse };
