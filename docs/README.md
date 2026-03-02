# docs/ — Análisis Estructural & Documentación Técnica ZASCA

Esta carpeta contiene el **motor de análisis estructural y de transmisión** del carrusel ZASCA (aplicación Flask con FEA analítico, simulación de transmisión y dashboard web 3D), junto con toda la documentación técnica del proyecto.

---

## 🔢 Análisis Estructural — `Analisis_Estructural_ZASCA.py`

**Aplicación Flask** (3.170 líneas) que implementa un gemelo digital de ingeniería con:

- **FEA Analítico 1D mejorado** — cálculo de esfuerzos en sección compuesta (paral + platinas)
- **Simulación de transmisión** — Motor 5HP → reductor 40:1 → cadena → eje principal
- **Análisis dinámico completo** — Inercias, vibraciones, resonancia, fatiga, pandeo
- **Visualización 3D WebGL** — Three.js embebido en HTML, modelo PBR del carrusel
- **Dashboard interactivo** — HUD en tiempo real, selector de análisis, descarga de informe PDF

### Requisitos

```bash
pip install flask numpy matplotlib
```

### Ejecución

```bash
cd docs
python Analisis_Estructural_ZASCA.py
```
Abrir: **http://localhost:5000**

---

## 📐 Parámetros de Ingeniería

| Parámetro | Valor |
|---|---|
| **Perfil estructural** | DIN canal 100×50×6.3 mm |
| **Material** | ASTM A36 (Sy = 250 MPa, E = 200 GPa) |
| **Carga viva por bandeja** | 1.200 N |
| **Peso muerto bandeja** | 400 N (~40 kg) |
| **Número de bandejas** | 20 |
| **Carga total de diseño** | 32 kN |
| **Altura de ejes** | 2.779 mm |
| **Ancho total** | 2.443 mm |
| **Profundidad** | 946 mm |

---

## 🔬 Motor de Cálculo — FEA Analítico

### Sección Compuesta (Paral + Platinas)

El cálculo utiliza **Teorema de Steiner** para calcular el momento de inercia de la sección reforzada:

```
Ixx_compuesto = Ixx_paral + 2 × (Ixx_platina_propio + A_platina × d²)
```

Donde:
- **Platinas:** 500 mm × 10 mm, pegadas lateralmente al paral
- **Distancia al eje neutro:** 30 mm (B/2 + t_platina/2)
- **Incremento de rigidez:** ~10× respecto al paral desnudo

### Esfuerzos Calculados

| Elemento | Esfuerzo | Criterio |
|---|---|---|
| Parales (columnas) | σ_axial + σ_flexión + inercia | Von Mises |
| Viga central | σ_flexión (carga distribuida) | Bernoulli |
| Eje principal | τ_torsión | Von Mises cortante |
| Sistema completo | σ_vm_final | max(parales, viga) |

### Análisis Dinámico Completo

| Tipo de análisis | Método |
|---|---|
| **Fuerzas inerciales** | F = m·a durante aceleración (2s) |
| **Frecuencia natural** | ω_n = (π/2)·√(EI/mL⁴) |
| **Resonancia** | ratio = f_excitacion / f_natural |
| **Factor amplificación** | DAF = 1/(1−r²) si 0.8 < r < 1.2 |
| **Fatiga** | Curva S-N, límite = 0.5·Sy |
| **Pandeo (Euler)** | P_cr = π²·E·I / (K·L)² |

### Factores de Seguridad Reportados

| FS | Descripción | Mínimo aceptable |
|---|---|---|
| `fs_fluencia` | min(FS_parales, FS_viga) | ≥ 2.0 |
| `fs_deformacion` | δ_max_permitida / δ_real | ≥ 1.0 |
| `fs_fatiga` | S_e / σ_amplitud | ≥ 2.0 |
| `fs_pandeo` | P_cr / P_carga | ≥ 3.0 |
| **`fs_global`** | min(fluencia, fatiga, pandeo) | **≥ 3.0** |

---

## ⚙️ Simulación de Transmisión

### Cadena cinemática

```
Motor 5HP @ 1750 RPM
    ↓ (reductor 40:1, η=0.85)
Salida reductor: 43.75 RPM
    ↓ (cadena 3:1, η=0.95)
Eje principal: ~14.58 RPM
    ↓ (sprocket 25 dientes, paso 1.25")
Velocidad lineal: ~0.15 m/s
```

### Parámetros del eje

| Parámetro | Valor |
|---|---|
| Diámetro eje | 50.8 mm (2") |
| Acero | SAE 1045 (Sy torsión = 306 MPa) |
| Torque disponible | Depende de HP del motor |
| FS torsión eje | Calculado vs. criterio Von Mises |

### Comparativa 5HP vs 10HP

El dashboard incluye tabla automática comparando ambas opciones de motor. La velocidad y torque requerido son idénticos; el factor de seguridad de potencia se duplica con 10HP.

---

## 🌐 API del Dashboard Flask

| Endpoint | Método | Descripción |
|---|---|---|
| `/` | GET | Dashboard HTML completo (Three.js + HUD) |
| `/api/analisis` | GET | Resultados FEA en JSON |
| `/api/transmision` | GET | Datos de transmisión en JSON |
| `/api/diagramas` | GET | Diagramas P-001, P-002 en Base64 |
| `/api/graficos` | GET | Gráficos de transmisión en Base64 |
| `/api/graficos-estructurales` | GET | Gráficos FEA en Base64 |
| `/api/documento-tecnico` | GET | Informe HTML completo con fórmulas |

---

## 📂 Archivos de Documentación

### Manuales Técnicos

| Archivo | Descripción |
|---|---|
| `Manual_Tecnico_Gemelo_Virtual.md` | Arquitectura y operación del gemelo digital |
| `Programacion_Completa_WinCC_HMI.md` | Referencia completa HMI WinCC (45 KB) |
| `Tutorial_Visual_WinCC_HMI.md` | Tutorial paso a paso WinCC (30 KB) |
| `Manual_Conexion_React_PLC.md` | Integración React ↔ plc-bridge ↔ PLC |
| `Manual_Mantenimiento.md` | Procedimientos de mantenimiento preventivo |
| `maintenance_manual.md` | Manual de mantenimiento (EN) |

### Código Fuente PLC

| Archivo | Descripción |
|---|---|
| `Codigo_Fuente_Siemens_SCL.md` | Código SCL para S7-1200 (TIA Portal) |
| `Siemens_Scl_Code.md` | Código SCL alternativo / revisado |
| `plc_ladder_implementation.md` | Implementación en lenguaje Ladder |

### Especificaciones y Requisitos

| Archivo | Descripción |
|---|---|
| `functional_requirements.md` | Requisitos funcionales del sistema |
| `hardware_specification.md` | Especificaciones de hardware |
| `kinematics_and_physics_model.md` | Modelo cinemático y de fuerzas |
| `Requerimientos_Funcionales.md` | Requerimientos (ES) |
| `Requisitos_Implementacion_Siemens.md` | Requisitos para integración Siemens |

### Informes Técnicos

| Archivo | Serie |
|---|---|
| `INF-ZAS-FAS-001.md` | Informe Fase 1 — Diagnóstico inicial |
| `INF-ZAS-FAS-002.md` | Informe Fase 2 — Diseño conceptual |
| `INF-ZAS-FAS-003.md` | Informe Fase 3 — Ejecución técnica |
| `INF-ZAS-FAS-003_Ejecucion_Tecnica.md` | Detalle de ejecución (9.9 KB) |
| `INF-ZAS-FAS-004.md` | Informe Fase 4 — Validación funcional |
| `Informe_3_Ejecucion_Tecnica.md` | Ejecución técnica (consolidado) |
| `Functional Validation Report.md` | Reporte de validación funcional (EN) |

### Propuesta Comercial

| Archivo | Descripción |
|---|---|
| `Technical_Commercial_Proposal.md` | Propuesta técnico-comercial |
| `Propuesta_Presentacion_Ejecutiva.md` | Presentación ejecutiva |
| `GEN-0037_Propuesta_3iMaker.md` | Propuesta 3iMaker |
| `Presupuesto_Inicial.md` | Presupuesto inicial |

### Diagramas e Imágenes

| Archivo | Descripción |
|---|---|
| `Diagrama_Entradas_P001.png` | Entradas de energía y cargas |
| `Diagrama_Salidas_P002.png` | Reacciones en apoyos |
| `Distribuccion_Fuerzas_P002.png` | Distribución de fuerzas |
| `Perfil_Movimiento_ZASCA.png` | Perfil de movimiento del carrusel |
| `Von_Mises_Distribution.png` | Mapa de esfuerzos Von Mises |
| `Safety_Factors_Heatmap.png` | Mapa de calor de factores de seguridad |

### Scripts Python Auxiliares

| Archivo | Descripción |
|---|---|
| `Simulacion_Desempeno_ZASCA.py` | Simulación de desempeño general |
| `Generate_Didactic_Diagrams.py` | Generación de diagramas didácticos |
| `Visualizacion_Fuerzas_Matplotlib.py` | Visualización de fuerzas con Matplotlib |
| `Visualizacion_Fuerzas_VPython.py` | Visualización 3D con VPython |

---

## 🔑 Resultados de Referencia (valores nominales)

> Calculados con los parámetros de diseño estándar. Los resultados exactos se obtienen ejecutando la aplicación Flask.

| Resultado | Valor típico | Estado |
|---|---|---|
| Esfuerzo Von Mises (parales) | ~18-25 MPa | ✅ SEGURO (< 250 MPa) |
| Deflexión máxima viga | < 9.3 mm | ✅ (< L/300) |
| Factor de seguridad global | ≥ 3.0 | ✅ |
| Frecuencia natural | >> f_excitación | ✅ Sin resonancia |
| Torque disponible / requerido | ≥ 3× | ✅ Motor sobredimensionado |

---

> Para integración completa con el PLC y HMI, ver [GUIA_INTEGRACION_AUTOMATIZADOR.md](../GUIA_INTEGRACION_AUTOMATIZADOR.md)

> Para el modelo 3D mecánico completo (Autodesk Inventor), planos de fabricación y archivo SAT de intercambio, ver [modelo-mecanico/README.md](../modelo-mecanico/README.md)
