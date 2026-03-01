/**
 * ============================================================
 * ZASCA PLC CONNECTION - nodes7 Module
 * ============================================================
 * Maneja la comunicación directa con el PLC Siemens S7-1200
 * usando el protocolo ISO-on-TCP (RFC 1006, Puerto 102).
 *
 * Este módulo SOLO se usa en modo "live".
 * En modo "mock", se usa mockPlc.js.
 * ============================================================
 */

const nodes7 = require('nodes7');

class PlcConnection {
    constructor(config) {
        this.conn = new nodes7();
        this.connected = false;
        this.config = {
            host: config.ip || '192.168.0.1',
            port: config.port || 102,
            rack: config.rack || 0,
            slot: config.slot || 1,
        };

        // =============================================
        // MAPA DE TAGS DEL PLC
        // =============================================
        // Basado en: Codigo_Fuente_Siemens_SCL.md
        // Formato nodes7: 'DBx,TIPOoffset'
        //   DB1 = Comandos (HMI -> PLC)
        //   DB2 = Estado   (PLC -> HMI)
        //   DB3 = Inventario
        // =============================================
        this.tagMap = {
            // --- DB1: COMANDOS (Escritura desde React) ---
            'CMD_TargetTray':    'DB1,INT0',       // Bandeja solicitada (0-19)
            'CMD_Start':         'DB1,X2.0',       // Comando Start
            'CMD_Stop':          'DB1,X2.1',       // Comando Stop
            'CMD_EStop':         'DB1,X2.2',       // Parada de Emergencia (Software)
            'CMD_SearchRef':     'DB1,S4.20',      // Texto de búsqueda de referencia
            'CMD_DoSearch':      'DB1,X26.0',      // Ejecutar búsqueda

            // --- DB2: ESTADO (Lectura hacia React) ---
            'ST_EncoderPos':     'DB2,REAL0',      // Posición actual (grados)
            'ST_VFD_Speed':      'DB2,REAL4',      // Velocidad actual VFD (%)
            'ST_MotorRunning':   'DB2,X8.0',       // Motor encendido
            'ST_SystemReady':    'DB2,X8.1',       // Sistema listo para picking
            'ST_SystemFault':    'DB2,X8.2',       // Falla activa
            'ST_BrakeReleased':  'DB2,X8.3',       // Freno liberado
            'ST_AutoMode':       'DB2,X8.4',       // Modo automático activo
            'ST_FaultCode':      'DB2,INT10',      // Código de falla
            'ST_TargetPos':      'DB2,REAL12',     // Posición objetivo calculada
            'ST_ErrorPos':       'DB2,REAL16',     // Error de posición actual

            // --- DB2: TELEMETRÍA (Para Gemelo Digital) ---
            'TEL_Torque':        'DB2,REAL20',     // Torque motor actual (Nm)
            'TEL_Current':       'DB2,REAL24',     // Corriente motor (A)
            'TEL_Temperature':   'DB2,REAL28',     // Temperatura motor (°C)

            // --- DB3: INVENTARIO (Lectura/Escritura) ---
            // Bandeja 0
            'INV_Ref_0':         'DB3,S0.20',
            'INV_Qty_0':         'DB3,INT22',
            'INV_Weight_0':      'DB3,REAL24',
            // Bandeja 1
            'INV_Ref_1':         'DB3,S28.20',
            'INV_Qty_1':         'DB3,INT50',
            'INV_Weight_1':      'DB3,REAL52',
            // ... (Repetir patrón cada 28 bytes para bandejas 2-19)
            // En producción, generar dinámicamente con un bucle
        };

        // Pre-calcular inventario completo (20 bandejas × 28 bytes cada una)
        for (let i = 2; i <= 19; i++) {
            const base = i * 28;
            this.tagMap[`INV_Ref_${i}`]    = `DB3,S${base}.20`;
            this.tagMap[`INV_Qty_${i}`]    = `DB3,INT${base + 22}`;
            this.tagMap[`INV_Weight_${i}`] = `DB3,REAL${base + 24}`;
        }
    }

    /**
     * Conectar al PLC
     * @returns {Promise<void>}
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.conn.initiateConnection(this.config, (err) => {
                if (err) {
                    console.error(`[PLC] ❌ Error de conexión: ${err.message}`);
                    this.connected = false;
                    return reject(err);
                }

                console.log(`[PLC] ✅ Conectado a ${this.config.host}:${this.config.port}`);
                this.connected = true;

                // Registrar todos los tags
                this.conn.setTranslationCB((tag) => this.tagMap[tag]);
                this.conn.addItems(Object.keys(this.tagMap));

                resolve();
            });
        });
    }

    /**
     * Leer todos los tags del PLC
     * @returns {Promise<Object>} Objeto con todos los valores leídos
     */
    readAll() {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new Error('PLC no conectado'));
            }

            this.conn.readAllItems((err, values) => {
                if (err) {
                    console.error('[PLC] Error lectura:', err);
                    return reject(err);
                }
                resolve(values);
            });
        });
    }

    /**
     * Leer solo los tags de estado (DB2) - Optimizado para polling rápido
     * @returns {Promise<Object>}
     */
    readStatus() {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new Error('PLC no conectado'));
            }

            const statusTags = Object.keys(this.tagMap).filter(
                (k) => k.startsWith('ST_') || k.startsWith('TEL_')
            );

            this.conn.readAllItems((err, values) => {
                if (err) return reject(err);

                // Filtrar solo los tags de estado
                const statusValues = {};
                for (const tag of statusTags) {
                    statusValues[tag] = values[tag];
                }
                resolve(statusValues);
            });
        });
    }

    /**
     * Escribir un valor en el PLC
     * @param {string} tagName - Nombre del tag (ej: 'CMD_TargetTray')
     * @param {*} value - Valor a escribir
     * @returns {Promise<void>}
     */
    writeTag(tagName, value) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new Error('PLC no conectado'));
            }

            if (!this.tagMap[tagName]) {
                return reject(new Error(`Tag desconocido: ${tagName}`));
            }

            this.conn.writeItems(tagName, value, (err) => {
                if (err) {
                    console.error(`[PLC] Error escritura ${tagName}:`, err);
                    return reject(err);
                }
                console.log(`[PLC] ✏️  ${tagName} = ${value}`);
                resolve();
            });
        });
    }

    /**
     * Escribir múltiples tags simultáneamente
     * @param {Object} tagValues - Objeto {tagName: value, ...}
     * @returns {Promise<void>}
     */
    writeMultiple(tagValues) {
        return new Promise((resolve, reject) => {
            if (!this.connected) {
                return reject(new Error('PLC no conectado'));
            }

            const names = Object.keys(tagValues);
            const values = Object.values(tagValues);

            this.conn.writeItems(names, values, (err) => {
                if (err) {
                    console.error('[PLC] Error escritura múltiple:', err);
                    return reject(err);
                }
                console.log(`[PLC] ✏️  Escritura múltiple: ${names.join(', ')}`);
                resolve();
            });
        });
    }

    /**
     * Desconectar del PLC
     */
    disconnect() {
        if (this.connected) {
            this.conn.dropConnection();
            this.connected = false;
            console.log('[PLC] 🔌 Desconectado.');
        }
    }
}

module.exports = PlcConnection;
