/**
 * inventoryLogger.js
 * 
 * Registra todos los movimientos de inventario (cargas y descargas)
 * en un archivo JSON para consultas históricas y generación de reportes.
 * 
 * Datos registrados por movimiento:
 *   - timestamp, tipo (load/unload), trayId, reference, quantity, weight
 *   - operator (nombre del operador), shift (turno calculado)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const LOG_FILE = path.join(DATA_DIR, 'inventory_log.json');

// Asegurar que existe el directorio data/
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Cargar log existente o inicializar vacío
let logEntries = [];
if (fs.existsSync(LOG_FILE)) {
    try {
        const raw = fs.readFileSync(LOG_FILE, 'utf-8');
        logEntries = JSON.parse(raw);
    } catch (e) {
        console.warn('[InventoryLogger] ⚠️ Log corrupto, reiniciando:', e.message);
        logEntries = [];
    }
}

/**
 * Determina el turno basado en la hora
 * morning: 06:00-13:59 | afternoon: 14:00-21:59 | night: 22:00-05:59
 */
function getShift(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
}

/**
 * Registra un movimiento de inventario
 * @param {Object} entry
 * @param {'load'|'unload'} entry.type - Tipo de operación
 * @param {number} entry.trayId - ID de bandeja (0-19)
 * @param {string} entry.reference - Referencia del material
 * @param {number} entry.quantity - Cantidad
 * @param {number} [entry.weight] - Peso en kg
 * @param {string} entry.operator - Nombre del operador
 * @param {string} [entry.supervisor] - Supervisor a cargo
 * @param {string} [entry.location] - Lugar/planta
 */
function logMovement(entry) {
    const now = new Date();
    const record = {
        id: logEntries.length + 1,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        shift: getShift(now),
        type: entry.type,
        trayId: entry.trayId,
        reference: entry.reference || '',
        quantity: entry.quantity || 0,
        weight: entry.weight || 0,
        operator: entry.operator || 'Sistema',
        supervisor: entry.supervisor || '',
        location: entry.location || '',
    };

    logEntries.push(record);
    _persist();

    console.log(`[InventoryLogger] ${record.type.toUpperCase()} | Tray ${record.trayId} | ${record.reference} x${record.quantity} | Op: ${record.operator}`);
    return record;
}

/**
 * Consultar historial de movimientos filtrado
 * @param {Object} [filters]
 * @param {string} [filters.from] - Fecha inicio (YYYY-MM-DD)
 * @param {string} [filters.to] - Fecha fin (YYYY-MM-DD)
 * @param {string} [filters.operator] - Filtrar por operador
 * @param {string} [filters.shift] - Filtrar por turno (morning/afternoon/night)
 * @param {string} [filters.type] - Filtrar por tipo (load/unload)
 * @param {number} [filters.trayId] - Filtrar por bandeja
 * @returns {Object[]} Registros filtrados
 */
function getHistory(filters = {}) {
    let results = [...logEntries];

    if (filters.from) {
        results = results.filter(r => r.date >= filters.from);
    }
    if (filters.to) {
        results = results.filter(r => r.date <= filters.to);
    }
    if (filters.operator) {
        const op = filters.operator.toLowerCase();
        results = results.filter(r => r.operator.toLowerCase().includes(op));
    }
    if (filters.shift) {
        results = results.filter(r => r.shift === filters.shift);
    }
    if (filters.type) {
        results = results.filter(r => r.type === filters.type);
    }
    if (filters.trayId !== undefined) {
        results = results.filter(r => r.trayId === Number(filters.trayId));
    }

    return results;
}

/**
 * Obtener resumen de un turno
 * @param {string} date - YYYY-MM-DD
 * @param {string} shift - morning/afternoon/night
 * @returns {Object} Resumen del turno
 */
function getShiftSummary(date, shift) {
    const movements = logEntries.filter(r => r.date === date && r.shift === shift);

    const loads = movements.filter(r => r.type === 'load');
    const unloads = movements.filter(r => r.type === 'unload');

    const operators = [...new Set(movements.map(r => r.operator))];
    const supervisors = [...new Set(movements.filter(r => r.supervisor).map(r => r.supervisor))];

    return {
        date,
        shift,
        shiftLabel: shift === 'morning' ? 'Mañana (06:00-14:00)'
            : shift === 'afternoon' ? 'Tarde (14:00-22:00)'
                : 'Noche (22:00-06:00)',
        totalMovements: movements.length,
        totalLoads: loads.length,
        totalUnloads: unloads.length,
        totalQtyLoaded: loads.reduce((s, r) => s + r.quantity, 0),
        totalQtyUnloaded: unloads.reduce((s, r) => s + r.quantity, 0),
        totalWeightLoaded: loads.reduce((s, r) => s + r.weight, 0),
        totalWeightUnloaded: unloads.reduce((s, r) => s + r.weight, 0),
        operators,
        supervisors,
        movements,
    };
}

/**
 * Persistir log a disco
 */
function _persist() {
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(logEntries, null, 2), 'utf-8');
    } catch (e) {
        console.error('[InventoryLogger] ❌ Error guardando log:', e.message);
    }
}

module.exports = {
    logMovement,
    getHistory,
    getShiftSummary,
    getShift,
};
