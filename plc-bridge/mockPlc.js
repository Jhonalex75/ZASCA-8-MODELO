/**
 * ============================================================
 * MOCK PLC - Simulador de PLC para desarrollo sin hardware
 * ============================================================
 * Replica el comportamiento del FB_Paternoster_Control (SCL)
 * para permitir desarrollo del frontend sin el PLC físico.
 * ============================================================
 */

class MockPlc {
    constructor() {
        // Estado interno (simula los DBs del PLC)
        this.state = {
            // DB1: Comandos recibidos
            CMD_TargetTray: 0,
            CMD_Start: false,
            CMD_Stop: false,
            CMD_EStop: false,
            CMD_SearchRef: '',
            CMD_DoSearch: false,

            // DB2: Estado del sistema
            ST_EncoderPos: 0.0,        // Posición actual (grados)
            ST_VFD_Speed: 0.0,         // Velocidad VFD (%)
            ST_MotorRunning: false,
            ST_SystemReady: true,
            ST_SystemFault: false,
            ST_BrakeReleased: false,
            ST_AutoMode: false,
            ST_FaultCode: 0,
            ST_TargetPos: 0.0,
            ST_ErrorPos: 0.0,

            // Telemetría
            TEL_Torque: 0.0,
            TEL_Current: 0.0,
            TEL_Temperature: 25.0,
        };

        // Inventario (DB3): 20 bandejas
        this.inventory = [];
        const sampleRefs = [
            'VACIO', 'TORNILLOS M4', 'TUERCAS M6', 'ARANDELAS 1/4',
            'PERNOS HEX 3/8', 'RODAMIENTOS 6205', 'CORREAS A-68',
            'FUSIBLES 10A', 'CONTACTORES 3P', 'RELES 24VDC',
            'CABLE #12 AWG', 'TERMINALES PIN', 'BORNERAS 4mm',
            'SENSORES PROX', 'FINALES CARRERA', 'PILOTOS LED',
            'PULSADORES 22mm', 'SELECTORES 3POS', 'GUARDAMOTORES',
            'VARIADORES VFD'
        ];
        for (let i = 0; i < 20; i++) {
            this.inventory.push({
                reference: sampleRefs[i] || 'VACIO',
                quantity: Math.floor(Math.random() * 50) + 1,
                weight: Math.round((Math.random() * 40 + 5) * 10) / 10,
            });
        }

        // Parámetros de simulación (equivalente a DB_Config SCL)
        this.config = {
            TRAY_SPACING_DEG: 143.24,   // 2864.8 / 20
            TOTAL_CYCLE_DEG: 2864.8,
            SENSOR_POS_DEG: 277.9,
            SPEED_CRUISE: 90.0,         // deg/s
            SPEED_APPROACH: 40.0,
            SPEED_CRAWL: 10.0,
            DIST_APPROACH: 2.0,         // trays
            DIST_CRAWL: 0.5,
            DEAD_ZONE_DEG: 1.2,
        };

        this._simInterval = null;
        this._lastTime = Date.now();
    }

    /**
     * Conectar (simular inicio)
     */
    async connect() {
        console.log('[MOCK PLC] 🟢 Simulador PLC iniciado');
        this._lastTime = Date.now();
        this._simInterval = setInterval(() => this._simulationStep(), 50); // 20Hz scan
    }

    /**
     * Leer todos los valores
     */
    async readAll() {
        const result = { ...this.state };

        // Agregar inventario al resultado
        for (let i = 0; i < 20; i++) {
            result[`INV_Ref_${i}`] = this.inventory[i].reference;
            result[`INV_Qty_${i}`] = this.inventory[i].quantity;
            result[`INV_Weight_${i}`] = this.inventory[i].weight;
        }

        return result;
    }

    /**
     * Leer solo estado (optimizado)
     */
    async readStatus() {
        const result = {};
        for (const key of Object.keys(this.state)) {
            if (key.startsWith('ST_') || key.startsWith('TEL_')) {
                result[key] = this.state[key];
            }
        }
        return result;
    }

    /**
     * Escribir un tag
     */
    async writeTag(tagName, value) {
        if (tagName in this.state) {
            this.state[tagName] = value;
            console.log(`[MOCK PLC] ✏️  ${tagName} = ${value}`);
        } else if (tagName.startsWith('INV_')) {
            // Parsear tag de inventario
            const match = tagName.match(/INV_(Ref|Qty|Weight)_(\d+)/);
            if (match) {
                const [, field, idx] = match;
                const i = parseInt(idx);
                if (field === 'Ref') this.inventory[i].reference = value;
                if (field === 'Qty') this.inventory[i].quantity = value;
                if (field === 'Weight') this.inventory[i].weight = value;
            }
        }
    }

    /**
     * Escribir múltiples tags
     */
    async writeMultiple(tagValues) {
        for (const [tag, val] of Object.entries(tagValues)) {
            await this.writeTag(tag, val);
        }
    }

    /**
     * Paso de simulación interna (replica FB_Paternoster_Control)
     */
    _simulationStep() {
        const now = Date.now();
        const dt = (now - this._lastTime) / 1000;
        this._lastTime = now;

        const s = this.state;
        const c = this.config;

        // --- RUNG 1: Seguridad ---
        if (s.CMD_EStop) {
            s.ST_AutoMode = false;
            s.ST_MotorRunning = false;
            s.ST_BrakeReleased = false;
            s.ST_VFD_Speed = 0;
            s.ST_SystemFault = true;
            s.ST_FaultCode = 99;
            return;
        }
        s.ST_SystemFault = false;
        s.ST_FaultCode = 0;

        // --- RUNG 2: Modo Auto ---
        if (s.CMD_Start && !s.CMD_Stop) {
            s.ST_AutoMode = true;

            // Calcular posición objetivo
            const targetTray = Math.max(0, Math.min(19, s.CMD_TargetTray));
            s.ST_TargetPos = c.SENSOR_POS_DEG - (targetTray * c.TRAY_SPACING_DEG);
            // Normalización cíclica
            while (s.ST_TargetPos < 0) s.ST_TargetPos += c.TOTAL_CYCLE_DEG;
            while (s.ST_TargetPos >= c.TOTAL_CYCLE_DEG) s.ST_TargetPos -= c.TOTAL_CYCLE_DEG;
        }

        if (s.CMD_Stop) {
            s.ST_AutoMode = false;
        }

        // --- RUNG 3: Control de Movimiento (Step Function) ---
        if (s.ST_AutoMode) {
            // Calcular error (distancia más corta en ciclo)
            let rawError = s.ST_TargetPos - s.ST_EncoderPos;
            if (rawError > c.TOTAL_CYCLE_DEG / 2) rawError -= c.TOTAL_CYCLE_DEG;
            if (rawError < -c.TOTAL_CYCLE_DEG / 2) rawError += c.TOTAL_CYCLE_DEG;

            s.ST_ErrorPos = Math.abs(rawError);
            const errorTrays = s.ST_ErrorPos / c.TRAY_SPACING_DEG;
            const direction = rawError >= 0 ? 1 : -1;

            let speed = 0;
            if (errorTrays > c.DIST_APPROACH) {
                speed = c.SPEED_CRUISE;
            } else if (errorTrays > c.DIST_CRAWL) {
                speed = c.SPEED_APPROACH;
            } else if (s.ST_ErrorPos > c.DEAD_ZONE_DEG) {
                speed = c.SPEED_CRAWL;
            } else {
                // EN POSICIÓN
                speed = 0;
                s.ST_MotorRunning = false;
                s.ST_BrakeReleased = false;
                s.ST_VFD_Speed = 0;
                s.ST_SystemReady = true;
                s.ST_AutoMode = false;    // FIX: Desactivar auto — requiere nuevo Start
                s.CMD_Start = false;      // FIX: Resetear comando — requiere nuevo pulso
                s.TEL_Torque = 0;
                s.TEL_Current = 0.5; // Idle
                return;
            }

            // Mover
            s.ST_MotorRunning = true;
            s.ST_BrakeReleased = true;
            s.ST_SystemReady = false;
            s.ST_VFD_Speed = (speed / c.SPEED_CRUISE) * 100;

            // Actualizar posición
            s.ST_EncoderPos += direction * speed * dt;
            // Normalizar
            while (s.ST_EncoderPos < 0) s.ST_EncoderPos += c.TOTAL_CYCLE_DEG;
            while (s.ST_EncoderPos >= c.TOTAL_CYCLE_DEG) s.ST_EncoderPos -= c.TOTAL_CYCLE_DEG;

            // Telemetría simulada
            s.TEL_Torque = speed * 0.5 + Math.random() * 2;
            s.TEL_Current = speed * 0.08 + 1.0 + Math.random() * 0.3;
            s.TEL_Temperature = 25 + (s.ST_MotorRunning ? Math.random() * 5 : 0);
        } else {
            s.ST_MotorRunning = false;
            s.ST_VFD_Speed = 0;
            s.ST_SystemReady = !s.ST_SystemFault;
            s.TEL_Torque = 0;
            s.TEL_Current = 0.5;
        }

        // --- BÚSQUEDA ---
        if (s.CMD_DoSearch && s.CMD_SearchRef) {
            const ref = s.CMD_SearchRef.toUpperCase().trim();
            let foundIdx = -1;
            for (let i = 0; i < 20; i++) {
                if (this.inventory[i].reference.toUpperCase().includes(ref)) {
                    foundIdx = i;
                    break;
                }
            }
            // El resultado se puede leer como un tag especial
            s._searchResult = foundIdx;
            s.CMD_DoSearch = false;
        }
    }

    /**
     * Desconectar (detener simulación)
     */
    disconnect() {
        if (this._simInterval) {
            clearInterval(this._simInterval);
            this._simInterval = null;
        }
        console.log('[MOCK PLC] 🔴 Simulador detenido');
    }
}

module.exports = MockPlc;
