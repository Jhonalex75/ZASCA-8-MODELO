/**
 * ============================================================
 * ZASCA PLC BRIDGE - Servidor Principal
 * ============================================================
 * 
 * Middleware que conecta la interfaz React con el PLC Siemens S7.
 * 
 * Capas:
 *   1. REST API    → Comandos puntuales (seleccionar bandeja, start/stop)
 *   2. WebSocket   → Streaming de estado en tiempo real (cada 100ms)
 *   3. nodes7/Mock → Comunicación con PLC real o simulado
 * 
 * Uso:
 *   MODE=mock npm start   → Sin PLC real (desarrollo)
 *   MODE=live npm start   → Conectado al PLC real
 * 
 * ============================================================
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server: SocketServer } = require('socket.io');

// --- Selección de Driver PLC ---
const PlcConnection = require('./plcConnection');
const MockPlc = require('./mockPlc');
const inventoryLogger = require('./inventoryLogger');
const { generateShiftReport, getReportFilename } = require('./reportGenerator');

const MODE = (process.env.MODE || 'mock').toLowerCase();
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001');
const POLL_MS = parseInt(process.env.WS_POLL_INTERVAL_MS || '100');

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketServer(server, {
    cors: {
        origin: '*',          // En producción, restringir al origen de React
        methods: ['GET', 'POST'],
    },
});

// Crear instancia del driver PLC
let plc;
if (MODE === 'live') {
    plc = new PlcConnection({
        ip: process.env.PLC_IP || '192.168.0.1',
        port: parseInt(process.env.PLC_PORT || '102'),
        rack: parseInt(process.env.PLC_RACK || '0'),
        slot: parseInt(process.env.PLC_SLOT || '1'),
    });
} else {
    plc = new MockPlc();
}

// ==========================================
// 2. REST API - Comandos
// ==========================================

/**
 * GET /api/status
 * Retorna el estado completo del PLC (snapshot)
 */
app.get('/api/status', async (req, res) => {
    try {
        const data = await plc.readAll();
        res.json({ ok: true, mode: MODE, data });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /api/inventory
 * Retorna solo el inventario (20 bandejas)
 */
app.get('/api/inventory', async (req, res) => {
    try {
        const data = await plc.readAll();
        const inventory = [];
        for (let i = 0; i < 20; i++) {
            inventory.push({
                trayId: i,
                reference: data[`INV_Ref_${i}`] || '',
                quantity: data[`INV_Qty_${i}`] || 0,
                weight: data[`INV_Weight_${i}`] || 0,
            });
        }
        res.json({ ok: true, inventory });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/select-tray
 * Envía comando para traer una bandeja específica
 * Body: { trayId: number (0-19) }
 */
app.post('/api/select-tray', async (req, res) => {
    try {
        const { trayId } = req.body;

        if (trayId === undefined || trayId < 0 || trayId > 19) {
            return res.status(400).json({
                ok: false,
                error: 'trayId debe ser un número entre 0 y 19',
            });
        }

        console.log(`[API] 📦 Seleccionar Bandeja #${trayId}`);

        await plc.writeMultiple({
            CMD_TargetTray: parseInt(trayId),
            CMD_Start: true,
            CMD_Stop: false,
        });

        res.json({ ok: true, message: `Bandeja #${trayId} solicitada` });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/start
 * Inicia el modo automático
 */
app.post('/api/start', async (req, res) => {
    try {
        await plc.writeTag('CMD_Start', true);
        await plc.writeTag('CMD_Stop', false);
        res.json({ ok: true, message: 'Modo AUTO activado' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/stop
 * Detiene el movimiento (parada normal)
 */
app.post('/api/stop', async (req, res) => {
    try {
        await plc.writeTag('CMD_Stop', true);
        await plc.writeTag('CMD_Start', false);
        res.json({ ok: true, message: 'Parada normal ejecutada' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/estop
 * Parada de emergencia (software)
 */
app.post('/api/estop', async (req, res) => {
    try {
        await plc.writeMultiple({
            CMD_EStop: true,
            CMD_Start: false,
            CMD_Stop: true,
        });
        console.log('[API] 🔴 ¡¡PARADA DE EMERGENCIA!!');
        res.json({ ok: true, message: 'E-STOP activado' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/estop/reset
 * Resetear parada de emergencia
 */
app.post('/api/estop/reset', async (req, res) => {
    try {
        await plc.writeTag('CMD_EStop', false);
        console.log('[API] 🟢 E-STOP reseteado');
        res.json({ ok: true, message: 'E-STOP reseteado' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/search
 * Buscar una referencia en el inventario
 * Body: { reference: string }
 */
app.post('/api/search', async (req, res) => {
    try {
        const { reference } = req.body;
        if (!reference) {
            return res.status(400).json({ ok: false, error: 'reference requerida' });
        }

        await plc.writeMultiple({
            CMD_SearchRef: reference,
            CMD_DoSearch: true,
        });

        // Esperar un poco para que el PLC procese
        await new Promise((r) => setTimeout(r, 200));

        const data = await plc.readAll();
        res.json({
            ok: true,
            foundTrayId: data._searchResult ?? -1,
            message: data._searchResult >= 0
                ? `Encontrado en Bandeja #${data._searchResult}`
                : 'Referencia no encontrada',
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/inventory/update
 * Actualizar datos de inventario de una bandeja
 * Body: { trayId: number, reference?: string, quantity?: number, weight?: number }
 */
app.post('/api/inventory/update', async (req, res) => {
    try {
        const { trayId, reference, quantity, weight } = req.body;

        if (trayId === undefined || trayId < 0 || trayId > 19) {
            return res.status(400).json({ ok: false, error: 'trayId inválido' });
        }

        const writes = {};
        if (reference !== undefined) writes[`INV_Ref_${trayId}`] = reference;
        if (quantity !== undefined) writes[`INV_Qty_${trayId}`] = parseInt(quantity);
        if (weight !== undefined) writes[`INV_Weight_${trayId}`] = parseFloat(weight);

        if (Object.keys(writes).length === 0) {
            return res.status(400).json({ ok: false, error: 'Nada que actualizar' });
        }

        await plc.writeMultiple(writes);
        res.json({ ok: true, message: `Bandeja #${trayId} actualizada` });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ==========================================
// 2.5 API INVENTARIO AVANZADA (FASECOL)
// ==========================================

/**
 * GET /api/inventory/history
 * Historial de movimientos filtrable
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&operator=nombre&shift=morning&type=load&trayId=5
 * NOTA: Debe estar ANTES de /api/inventory/:trayId para evitar que Express capture 'history' como trayId
 */
app.get('/api/inventory/history', (req, res) => {
    try {
        const history = inventoryLogger.getHistory(req.query);
        res.json({
            ok: true,
            count: history.length,
            history,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /api/inventory/:trayId
 * Detalle de inventario de una bandeja específica
 */
app.get('/api/inventory/:trayId', async (req, res) => {
    try {
        const trayId = parseInt(req.params.trayId);
        if (isNaN(trayId) || trayId < 0 || trayId > 19) {
            return res.status(400).json({ ok: false, error: 'trayId inválido (0-19)' });
        }

        const data = await plc.readAll();
        const inv = {
            trayId,
            reference: data[`INV_Ref_${trayId}`] || '',
            quantity: data[`INV_Qty_${trayId}`] || 0,
            weight: data[`INV_Weight_${trayId}`] || 0,
        };

        res.json({ ok: true, inventory: inv });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/inventory/load
 * Cargar material en una bandeja
 * Body: { trayId, reference, quantity, weight?, operator, supervisor?, location? }
 */
app.post('/api/inventory/load', async (req, res) => {
    try {
        const { trayId, reference, quantity, weight, operator, supervisor, location } = req.body;

        if (trayId === undefined || trayId < 0 || trayId > 19) {
            return res.status(400).json({ ok: false, error: 'trayId inválido (0-19)' });
        }
        if (!reference) {
            return res.status(400).json({ ok: false, error: 'reference es requerido' });
        }
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ ok: false, error: 'quantity debe ser > 0' });
        }
        if (!operator) {
            return res.status(400).json({ ok: false, error: 'operator es requerido' });
        }

        // Leer inventario actual
        const data = await plc.readAll();
        const currentQty = data[`INV_Qty_${trayId}`] || 0;
        const currentWeight = data[`INV_Weight_${trayId}`] || 0;

        // Escribir al PLC
        const writes = {
            [`INV_Ref_${trayId}`]: reference,
            [`INV_Qty_${trayId}`]: currentQty + parseInt(quantity),
        };
        if (weight !== undefined) {
            writes[`INV_Weight_${trayId}`] = currentWeight + parseFloat(weight);
        }

        await plc.writeMultiple(writes);

        // Registrar movimiento
        const record = inventoryLogger.logMovement({
            type: 'load',
            trayId,
            reference,
            quantity: parseInt(quantity),
            weight: weight ? parseFloat(weight) : 0,
            operator,
            supervisor: supervisor || '',
            location: location || '',
        });

        res.json({
            ok: true,
            message: `Bandeja #${trayId}: +${quantity} unidades de ${reference}`,
            record,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/inventory/unload
 * Descargar material de una bandeja
 * Body: { trayId, reference, quantity, operator, supervisor?, location? }
 */
app.post('/api/inventory/unload', async (req, res) => {
    try {
        const { trayId, reference, quantity, operator, supervisor, location } = req.body;

        if (trayId === undefined || trayId < 0 || trayId > 19) {
            return res.status(400).json({ ok: false, error: 'trayId inválido (0-19)' });
        }
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ ok: false, error: 'quantity debe ser > 0' });
        }
        if (!operator) {
            return res.status(400).json({ ok: false, error: 'operator es requerido' });
        }

        // Leer inventario actual
        const data = await plc.readAll();
        const currentQty = data[`INV_Qty_${trayId}`] || 0;
        const currentWeight = data[`INV_Weight_${trayId}`] || 0;

        if (currentQty < quantity) {
            return res.status(400).json({
                ok: false,
                error: `Cantidad insuficiente. Actual: ${currentQty}, Solicitada: ${quantity}`,
            });
        }

        const writes = {
            [`INV_Qty_${trayId}`]: currentQty - parseInt(quantity),
        };
        if (currentWeight > 0) {
            const unitWeight = currentWeight / currentQty;
            writes[`INV_Weight_${trayId}`] = Math.max(0, currentWeight - (unitWeight * quantity));
        }

        await plc.writeMultiple(writes);

        // Registrar movimiento
        const record = inventoryLogger.logMovement({
            type: 'unload',
            trayId,
            reference: reference || data[`INV_Ref_${trayId}`] || '',
            quantity: parseInt(quantity),
            weight: 0,
            operator,
            supervisor: supervisor || '',
            location: location || '',
        });

        res.json({
            ok: true,
            message: `Bandeja #${trayId}: -${quantity} unidades`,
            record,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /api/inventory/bulk-load
 * Carga masiva desde ERP/WMS
 * Body: [ { trayId, reference, quantity, weight?, operator } ]
 */
app.post('/api/inventory/bulk-load', async (req, res) => {
    try {
        const items = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ ok: false, error: 'Se esperaba un array de items' });
        }

        const results = [];
        for (const item of items) {
            const { trayId, reference, quantity, weight, operator } = item;

            if (trayId === undefined || trayId < 0 || trayId > 19) {
                results.push({ trayId, ok: false, error: 'trayId inválido' });
                continue;
            }

            try {
                const data = await plc.readAll();
                const currentQty = data[`INV_Qty_${trayId}`] || 0;
                const currentWeight = data[`INV_Weight_${trayId}`] || 0;

                const writes = {
                    [`INV_Ref_${trayId}`]: reference || '',
                    [`INV_Qty_${trayId}`]: currentQty + (parseInt(quantity) || 0),
                };
                if (weight !== undefined) {
                    writes[`INV_Weight_${trayId}`] = currentWeight + parseFloat(weight);
                }

                await plc.writeMultiple(writes);

                inventoryLogger.logMovement({
                    type: 'load',
                    trayId,
                    reference: reference || '',
                    quantity: parseInt(quantity) || 0,
                    weight: weight ? parseFloat(weight) : 0,
                    operator: operator || 'ERP-Bulk',
                });

                results.push({ trayId, ok: true });
            } catch (err) {
                results.push({ trayId, ok: false, error: err.message });
            }
        }

        const successCount = results.filter(r => r.ok).length;
        res.json({
            ok: true,
            message: `${successCount}/${items.length} bandejas actualizadas`,
            results,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /api/report/shift
 * Genera y descarga reporte Excel del turno
 * Query: ?date=YYYY-MM-DD&shift=morning|afternoon|night&supervisor=nombre&location=planta
 */
app.get('/api/report/shift', async (req, res) => {
    try {
        const { date, shift, supervisor, location } = req.query;

        if (!date || !shift) {
            return res.status(400).json({
                ok: false,
                error: 'Parámetros requeridos: date (YYYY-MM-DD), shift (morning|afternoon|night)',
            });
        }

        if (!['morning', 'afternoon', 'night'].includes(shift)) {
            return res.status(400).json({
                ok: false,
                error: 'shift debe ser: morning, afternoon, o night',
            });
        }

        // Leer inventario actual para la hoja de cierre
        let currentInventory = null;
        try {
            const data = await plc.readAll();
            currentInventory = [];
            for (let i = 0; i < 20; i++) {
                currentInventory.push({
                    trayId: i,
                    reference: data[`INV_Ref_${i}`] || '',
                    quantity: data[`INV_Qty_${i}`] || 0,
                    weight: data[`INV_Weight_${i}`] || 0,
                });
            }
        } catch (e) {
            console.warn('[Report] No se pudo leer inventario actual:', e.message);
        }

        const buffer = generateShiftReport({
            date,
            shift,
            supervisor: supervisor || '',
            location: location || '',
            currentInventory,
        });

        const filename = getReportFilename(date, shift);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

        console.log(`[Report] 📊 Reporte generado: ${filename}`);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// Información del servidor
app.get('/api/info', (req, res) => {
    res.json({
        name: 'ZASCA PLC Bridge',
        version: '2.0.0',
        mode: MODE,
        plcIp: MODE === 'live' ? process.env.PLC_IP : 'mock',
        pollInterval: POLL_MS,
        uptime: process.uptime(),
        features: ['inventory-api', 'shift-report', 'websocket'],
    });
});

// ==========================================
// 3. WEBSOCKET - Streaming en Tiempo Real
// ==========================================

let pollInterval = null;

io.on('connection', (socket) => {
    console.log(`[WS] 🔗 Cliente conectado: ${socket.id}`);

    // Enviar info inicial
    socket.emit('bridge-info', { mode: MODE, pollMs: POLL_MS });

    // El cliente puede enviar comandos directamente por WebSocket también
    socket.on('select-tray', async (data) => {
        try {
            const trayId = parseInt(data.trayId);
            if (trayId >= 0 && trayId <= 19) {
                await plc.writeMultiple({
                    CMD_TargetTray: trayId,
                    CMD_Start: true,
                    CMD_Stop: false,
                });
                socket.emit('command-ack', { command: 'select-tray', trayId, ok: true });
            }
        } catch (err) {
            socket.emit('command-ack', { command: 'select-tray', ok: false, error: err.message });
        }
    });

    socket.on('start', async () => {
        await plc.writeTag('CMD_Start', true);
        await plc.writeTag('CMD_Stop', false);
    });

    socket.on('stop', async () => {
        await plc.writeTag('CMD_Stop', true);
        await plc.writeTag('CMD_Start', false);
    });

    socket.on('estop', async () => {
        await plc.writeMultiple({ CMD_EStop: true, CMD_Start: false, CMD_Stop: true });
    });

    socket.on('disconnect', () => {
        console.log(`[WS] ❌ Cliente desconectado: ${socket.id}`);
    });
});

// Polling loop: Lee el PLC y emite a todos los clientes
function startPolling() {
    pollInterval = setInterval(async () => {
        try {
            if (io.engine.clientsCount === 0) return; // No gastar CPU si nadie escucha

            const status = await plc.readStatus();
            io.emit('plc-state', {
                timestamp: Date.now(),
                ...status,
            });
        } catch (err) {
            // No inundar el log con errores repetidos
            if (!startPolling._lastError || Date.now() - startPolling._lastError > 5000) {
                console.error('[POLL] Error leyendo PLC:', err.message);
                startPolling._lastError = Date.now();
            }
        }
    }, POLL_MS);
}

// ==========================================
// 4. INICIO DEL SERVIDOR
// ==========================================

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║           ZASCA PLC BRIDGE v1.0.0                   ║');
    console.log('║   React ↔ Node.js ↔ PLC Siemens S7                 ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   Modo:       ${MODE.toUpperCase()}`);
    console.log(`   Puerto:     ${HTTP_PORT}`);
    console.log(`   Polling:    ${POLL_MS}ms`);

    if (MODE === 'live') {
        console.log(`   PLC IP:     ${process.env.PLC_IP}`);
        console.log(`   PLC Rack:   ${process.env.PLC_RACK}`);
        console.log(`   PLC Slot:   ${process.env.PLC_SLOT}`);
    }
    console.log('');

    try {
        // Conectar al PLC (real o mock)
        await plc.connect();

        // Iniciar polling de estado
        startPolling();

        // Iniciar servidor HTTP + WebSocket
        server.listen(HTTP_PORT, () => {
            console.log(`[HTTP] 🌐 API REST:    http://localhost:${HTTP_PORT}/api/status`);
            console.log(`[WS]   🔌 WebSocket:   ws://localhost:${HTTP_PORT}`);
            console.log('');
            console.log('─── Endpoints disponibles ───');
            console.log('  GET    /api/status           Estado completo del PLC');
            console.log('  GET    /api/inventory         Inventario (20 bandejas)');
            console.log('  GET    /api/info              Info del servidor');
            console.log('  POST   /api/select-tray      Seleccionar bandeja {trayId}');
            console.log('  POST   /api/start             Iniciar modo auto');
            console.log('  POST   /api/stop              Parada normal');
            console.log('  POST   /api/estop             Parada de emergencia');
            console.log('  POST   /api/estop/reset       Resetear E-Stop');
            console.log('  POST   /api/search            Buscar referencia {reference}');
            console.log('  POST   /api/inventory/update  Actualizar bandeja');
            console.log('─────────────────────────────');
            console.log('');
        });
    } catch (err) {
        console.error('❌ Error fatal al iniciar:', err.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] Cerrando conexiones...');
    if (pollInterval) clearInterval(pollInterval);
    plc.disconnect();
    server.close(() => {
        console.log('[SHUTDOWN] ✅ Servidor cerrado correctamente.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => process.emit('SIGINT'));

// ¡Arrancar!
main();
