# Modelo 3D Mecánico — Carrusel Vertical ZASCA

> **Software de diseño:** Autodesk Inventor Professional  
> **Formato de intercambio:** ACIS SAT (`.sat`)  
> **Última actualización:** Marzo 2026

---

## 📋 Descripción General

Este directorio contiene la documentación y archivos de intercambio del **modelo 3D mecánico completo** del carrusel vertical tipo Paternoster ZASCA, diseñado íntegramente en **Autodesk Inventor Professional**.

El modelo representa el **diseño detallado de ingeniería mecánica** del sistema de almacenamiento rotativo vertical de 20 bandejas, incluyendo todos los componentes estructurales, de transmisión, guiado y sujeción necesarios para su fabricación e implementación.

### Funcionalidad del Modelo

El modelo 3D cumple las siguientes funciones dentro del proyecto ZASCA:

| Función | Descripción |
|---|---|
| **Diseño paramétrico** | Geometría completamente parametrizada que permite ajustar dimensiones clave (altura entre ejes, ancho, profundidad) manteniendo las relaciones de ensamble |
| **Verificación de interferencias** | Detección de colisiones entre componentes móviles (cadena, bandejas, seguidores) y estructura fija (frame, rieles guía) |
| **Generación de planos** | Planos de fabricación 2D (P-001, P-002) exportados directamente desde el ensamble 3D con acotado completo |
| **Cálculo de masas e inercias** | Propiedades físicas (masa, centro de gravedad, momentos de inercia) utilizadas como entrada para el análisis estructural FEA |
| **Interoperabilidad CAD** | Exportación en formato SAT para importación en SolidWorks, Fusion 360, FreeCAD, CATIA, NX y otros sistemas CAD |
| **Base para simulación** | Geometría de referencia para el gemelo digital (Three.js) y las simulaciones de transmisión |

---

## 🔩 Jerarquía de Ensambles

El ensamble principal `Conjunto_Carrusell_v1.iam` integra los siguientes sub-ensambles y componentes:

```
Conjunto_Carrusell_v1.iam                    ← Ensamble maestro completo
│
├── Sistema Estructural.iam                  ← Frame estructural completo
│   ├── Frame principal.iam                  ← Estructura principal (parales + travesaños)
│   │   └── CSN EN 10219-2 - 100×50×6.ipt   ← Perfil DIN canal
│   ├── Farme_lateral_pata.iam               ← Patas laterales de soporte
│   ├── Frame_Lateral.ipt                    ← Paneles laterales
│   └── Soporte_transversal.iam              ← Refuerzos transversales
│
├── Cadena.iam                               ← Sistema de transmisión por cadena
│   ├── ESLABONES 20A-1/                     ← Cadena DIN ISO 20A-1 (paso 1.25")
│   │   └── simple_roller_chains_*.ipt       ← Eslabones interior/exterior
│   ├── Roller Chain1.ipt                    ← Rodillo de cadena principal
│   └── Roller Chain2.ipt                    ← Rodillo de cadena secundario
│
├── Conjunto Sprocket Definitivo.iam         ← Sprocket de transmisión
│   └── Design Accelerator/                  ← Componentes generados por Inventor
│
├── Eje_Sprocket.iam                         ← Eje con sprocket montado
│   ├── Eje transmision principal.ipt        ← Eje principal Ø50.8mm (2"), SAE 1045
│   ├── Eje-Superior.ipt                     ← Eje superior de retorno
│   └── Eje-Acople.ipt                       ← Eje de acople motor-reductor
│
├── Seguidor_Completo.iam                    ← Sistema seguidor de bandeja
│   ├── placa_seguidor.ipt                   ← Placa de seguidor
│   ├── DESLIZADOR/ (rbc2.iam)              ← Rodamiento lineal / deslizador
│   └── BOCIN EJE/ (00088613.iam)           ← Bocín de soporte del eje
│
├── bandeja_Completa.iam                     ← Bandeja de almacenamiento
│   ├── Bandeja.ipt                          ← Cuerpo principal de bandeja
│   ├── Marco.ipt                            ← Marco perimetral
│   └── Separador_U.ipt                      ← Separadores internos
│
├── Componentes de Sujeción y Guiado
│   ├── Anillo_Sujecion_Superior.ipt         ← Anillo de sujeción superior
│   ├── Anillo_sujeccion.ipt                 ← Anillo de sujeción inferior
│   ├── Riel Guia.ipt                        ← Riel guía recto (vertical)
│   ├── Riel_guia_2541mm.ipt                 ← Riel guía largo (2.541 mm)
│   ├── Riel_curvo_guia.ipt                  ← Riel guía curvo (transición superior/inferior)
│   ├── Placa_Anclaje_Superior.ipt           ← Placa de anclaje superior
│   ├── Placa_Fijadora_Intermedia.ipt        ← Placa fijadora intermedia
│   ├── Platina_Anclaje.ipt                  ← Platina de anclaje a estructura
│   ├── Platina_Amarre.ipt                   ← Platina de amarre cadena-bandeja
│   ├── Platina sostenimiento.ipt            ← Platina de sostenimiento
│   ├── Soporte en U.ipt                     ← Soporte tipo U
│   ├── Sujecion_01.ipt / Sujecion_02.ipt   ← Elementos de sujeción
│   └── Sistema_Nivelador.ipt               ← Sistema de nivelación
│
└── Motor y Reductor
    └── sk_672_1_-_132mh_4_7_5kw.stp         ← Motor NORD SK 672.1, 7.5 kW (STEP)
```

---

## 📐 Especificaciones de Diseño

### Dimensiones Generales del Carrusel

| Parámetro | Valor |
|---|---|
| **Altura entre ejes** | 2.779 mm (2.778 mm nominal) |
| **Ancho total** | 2.443 mm |
| **Profundidad** | 946 mm |
| **Cantidad de bandejas** | 20 |
| **Carga viva por bandeja** | 1.200 N (~120 kg) |
| **Peso propio por bandeja** | ~400 N (~40 kg) |
| **Carga total de diseño** | 32 kN |

### Materiales Principales

| Componente | Material | Especificación |
|---|---|---|
| Estructura (parales, travesaños) | Acero estructural | ASTM A36 (Sy = 250 MPa) |
| Perfil estructural | Canal | DIN EN 10219-2, 100×50×6.3 mm |
| Eje principal de transmisión | Acero al carbono | SAE 1045 (Sy torsión = 306 MPa) |
| Bandejas | Lámina de acero | Calibre según diseño |
| Cadena de transmisión | Acero aleado | DIN ISO 20A-1 (paso 1.25") |

### Sistema de Transmisión

| Parámetro | Valor |
|---|---|
| **Motor** | NORD SK 672.1, 7.5 kW (~10 HP) |
| **Reductor** | Corona sin fin, relación 40:1 (η = 0.85) |
| **Cadena** | DIN ISO 20A-1, paso 1.25" (31.75 mm) |
| **Relación cadena** | 3:1 |
| **Sprocket** | 25 dientes |
| **Eje principal** | Ø50.8 mm (2"), SAE 1045 |
| **Velocidad lineal** | ~0.15 m/s |
| **RPM eje principal** | ~14.58 RPM |

---

## 📄 Planos de Ingeniería

Los planos de fabricación están disponibles en formato PDF en este directorio:

| Plano | Archivo | Contenido |
|---|---|---|
| **P-001** | [P-001.pdf](P-001.pdf) | Plano general del conjunto — vistas principales, acotado general, lista de materiales |
| **P-002** | [P-002.pdf](P-002.pdf) | Plano de detalle — cortes, secciones, detalles constructivos, tolerancias |

> Los planos fuente en formato Inventor (`.idw`) y AutoCAD (`.dwg`) se encuentran en el proyecto original de Inventor.

---

## 💾 Archivo SAT — Formato de Intercambio Universal

### ¿Qué es el archivo SAT?

El archivo `Conjunto_Carrusell_v1.sat` es una exportación del ensamble completo en formato **ACIS SAT** (Standard ACIS Text), un estándar de la industria para intercambio de geometría 3D sólida entre diferentes sistemas CAD.

| Propiedad | Valor |
|---|---|
| **Archivo** | `Conjunto_Carrusell_v1.sat` |
| **Formato** | ACIS SAT (texto) |
| **Tamaño** | ~810 MB |
| **Contenido** | Ensamble completo con todas las piezas y restricciones geométricas |

> ⚠️ **Nota:** Debido a su tamaño (~810 MB), este archivo **no se incluye directamente en el repositorio Git**. Puede obtenerse del directorio fuente del proyecto de Inventor o solicitarlo al equipo de ingeniería.

### Software Compatible

El archivo SAT puede importarse en los siguientes sistemas CAD/CAE:

| Software | Versión mínima | Método de importación |
|---|---|---|
| **SolidWorks** | 2018+ | Archivo → Abrir → Tipo: SAT |
| **Autodesk Fusion 360** | Cualquiera | Upload → Seleccionar .sat |
| **Autodesk Inventor** | 2018+ | Archivo → Abrir → Tipo: SAT |
| **FreeCAD** | 0.19+ | Archivo → Importar → STEP/SAT |
| **CATIA V5** | R21+ | Archivo → Abrir → Tipo: SAT |
| **Siemens NX** | 12+ | Archivo → Importar → SAT |
| **PTC Creo** | 4.0+ | Archivo → Abrir → Tipo: SAT |
| **OnShape** | Web | Importar documento → .sat |

### Instrucciones de Importación

1. **Descargar** el archivo `Conjunto_Carrusell_v1.sat` del directorio fuente del proyecto
2. **Abrir** su software CAD de preferencia
3. **Importar** usando la función de apertura/importación de archivos SAT/ACIS
4. **Verificar** la escala del modelo (unidades: milímetros)
5. **Revisar** que todos los cuerpos sólidos se hayan importado correctamente

> 💡 **Tip:** Si su software presenta problemas con el ensamble completo, intente importar con la opción "Cuerpos individuales" o "Sin restricciones" para reducir la carga de procesamiento.

---

## 🔗 Referencias Cruzadas

| Recurso | Ubicación |
|---|---|
| Análisis estructural FEA | [docs/Analisis_Estructural_ZASCA.py](../docs/Analisis_Estructural_ZASCA.py) |
| Modelo cinemático y físico | [docs/kinematics_and_physics_model.md](../docs/kinematics_and_physics_model.md) |
| Gemelo digital 3D (Three.js) | [simulator-app/](../simulator-app/) |
| Especificaciones de hardware | [docs/hardware_specification.md](../docs/hardware_specification.md) |
| README principal del proyecto | [README.md](../README.md) |

---

## 📁 Estructura del Directorio

```
modelo-mecanico/
├── README.md              ← Este archivo
├── P-001.pdf              ← Plano general del conjunto
└── P-002.pdf              ← Plano de detalle
```

> **Proyecto fuente de Inventor:** El proyecto completo de Autodesk Inventor (archivos `.iam`, `.ipt`, `.ipj`, `.idw`) se gestiona de forma independiente debido a su tamaño (~1 GB+). Consultar con el equipo de ingeniería para acceso al proyecto nativo.
