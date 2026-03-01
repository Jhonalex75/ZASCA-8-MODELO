# Especificaciones de Programación: Gemelo Digital ZASCA

**ID Documento:** INF-PROG-ZAS-003  
**Fecha:** 16 de Febrero de 2026  
**Versión de Software:** v2.0-Production  
**Repositorio:** `ZASCA/8. MODELO/simulator-app`

---

## 1. Stack Tecnológico
El Gemelo Digital es una aplicación web de alto rendimiento diseñada para ejecutarse en navegadores modernos.

*   **Lenguaje Principal:** TypeScript 5.0 (Tipado estricto para seguridad de código).
*   **Framework Frontend:** React 18 (Arquitectura basada en componentes funcionales).
*   **Motor Gráfico 3D:** Three.js + React-Three-Fiber (Renderizado WebGL acelerado por hardware).
*   **Gestión de Estado Global:** Zustand (Manejo de flujo de datos PLC <-> UI sin re-renderizados innecesarios).
*   **Estilos:** TailwindCSS (Diseño responsivo y utilitario).

## 2. Arquitectura de Software

### 2.1 Estructura de Directorios
El proyecto sigue una estructura modular para facilitar el mantenimiento:

```
src/
├── components/       # Componentes de UI (Botones, Paneles, Alertas)
├── simulation/       # NÚCLEO DEL SIMULADOR
│   ├── Physics/      # Motor de Física (Cinemática, Gravedad, Colisiones)
│   ├── PLC/          # Emulador de Lógica de Control (Ladder real en TS)
│   ├── Hardware/     # Abstracción de Sensores y Motores
│   └── CalibrationConfig.ts # Archivo Maestro de Parámetros (VFD, PID, Geo)
├── store/            # Stores de Zustand (usePlcStore, useSimStore)
└── App.tsx           # Punto de entrada y Router
```

### 2.2 Patrón de Diseño: "Loop de Simulación"
A diferencia de una web tradicional, el simulador opera en un bucle continuo (`requestAnimationFrame`), desacoplado del renderizado de React:

1.  **Input:** Lectura de sensores y estado del usuario.
2.  **Logic (PLC):** Ejecución del ciclo de escaneo (Scan Cycle) en `Processor.ts`.
3.  **Physics:** Cálculo de nuevas posiciones, velocidades y torques en `PhysicsEngine.ts`.
4.  **Render:** Actualización de la escena 3D y elementos del DOM.

**Frecuencia de Actualización:** 60 FPS (16.6ms por frame).

## 3. Módulos Críticos

### 3.1 Motor de Física (`PhysicsEngine.ts`)
Responsable de la validación mecánica.
*   **Clase:** `PhysicsEngine`
*   **Métodos Clave:**
    *   `update(dt, torque)`: Integra ecuaciones de movimiento (Euler semi-implicito).
    *   `getTrayPosition(index)`: Mapeo geométrico de coordenadas lineales a trayectoria "Paternoster".

### 3.2 Emulador PLC (`Processor.ts`)
Replica la lógica de un PLC industrial (e.g., Siemens/Allen-Bradley).
*   **Clase:** `PlcProcessor`
*   **Características:**
    *   Manejo de Tags de Memoria (M, I, Q).
    *   Temporizadores TON/TOF implementados por software.
    *   Máquina de Estados Finitos para seguridad (Interlocks).

## 4. Convenciones de Código

### Naming Convention
*   **Variables:** `camelCase` (ej: `motorSpeed`).
*   **Clases/Componentes:** `PascalCase` (ej: `MotorController`).
*   **Constantes:** `UPPER_SNAKE_CASE` (ej: `MAX_TORQUE_NM`).
*   **Tags PLC:** Prefijo de área de memoria (ej: `M0_1_StartBtn`, `Q0_0_MotorOn`).

### Git Workflow
*   **Rama Principal:** `main` (Código de producción validado).
*   **Ramas de Feature:** `feat/nombre-funcionalidad` (ej: `feat/vfd-ramp`).
*   **Commits:** Estándar "Conventional Commits" (ej: `feat: add step function logic`).

## 5. Despliegue (Build & Deploy)
El proyecto utiliza **Vite** como empaquetador para tiempos de carga instantáneos.

*   **Comando de Desarrollo:** `npm run dev`
*   **Comando de Producción:** `npm run build` (Genera carpeta `dist/` optimizada).
*   **Requisitos del Servidor:** Cualquier servidor estático (Nginx, Apache, Vercel). No requiere Backend (Lógica corre en el cliente).

---
*Documento generado para el equipo de Desarrollo y Mantenimiento de Software.*
