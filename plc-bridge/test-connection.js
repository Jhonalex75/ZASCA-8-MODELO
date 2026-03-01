/**
 * ============================================================
 * TEST DE CONEXIÓN AL PLC
 * ============================================================
 * Script independiente para verificar la comunicación con el
 * PLC Siemens S7-1200 antes de usar el servidor completo.
 *
 * Uso:
 *   node test-connection.js              (usa .env para IP)
 *   node test-connection.js 192.168.0.1  (IP directa)
 * ============================================================
 */

require('dotenv').config();

const PlcConnection = require('./plcConnection');
const MockPlc = require('./mockPlc');

const MODE = (process.env.MODE || 'mock').toLowerCase();
const customIp = process.argv[2];

async function test() {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║   ZASCA - Test de Conexión PLC       ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');

    let plc;

    if (MODE === 'live' || customIp) {
        const ip = customIp || process.env.PLC_IP || '192.168.0.1';
        console.log(`🔌 Modo: LIVE (PLC Real)`);
        console.log(`   IP:   ${ip}`);
        console.log(`   Rack: ${process.env.PLC_RACK || 0}`);
        console.log(`   Slot: ${process.env.PLC_SLOT || 1}`);
        console.log('');

        plc = new PlcConnection({
            ip,
            rack: parseInt(process.env.PLC_RACK || '0'),
            slot: parseInt(process.env.PLC_SLOT || '1'),
        });
    } else {
        console.log('🟢 Modo: MOCK (Simulador local)');
        console.log('   (Para probar con PLC real, ejecute: MODE=live node test-connection.js)');
        console.log('');
        plc = new MockPlc();
    }

    try {
        // Paso 1: Conectar
        console.log('── Paso 1: Conectando...');
        await plc.connect();
        console.log('   ✅ Conexión establecida\n');

        // Paso 2: Leer estado
        console.log('── Paso 2: Leyendo estado del PLC...');
        const status = await plc.readStatus();
        console.log('   Estado del sistema:');
        for (const [key, value] of Object.entries(status)) {
            const icon = key.startsWith('ST_') ? '📊' : '📈';
            console.log(`   ${icon} ${key.padEnd(22)} = ${value}`);
        }
        console.log('');

        // Paso 3: Leer inventario
        console.log('── Paso 3: Leyendo inventario...');
        const all = await plc.readAll();
        console.log('   ┌─────┬──────────────────────────┬──────┬────────┐');
        console.log('   │ ID  │ Referencia               │ Cant │ Peso   │');
        console.log('   ├─────┼──────────────────────────┼──────┼────────┤');
        for (let i = 0; i < 20; i++) {
            const ref = (all[`INV_Ref_${i}`] || 'N/A').toString().padEnd(24);
            const qty = (all[`INV_Qty_${i}`] || 0).toString().padStart(4);
            const wgt = (all[`INV_Weight_${i}`] || 0).toFixed(1).padStart(6);
            console.log(`   │ ${i.toString().padStart(2)}  │ ${ref} │ ${qty} │ ${wgt} │`);
        }
        console.log('   └─────┴──────────────────────────┴──────┴────────┘');
        console.log('');

        // Paso 4: Prueba de escritura
        console.log('── Paso 4: Prueba de escritura (Seleccionar Bandeja #3)...');
        await plc.writeTag('CMD_TargetTray', 3);
        console.log('   ✅ Escritura exitosa: CMD_TargetTray = 3\n');

        // Paso 5: Verificar escritura
        console.log('── Paso 5: Verificar lectura después de escritura...');
        const verify = await plc.readAll();
        console.log(`   CMD_TargetTray = ${verify.CMD_TargetTray}`);
        console.log('');

        // Resultado
        console.log('╔══════════════════════════════════════╗');
        console.log('║   ✅ TODAS LAS PRUEBAS PASARON      ║');
        console.log('╚══════════════════════════════════════╝');
        console.log('');
        console.log('   El bridge puede comunicarse con el PLC.');
        console.log('   Ejecute "npm start" para iniciar el servidor completo.');

    } catch (err) {
        console.error('');
        console.error('╔══════════════════════════════════════╗');
        console.error('║   ❌ ERROR DE CONEXIÓN               ║');
        console.error('╚══════════════════════════════════════╝');
        console.error('');
        console.error(`   Detalle: ${err.message}`);
        console.error('');
        console.error('   Posibles causas:');
        console.error('   1. El PLC no está encendido o no responde en la IP configurada.');
        console.error('   2. El firewall bloquea el puerto 102 (ISO-on-TCP).');
        console.error('   3. La protección "PUT/GET Access" no está habilitada en TIA Portal.');
        console.error('      → CPU Properties → Protection & Security → "Permit access with');
        console.error('        PUT/GET communication from remote partner" = ✅');
        console.error('   4. Rack/Slot incorrectos (S7-1200: Rack=0, Slot=1).');
        console.error('');
    } finally {
        plc.disconnect();
    }
}

test();
