# ZASCA PLC Bridge

**Middleware Node.js** que conecta la interfaz React del Gemelo Digital con el PLC Siemens S7-1200.

```
React (Navegador/Tablet) ←→ [WebSocket/REST] ←→ Node.js ←→ [nodes7/RFC1006] ←→ PLC S7-1200
```

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `server.js` | Servidor Express (API REST) + Socket.IO (WebSocket tiempo real) |
| `plcConnection.js` | Driver de comunicación S7 con mapa de tags (DB1, DB2, DB3) |
| `mockPlc.js` | Simulador de PLC para desarrollo sin hardware |
| `test-connection.js` | Script de diagnóstico de conexión |
| `.env` | Configuración (IP, modo, puerto) |

## Instalación

```bash
cd plc-bridge
npm install
```

## Modos de Operación

### Modo Mock (Desarrollo sin PLC)
```bash
npm start
# o explícitamente:
set MODE=mock && node server.js
```
Simula el comportamiento del PLC internamente. Perfecto para desarrollar la interfaz React sin hardware.

### Modo Live (PLC Real)
```bash
set MODE=live && set PLC_IP=192.168.0.1 && node server.js
```
Requiere:
- PLC Siemens S7-1200/1500 encendido en la red
- IP configurada en `.env` (por defecto: `192.168.0.1`)
- "PUT/GET Access" habilitado en TIA Portal (Propiedades PLC → Protección)

## Probar la Conexión

```bash
# Con mock:
npm run test:plc

# Con PLC real (IP directa):
node test-connection.js 192.168.0.1
```

```powershell
# Verificar alcance de red (PowerShell):
Test-NetConnection -ComputerName 192.168.0.1 -Port 102
```

## API REST

Puerto por defecto: **3001**

| Método | Endpoint | Body | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/status` | — | Estado completo del PLC |
| `GET` | `/api/inventory` | — | Inventario (20 bandejas) |
| `GET` | `/api/info` | — | Info del servidor (modo, versión) |
| `POST` | `/api/select-tray` | `{trayId: 0-19}` | Seleccionar bandeja objetivo |
| `POST` | `/api/start` | — | Iniciar modo automático |
| `POST` | `/api/stop` | — | Parada normal |
| `POST` | `/api/estop` | — | Parada de emergencia |
| `POST` | `/api/estop/reset` | — | Resetear E-Stop |
| `POST` | `/api/search` | `{reference: "texto"}` | Buscar referencia en inventario |
| `POST` | `/api/inventory/update` | `{trayId, ref?, qty?, weight?}` | Actualizar datos de bandeja |

## WebSocket (Socket.IO)

Conectar a `ws://localhost:3001`:

```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001');

// Recibir estado en tiempo real (cada 100ms)
socket.on('plc-state', (data) => {
    console.log(data.ST_EncoderPos);    // Posición en grados (0-360)
    console.log(data.ST_MotorRunning);  // Motor activo
    console.log(data.ST_SystemReady);   // Sistema listo
    console.log(data.ST_AutoMode);      // Modo automático
    console.log(data.ST_PosReached);    // Posición alcanzada
    console.log(data.TEL_Torque);       // Torque motor (Nm)
    console.log(data.TEL_Current);      // Corriente motor (A)
    console.log(data.TEL_Temperature);  // Temp motor (°C)
});

// Info del servidor
socket.on('bridge-info', (info) => {
    // { mode: 'live'|'mock', pollMs: 100 }
});

// Confirmación de comandos
socket.on('command-ack', (ack) => {
    // { command: 'start', ok: true }
    // { command: 'select-tray', ok: false, error: 'PLC no conectado' }
});

// Enviar comandos
socket.emit('select-tray', { trayId: 5 });
socket.emit('start');
socket.emit('stop');
socket.emit('estop');
```

## Mapa de Tags del PLC

El archivo `plcConnection.js` define el mapeo de tags a direcciones del PLC:

### DB1 — Comandos (HMI → PLC)

| Tag | Tipo | Dirección |
|-----|------|-----------|
| `CMD_TargetTray` | INT | DB1,INT0 |
| `CMD_Start` | BOOL | DB1,X2.0 |
| `CMD_Stop` | BOOL | DB1,X2.1 |
| `CMD_EStop` | BOOL | DB1,X2.2 |

### DB2 — Estado (PLC → HMI)

| Tag | Tipo | Dirección |
|-----|------|-----------|
| `ST_EncoderPos` | REAL | DB2,REAL0 |
| `ST_VFD_Speed` | REAL | DB2,REAL4 |
| `ST_MotorRunning` | BOOL | DB2,X8.0 |
| `ST_SystemReady` | BOOL | DB2,X8.1 |
| `ST_SystemFault` | BOOL | DB2,X8.2 |
| `ST_AutoMode` | BOOL | DB2,X8.4 |

### DB3 — Inventario (20 bandejas × 28 bytes)

Fórmula: Bandeja N → `INV_Ref_N` = DB3,S(N×28).20 | `INV_Qty_N` = DB3,INT(N×28+22) | `INV_Weight_N` = DB3,REAL(N×28+24)

> Para el listado completo, ver `GUIA_INTEGRACION_AUTOMATIZADOR.md` §3.

## Configuración (.env)

```env
PLC_IP=192.168.0.1          # IP del PLC Siemens
PLC_RACK=0                  # S7-1200 = Rack 0
PLC_SLOT=1                  # S7-1200 = Slot 1
PLC_PORT=102                # Puerto S7comm estándar
HTTP_PORT=3001              # Puerto del servidor web
WS_POLL_INTERVAL_MS=100     # Intervalo de polling (ms)
MODE=mock                   # "mock" o "live"
```

## Diagnóstico de Errores

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` | PLC apagado o IP incorrecta | Verificar IP y alimentación |
| `ETIMEDOUT` | Firewall o subred diferente | PC y PLC deben estar en la misma subred |
| `Tag desconocido` | DB no existe en PLC | Crear DB1, DB2, DB3 según documentación |
| `Access denied` | Protección de acceso | En TIA Portal: Propiedades PLC → Protección → Permitir PUT/GET |

## Notas Importantes

- **Fix del loop (Feb 2026):** El mockPlc.js resetea `CMD_Start` y `ST_AutoMode` cuando el carrusel llega a su posición. Sin este fix, el segundo ciclo de picking generaba un bucle infinito de movimiento.
- **Concurrencia:** Se soportan múltiples clientes WebSocket simultáneos (supervisión + operación).
- **Seguridad:** Este servidor NO tiene autenticación. Debe correr en una red aislada (VLAN industrial).
