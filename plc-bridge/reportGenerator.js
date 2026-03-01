/**
 * reportGenerator.js
 * 
 * Genera informes Excel (.xlsx) por turno de 8 horas.
 * Usa la librería SheetJS (xlsx) para crear archivos Excel
 * con formato profesional sin dependencias nativas.
 * 
 * Hojas del reporte:
 *   1. Resumen del Turno — Fecha, turno, supervisor, totales
 *   2. Detalle de Movimientos — Cada ingreso/salida con operador
 *   3. Inventario al Cierre — Estado de las 20 bandejas
 */

const XLSX = require('xlsx');
const { getShiftSummary } = require('./inventoryLogger');

/**
 * Genera un archivo Excel con el reporte del turno
 * @param {Object} params
 * @param {string} params.date - Fecha en formato YYYY-MM-DD
 * @param {string} params.shift - Turno: morning/afternoon/night
 * @param {string} [params.supervisor] - Supervisor a cargo
 * @param {string} [params.location] - Lugar/planta
 * @param {Object} [params.currentInventory] - Inventario actual de las 20 bandejas
 * @returns {Buffer} Archivo Excel como buffer
 */
function generateShiftReport(params) {
    const { date, shift, supervisor, location, currentInventory } = params;

    const summary = getShiftSummary(date, shift);
    const wb = XLSX.utils.book_new();

    // ========================================
    // HOJA 1: RESUMEN DEL TURNO
    // ========================================
    const resumenData = [
        ['INFORME DE TURNO — ZASCA PATERNOSTER'],
        [''],
        ['DATOS DEL TURNO'],
        ['Fecha:', date],
        ['Turno:', summary.shiftLabel],
        ['Supervisor:', supervisor || summary.supervisors.join(', ') || '—'],
        ['Lugar / Planta:', location || '—'],
        [''],
        ['RESUMEN DE OPERACIONES'],
        ['Total de movimientos:', summary.totalMovements],
        ['Ingresos (cargas):', summary.totalLoads],
        ['Salidas (descargas):', summary.totalUnloads],
        [''],
        ['CANTIDADES'],
        ['Total unidades cargadas:', summary.totalQtyLoaded],
        ['Total unidades descargadas:', summary.totalQtyUnloaded],
        ['Balance neto:', summary.totalQtyLoaded - summary.totalQtyUnloaded],
        [''],
        ['PESOS'],
        ['Peso total cargado (kg):', Number(summary.totalWeightLoaded.toFixed(2))],
        ['Peso total descargado (kg):', Number(summary.totalWeightUnloaded.toFixed(2))],
        [''],
        ['PERSONAL'],
        ['Operadores activos:', summary.operators.join(', ') || '—'],
        [''],
        ['Generado automáticamente por ZASCA PLC Bridge'],
        [`Fecha de generación: ${new Date().toLocaleString('es-CO')}`],
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

    // Ajustar ancho de columnas
    wsResumen['!cols'] = [
        { wch: 32 },  // Columna A
        { wch: 40 },  // Columna B
    ];

    // Merge para título
    wsResumen['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    ];

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Turno');

    // ========================================
    // HOJA 2: DETALLE DE MOVIMIENTOS
    // ========================================
    const movHeaders = [
        'Hora',
        'Operador',
        'Tipo',
        'Bandeja',
        'Referencia',
        'Cantidad',
        'Peso (kg)',
        'Supervisor',
    ];

    const movRows = summary.movements.map(m => [
        m.time,
        m.operator,
        m.type === 'load' ? 'INGRESO' : 'SALIDA',
        `BDJ ${String(m.trayId).padStart(2, '0')}`,
        m.reference,
        m.quantity,
        m.weight || 0,
        m.supervisor || '—',
    ]);

    const movData = [movHeaders, ...movRows];
    const wsMovimientos = XLSX.utils.aoa_to_sheet(movData);

    // Ajustar columnas
    wsMovimientos['!cols'] = [
        { wch: 10 },  // Hora
        { wch: 20 },  // Operador
        { wch: 10 },  // Tipo
        { wch: 10 },  // Bandeja
        { wch: 20 },  // Referencia
        { wch: 10 },  // Cantidad
        { wch: 12 },  // Peso
        { wch: 20 },  // Supervisor
    ];

    // Formato de filtros automáticos
    wsMovimientos['!autofilter'] = {
        ref: `A1:H${movRows.length + 1}`,
    };

    XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');

    // ========================================
    // HOJA 3: INVENTARIO AL CIERRE
    // ========================================
    const invHeaders = [
        'Bandeja',
        'Referencia',
        'Cantidad',
        'Peso (kg)',
        'Estado',
    ];

    let invRows = [];
    if (currentInventory && Array.isArray(currentInventory)) {
        invRows = currentInventory.map((inv, idx) => [
            `BDJ ${String(idx).padStart(2, '0')}`,
            inv.reference || inv.ref || '—',
            inv.quantity || inv.qty || 0,
            inv.weight || 0,
            (inv.quantity || inv.qty || 0) > 0 ? 'OCUPADA' : 'VACÍA',
        ]);
    } else {
        // Si no hay inventario actual, generar 20 filas vacías
        for (let i = 0; i < 20; i++) {
            invRows.push([
                `BDJ ${String(i).padStart(2, '0')}`,
                '—',
                0,
                0,
                'SIN DATOS',
            ]);
        }
    }

    const invData = [invHeaders, ...invRows];

    // Agregar fila de totalización
    const totalQty = invRows.reduce((s, r) => s + (Number(r[2]) || 0), 0);
    const totalWeight = invRows.reduce((s, r) => s + (Number(r[3]) || 0), 0);
    const occupiedCount = invRows.filter(r => r[4] === 'OCUPADA').length;
    invData.push([]);
    invData.push(['TOTAL', '', totalQty, totalWeight, `${occupiedCount}/20 ocupadas`]);

    const wsInventario = XLSX.utils.aoa_to_sheet(invData);

    wsInventario['!cols'] = [
        { wch: 10 },  // Bandeja
        { wch: 25 },  // Referencia
        { wch: 10 },  // Cantidad
        { wch: 12 },  // Peso
        { wch: 12 },  // Estado
    ];

    XLSX.utils.book_append_sheet(wb, wsInventario, 'Inventario Cierre');

    // ========================================
    // GENERAR BUFFER
    // ========================================
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return buf;
}

/**
 * Genera el nombre del archivo con formato estándar
 * @param {string} date - YYYY-MM-DD
 * @param {string} shift - morning/afternoon/night
 * @returns {string} Nombre del archivo
 */
function getReportFilename(date, shift) {
    const shiftNames = { morning: 'manana', afternoon: 'tarde', night: 'noche' };
    return `ZASCA_Turno_${date}_${shiftNames[shift] || shift}.xlsx`;
}

module.exports = {
    generateShiftReport,
    getReportFilename,
};
