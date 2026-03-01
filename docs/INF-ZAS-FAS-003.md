# INFORME 3: INGENIERÍA DE AUTOMATIZACIÓN Y EJECUCIÓN TÉCNICA
**Control del Documento:** INF-ZAS-FAS-003
**Proyecto:** ZASCA Metalmecánico (Configuración 10 HP / Alta Gama)
**Fecha:** 13 de Febrero de 2026

---

## 1. INTRODUCCIÓN
Este informe detalla la ejecución técnica final, consolidando la validación del tren de potencia (10 HP), la estrategia de control lógico (Siemens S7-1200) y la integración del Gemelo Digital como herramienta de validación HIL (Hardware-in-the-Loop).

---

## 2. ARQUITECTURA DE CONTROL (PIRÁMIDE DE AUTOMATIZACIÓN)
El sistema se estructura en tres niveles integrados:
1.  **Nivel 0 (Proceso):** Motor 10HP, Encoder Incremental, Cortinas de Seguridad Sick deTec4.
2.  **Nivel 1 (Control):** PLC Siemens S7-1215C + Variador Sinamics G120 (CU250S-2).
3.  **Nivel 2 (Supervisión):** HMI Simatic TP1500 + Gemelo Digital (React/Three.js).

### Conectividad Industrial
*   **Red:** PROFINET (Ethernet Industrial).
*   **Topología:** Estrella con Switch Scalance XB005.
*   **Direccionamiento:** PLC (.1), HMI (.2), VFD (.3), Digital Twin (.10).

---

## 3. DOCUMENTACIÓN DE LÓGICA PLC (LADDER)
Se asocia la lógica funcional validada en el simulador a redes de contactos (KOP/TIA Portal):

### Redes Principales
*   **RED 1 (Seguridad):** Bucle de interbloqueo (E-Stop, Puertas, Cortinas). Activa marca `Interlocks_Ok`.
*   **RED 2 (Marcha):** Enclavamiento de Modo Automático.
*   **RED 3 (Posicionamiento):** Lectura de HSC (High Speed Counter) y cálculo de error de distancia en tiempo real.
*   **RED 4 (Perfil Escalonado):** 
    *   **Crucero:** Distancia > 2 bandejas.
    *   **Aproximación:** Distancia < 2 bandejas (50% Vel).
    *   **Crawl:** Distancia < 0.5 bandejas (10% Vel).
    *   **Stop:** Precisión ±2mm mediante sensor inductivo final.

---

## 4. VALIDACIÓN DEL GEMELO DIGITAL (10 HP)
El modelo operativo digital confirma los siguientes parámetros:
*   **Torque Motor:** 40.7 Nm (Margen de seguridad > 3.2).
*   **Precisión Lineal:** ± 0.11 mm obtenida en simulación.
*   **Estabilidad:** Eliminación del "Efecto Látigo" mediante rampas de aceleración de 0.1s y desaceleración controlada.

---

## 5. REQUERIMIENTOS FUNCIONALES Y SEGURIDAD
| Requerimiento | Especificación |
| :--- | :--- |
| **Tiempo de Ciclo** | < 15 segundos para 5 posiciones. |
| **Zona Roja** | Indicador HMI de "Prohibido Acceder" en movimiento. |
| **Watchdog** | Alarma de atasco si el movimiento excede 30 segundos. |
| **Trazabilidad** | Registro de picking por operario con ID/Password. |

---

**Aprobado por:** Ingeniería de Control ZASCA
**Responsable:** Departamento de Ingeniería ZASCA.
