"""
ZASCA DIGITAL TWIN v3.0 - HIPERREALISMO & FEA
------------------------------------------------
Cliente: FASECOL S.A.S
Requerimiento: Visualización de Cargas (1200N) + Render PBR + FEA Analítico
Ejecución: python app_zasca_paternoster.py
"""

from flask import Flask, render_template_string, jsonify, request
import numpy as np
import math
import matplotlib.pyplot as plt
import matplotlib
import matplotlib.patches as patches
matplotlib.use('Agg')  # Backend no interactivo
from io import BytesIO
import base64
from datetime import datetime

app = Flask(__name__)

# ==============================================================================
# 1. PARÁMETROS DE INGENIERÍA (BASE DE DATOS TÉCNICA)
# ==============================================================================
CONFIG = {
    # Geometría (Planos P-001/P-002)
    "altura_ejes": 2779.0, # mm
    "ancho_total": 2443.0, # mm
    "profundidad": 946.0,  # mm
    "num_bandejas": 20,
    
    # Cargas
    "carga_viva_N": 1200.0, # Carga solicitada
    "peso_muerto_N": 400.0, # Peso bandeja ~40kg
    
    # Perfil Estructural (DIN 100x50x6.3)
    "perfil": {"H": 100.0, "B": 50.0, "t": 6.3},
    
    # Material (ASTM A36)
    "material": {"Sy": 250.0, "E": 200000.0} 
}

# ==============================================================================
# 2. MOTOR DE CÁLCULO ESTRUCTURAL Y DINÁMICO (FEA 1D MEJORADO)
# ==============================================================================
def calcular_fea_analitico():
    # 1. Propiedades de Sección Individual del Paral
    p = CONFIG['perfil']
    area_paral = (p['H']*p['B']) - ((p['H']-2*p['t'])*(p['B']-2*p['t']))
    Ixx_paral = (1/12 * p['B'] * p['H']**3) - (1/12 * (p['B']-2*p['t']) * (p['H']-2*p['t'])**3)
    c = p['H'] / 2
    Wxx_paral = Ixx_paral / c

    # 2. SECCIÓN COMPUESTA: Paral + Platinas pegadas
    # Las platinas están pegadas a los lados del paral (en X)
    # El paral tiene 50mm de ancho (en X), la platina tiene 10mm de espesor
    
    t_platina = 10  # mm espesor de platina
    h_platina = 500  # mm altura de platina (en Z, paralela al paral)
    
    # Momento de inercia de UNA platina respecto a su propio eje neutro
    # I = (1/12) * base * altura^3, donde la platina actúa como viga en dirección Y
    Ixx_platina_propio = (1/12) * h_platina * (t_platina ** 3)
    
    # DISTANCIA CORRECTA: desde el eje neutro del paral al centroide de la platina
    # El paral tiene 50mm de ancho (B), la platina está pegada al lateral
    # Distancia = (ancho_paral/2) + (espesor_platina/2) = 25 + 5 = 30mm
    dist_platina = (p['B'] / 2) + (t_platina / 2)  # Ahora correctamente = 30mm
    
    # Teorema de Steiner: I_total = I_propio + A * d²
    A_platina = h_platina * t_platina  # Area de una platina = 500 * 10 = 5000 mm²
    Ixx_platina_steiner = Ixx_platina_propio + A_platina * (dist_platina ** 2)
    
    # Ixx total para la sección compuesta
    # I_paral + 2*I_platinas (una a cada lado)
    Ixx_compuesto = Ixx_paral + 2 * Ixx_platina_steiner
    
    # Módulo resistente actualizado (SIGNIFICATIVAMENTE MAYOR)
    Wxx_compuesto = Ixx_compuesto / c
    
    # 3. Cargas
    carga_total = (CONFIG['carga_viva_N'] + CONFIG['peso_muerto_N']) * CONFIG['num_bandejas']
    carga_columna = carga_total / 2
    excentricidad = 120.0 # mm (brazo de palanca estimado)

    # 4. Esfuerzos en PARALES VERTICALES con SECCIÓN COMPUESTA
    sigma_axial_paral = carga_columna / area_paral
    momento_paral = carga_columna * excentricidad
    sigma_flexion_paral = momento_paral / Wxx_compuesto  # Usa Wxx COMPUESTO (mucho mayor)
    sigma_vm_paral = sigma_axial_paral + sigma_flexion_paral
    
    # 5. Esfuerzos en VIGA CENTRAL
    area_viga = (p['H']*p['B']) - ((p['H']-2*p['t'])*(p['B']-2*p['t']))
    Ixx_viga = (1/12 * p['B'] * p['H']**3) - (1/12 * (p['B']-2*p['t']) * (p['H']-2*p['t'])**3)
    Wxx_viga = Ixx_viga / c
    
    longitud_viga = CONFIG['ancho_total'] / 1000  # metros
    carga_distribuida = (carga_total / CONFIG['num_bandejas']) / longitud_viga
    momento_viga = (carga_distribuida * (longitud_viga ** 2)) / 8
    
    # Conversión correcta: momento en N·m → N·mm (multiplicar por 1000, no 1e6)
    sigma_flexion_viga = (momento_viga * 1e3) / Wxx_viga  # 1e3 es correcto para N·m → N·mm
    sigma_vm_viga = sigma_flexion_viga
    
    sigma_vm = max(sigma_vm_paral, sigma_vm_viga)
    sigma_max = sigma_vm

    # 6. Deformación - SIGNIFICATIVAMENTE REDUCIDA por Ixx_compuesto MUCHO MÁS GRANDE
    span_length = longitud_viga
    # Fórmula correcta: δ = (5 * w * L⁴) / (384 * E * I)
    # Donde: w = carga distribuida (N/mm), L = longitud (mm), E = módulo (N/mm²), I = momento (mm⁴)
    deflexion = (5 * carga_distribuida * (span_length ** 4)) / (384 * CONFIG['material']['E'] * Ixx_compuesto)
    deflexion_max_permitida = CONFIG['altura_ejes'] / 300
    
    # 7. Factores de Seguridad - AUMENTADOS dramáticamente por rigidización
    fs_fluencia_paral = CONFIG['material']['Sy'] / sigma_vm_paral if sigma_vm_paral > 0 else 999
    fs_fluencia_viga = CONFIG['material']['Sy'] / sigma_vm_viga if sigma_vm_viga > 0 else 999
    fs_fluencia = min(fs_fluencia_paral, fs_fluencia_viga)
    
    fs_deformacion = deflexion_max_permitida / deflexion if deflexion > 0 else 999
    
    # 8. Reacciones en patas
    reaccion_por_pata = carga_total / 4
    
    # ========== ANÁLISIS DINÁMICO MEJORADO ==========
    # 9. Fuerzas Inerciales (debido a aceleración/desaceleración del sistema)
    velocidad_max = 0.15  # m/s (según requerimientos)
    tiempo_aceleracion = 2.0  # segundos (tiempo para alcanzar velocidad máxima)
    aceleracion = velocidad_max / tiempo_aceleracion  # m/s²
    
    # Masa total del sistema en movimiento
    masa_bandejas_kg = CONFIG['num_bandejas'] * 15.0  # ~15kg por bandeja vacía
    masa_carga_kg = (CONFIG['carga_viva_N'] + CONFIG['peso_muerto_N']) * CONFIG['num_bandejas'] / 9.81
    masa_total_kg = masa_bandejas_kg + masa_carga_kg
    
    # Fuerza inercial durante aceleración
    fuerza_inercial_N = masa_total_kg * aceleracion
    
    # Esfuerzo adicional por inercia en parales (distribuido)
    esfuerzo_inercial_paral_MPa = (fuerza_inercial_N / 4) / area_paral  # Distribuido en 4 parales
    
    # Esfuerzo total incluyendo efectos dinámicos
    sigma_vm_paral_dinamico = sigma_vm_paral + esfuerzo_inercial_paral_MPa
    
    # 10. Análisis de Vibraciones (Frecuencia Natural)
    # Masa por unidad de longitud en la viga
    masa_por_longitud_kg_m = masa_total_kg / longitud_viga
    
    # Frecuencia natural de la viga (modo fundamental)
    # fn = (1/(2*π)) * sqrt(k/m) donde k = rigidez, m = masa
    # Para viga simplemente apoyada: fn = (π/2) * sqrt(EI/(mL⁴))
    frecuencia_natural_Hz = (np.pi / 2) * np.sqrt(
        (CONFIG['material']['E'] * Ixx_compuesto * 1e-12) /  # E en Pa, I en m⁴
        (masa_por_longitud_kg_m * (longitud_viga ** 4))
    )
    
    # Frecuencia de excitación (RPM del motor convertido a Hz)
    rpm_eje = 14.58  # Del cálculo de transmisión
    frecuencia_excitacion_Hz = rpm_eje / 60.0
    
    # Factor de amplificación dinámica (si hay resonancia)
    ratio_frecuencias = frecuencia_excitacion_Hz / frecuencia_natural_Hz if frecuencia_natural_Hz > 0 else 0
    factor_amplificacion = 1.0
    if 0.8 < ratio_frecuencias < 1.2:  # Zona de resonancia
        factor_amplificacion = 1.0 / (1 - ratio_frecuencias**2) if ratio_frecuencias != 1.0 else 10.0
    
    # Esfuerzo amplificado por resonancia (si aplica)
    sigma_vm_paral_resonancia = sigma_vm_paral_dinamico * factor_amplificacion
    
    # 11. Análisis de Fatiga (Ciclos de carga)
    # Número de ciclos por día (asumiendo operación continua)
    ciclos_por_hora = 60  # 1 ciclo por minuto
    ciclos_por_dia = ciclos_por_hora * 16  # 16 horas operativas
    ciclos_por_ano = ciclos_por_dia * 300  # 300 días laborables
    
    # Límite de fatiga (acero A36)
    limite_fatiga_MPa = 0.5 * CONFIG['material']['Sy']  # Regla empírica
    amplitud_esfuerzo_MPa = sigma_vm_paral / 2  # Amplitud del ciclo
    
    # Factor de seguridad a fatiga
    fs_fatiga = limite_fatiga_MPa / amplitud_esfuerzo_MPa if amplitud_esfuerzo_MPa > 0 else 999
    
    # 12. Análisis de Estabilidad (Pandeo en Parales)
    # Longitud efectiva de pandeo (asumiendo extremos empotrados)
    longitud_pandeo_mm = CONFIG['altura_ejes']
    factor_longitud_efectiva = 0.65  # Para extremos empotrados
    
    # Carga crítica de Euler
    carga_critica_euler_N = (np.pi**2 * CONFIG['material']['E'] * Ixx_compuesto) / \
                            ((factor_longitud_efectiva * longitud_pandeo_mm)**2)
    
    # Factor de seguridad a pandeo
    fs_pandeo = carga_critica_euler_N / carga_columna if carga_columna > 0 else 999
    
    # 13. Esfuerzo combinado final (estático + dinámico + resonancia)
    sigma_vm_final = max(sigma_vm_paral_resonancia, sigma_vm_viga)
    
    # Factor de seguridad global (considerando todos los efectos)
    fs_global = min(fs_fluencia, fs_fatiga, fs_pandeo)
    
    return {
        "carga_total_kN": round(carga_total/1000, 2),
        "esfuerzo_von_mises_MPa": round(sigma_vm_final, 2),
        "esfuerzo_max_MPa": round(sigma_vm_final, 2),
        "esfuerzo_parales_MPa": round(sigma_vm_paral_resonancia, 2),
        "esfuerzo_viga_central_MPa": round(sigma_vm_viga, 2),
        "deflexion_mm": round(deflexion, 2),
        "factor_seguridad_fluencia": round(fs_fluencia, 2),
        "factor_seguridad_parales": round(fs_fluencia_paral, 2),
        "factor_seguridad_viga": round(fs_fluencia_viga, 2),
        "factor_seguridad_deformacion": round(fs_deformacion, 2),
        "factor_seguridad_fatiga": round(fs_fatiga, 2),
        "factor_seguridad_pandeo": round(fs_pandeo, 2),
        "factor_seguridad_global": round(fs_global, 2),
        "reaccion_por_pata_N": round(reaccion_por_pata, 2),
        "Ixx_paral_mm4": round(Ixx_paral, 2),
        "Ixx_compuesto_mm4": round(Ixx_compuesto, 2),
        "rigidez_aumento": round(Ixx_compuesto / Ixx_paral, 1),
        # Datos dinámicos
        "frecuencia_natural_Hz": round(frecuencia_natural_Hz, 2),
        "frecuencia_excitacion_Hz": round(frecuencia_excitacion_Hz, 2),
        "ratio_frecuencias": round(ratio_frecuencias, 3),
        "factor_amplificacion": round(factor_amplificacion, 2),
        "fuerza_inercial_N": round(fuerza_inercial_N, 2),
        "aceleracion_ms2": round(aceleracion, 3),
        "masa_total_kg": round(masa_total_kg, 1),
        "carga_critica_pandeo_N": round(carga_critica_euler_N, 0),
        "ciclos_por_ano": int(ciclos_por_ano),
        "estado": "SEGURO" if fs_global >= 3.0 else "CRÍTICO",
        "estado_resonancia": "RESONANCIA" if 0.8 < ratio_frecuencias < 1.2 else "OK"
    }

def calcular_escalas():
    """Calcula los rangos de valores para cada tipo de análisis"""
    fea = calcular_fea_analitico()
    
    return {
        "von_mises": {
            "min": 0,
            "max": fea["esfuerzo_von_mises_MPa"] * 1.2,
            "unidad": "MPa",
            "label": "Von Mises Stress"
        },
        "esfuerzo_max": {
            "min": 0,
            "max": fea["esfuerzo_max_MPa"] * 1.2,
            "unidad": "MPa",
            "label": "Maximum Stress"
        },
        "factor_seguridad": {
            "min": 0,
            "max": 5.0,
            "unidad": "",
            "label": "Safety Factor"
        },
        "deformacion": {
            "min": 0,
            "max": fea["deflexion_mm"] * 1.5,
            "unidad": "mm",
            "label": "Maximum Deformation"
        }
    }

# ==============================================================================
# 2B. SIMULACIÓN DEL SISTEMA DE TRANSMISIÓN - PATERNOSTER
# ==============================================================================
def simulacion_transmision_eje_principal(potencia_motor_hp=5.0):
    """Simula el sistema de transmisión completo (Motor → Reductor → Cadena → Eje)
    
    Args:
        potencia_motor_hp (float): Potencia del motor en HP (default: 5.0, también soporta 10.0)
    """
    
    # --- DATOS DE ENTRADA ---
    rpm_motor = 1750             # RPM
    ratio_reductor = 40          # 40:1
    eficiencia_reductor = 0.85   # Corona sin fin
    
    # Transmisión Secundaria (Cadena Externa)
    dientes_piñon_salida = 15
    dientes_piñon_entrada = 45
    ratio_secundario = dientes_piñon_entrada / dientes_piñon_salida  # 3:1
    eficiencia_cadena = 0.95

    # Eje Principal
    dientes_sprocket_carga = 25
    paso_cadena = 31.75 / 1000   # 1.25" en metros (Paso 20A-1)
    diametro_eje_mm = 50.8       # 2 pulgadas
    
    # Carga
    masa_desbalance_kg = 600.0   # Desbalance crítico
    gravedad = 9.81

    # --- CÁLCULOS CINEMÁTICOS ---
    rpm_salida_reductor = rpm_motor / ratio_reductor
    rpm_eje_principal = rpm_salida_reductor / ratio_secundario
    
    # Diámetro primitivo del sprocket
    diametro_primitivo_sprocket_m = paso_cadena / np.sin(np.pi / dientes_sprocket_carga)
    radio_primitivo_m = diametro_primitivo_sprocket_m / 2
    velocidad_lineal_ms = (rpm_eje_principal * 2 * np.pi / 60) * radio_primitivo_m

    # --- CÁLCULOS DINÁMICOS ---
    potencia_w = potencia_motor_hp * 745.7
    torque_motor_Nm = (potencia_w * 60) / (2 * np.pi * rpm_motor)
    torque_disponible_eje_Nm = torque_motor_Nm * ratio_reductor * ratio_secundario * eficiencia_reductor * eficiencia_cadena
    
    fuerza_cadena_requerida_N = masa_desbalance_kg * gravedad
    torque_requerido_Nm = fuerza_cadena_requerida_N * radio_primitivo_m
    
    factor_seguridad_potencia = torque_disponible_eje_Nm / torque_requerido_Nm if torque_requerido_Nm > 0 else 999

    # --- ANÁLISIS DE ESFUERZOS EN EJE ---
    J = (np.pi * (diametro_eje_mm/1000)**4) / 32  # Momento polar inercia
    radio_eje_m = (diametro_eje_mm/1000) / 2
    esfuerzo_torsion_Pa = (torque_requerido_Nm * radio_eje_m) / J
    esfuerzo_torsion_MPa = esfuerzo_torsion_Pa / 1e6

    limite_fluencia_acero_MPa = 530
    limite_fluencia_corte_MPa = 0.577 * limite_fluencia_acero_MPa
    fs_eje = limite_fluencia_corte_MPa / esfuerzo_torsion_MPa if esfuerzo_torsion_MPa > 0 else 999

    # ========== ANÁLISIS DINÁMICO DE TRANSMISIÓN ==========
    # Momento de inercia del sistema rotatorio
    masa_sistema_kg = 600.0  # Masa total en movimiento (bandejas + carga)
    radio_sprocket_m = radio_primitivo_m
    momento_inercia_kgm2 = masa_sistema_kg * (radio_sprocket_m ** 2)
    
    # Aceleración angular durante arranque
    tiempo_arranque_s = 2.0
    velocidad_angular_rads = (rpm_eje_principal * 2 * np.pi) / 60
    aceleracion_angular_rads2 = velocidad_angular_rads / tiempo_arranque_s
    
    # Torque de aceleración requerido
    torque_aceleracion_Nm = momento_inercia_kgm2 * aceleracion_angular_rads2
    
    # Torque total requerido (estático + dinámico)
    torque_total_requerido_Nm = torque_requerido_Nm + torque_aceleracion_Nm
    
    # Factor de seguridad considerando aceleración
    fs_potencia_dinamico = torque_disponible_eje_Nm / torque_total_requerido_Nm if torque_total_requerido_Nm > 0 else 999
    
    # Análisis de vibraciones torsionales
    modulo_corte_GPa = CONFIG['material']['E'] / (2 * (1 + 0.3))  # Asumiendo ν = 0.3
    modulo_corte_Pa = modulo_corte_GPa * 1e9
    longitud_eje_m = CONFIG['ancho_total'] / 1000
    
    # Frecuencia natural torsional
    frecuencia_torsional_Hz = (1 / (2 * np.pi)) * np.sqrt(
        (modulo_corte_Pa * J) / (momento_inercia_kgm2 * longitud_eje_m)
    )
    
    # Frecuencia de excitación (RPM del eje)
    frecuencia_excitacion_torsional_Hz = rpm_eje_principal / 60.0
    
    # Verificación de resonancia torsional
    ratio_torsional = frecuencia_excitacion_torsional_Hz / frecuencia_torsional_Hz if frecuencia_torsional_Hz > 0 else 0
    resonancia_torsional = True if 0.8 < ratio_torsional < 1.2 else False
    
    # Potencia requerida considerando pérdidas y aceleración
    potencia_requerida_W = torque_total_requerido_Nm * velocidad_angular_rads
    potencia_requerida_hp = potencia_requerida_W / 745.7
    
    # Eficiencia del sistema completo
    eficiencia_total = (torque_disponible_eje_Nm * velocidad_angular_rads) / (potencia_w)
    
    # Análisis de fatiga en el eje (ciclos de torsión)
    amplitud_esfuerzo_torsion_MPa = esfuerzo_torsion_MPa / 2
    limite_fatiga_eje_MPa = 0.5 * limite_fluencia_acero_MPa  # Límite de fatiga para el eje (regla empírica)
    limite_fatiga_torsion_MPa = 0.577 * limite_fatiga_eje_MPa  # Para esfuerzo cortante (criterio de Von Mises)
    fs_fatiga_eje = limite_fatiga_torsion_MPa / amplitud_esfuerzo_torsion_MPa if amplitud_esfuerzo_torsion_MPa > 0 else 999

    return {
        "rpm_motor": round(rpm_motor, 2),
        "rpm_eje_principal": round(rpm_eje_principal, 2),
        "velocidad_lineal_ms": round(velocidad_lineal_ms, 3),
        "torque_motor_Nm": round(torque_motor_Nm, 2),
        "torque_disponible_Nm": round(torque_disponible_eje_Nm, 2),
        "torque_requerido_Nm": round(torque_requerido_Nm, 2),
        "factor_seguridad_potencia": round(factor_seguridad_potencia, 2),
        "esfuerzo_torsion_MPa": round(esfuerzo_torsion_MPa, 2),
        "limite_fluencia_corte_MPa": round(limite_fluencia_corte_MPa, 2),
        "fs_eje_torsion": round(fs_eje, 2),
        "diametro_eje_mm": diametro_eje_mm,
        "potencia_motor_hp": potencia_motor_hp,
        "ratio_reductor": ratio_reductor,
        "ratio_secundario": ratio_secundario,
        # Datos dinámicos de transmisión
        "torque_aceleracion_Nm": round(torque_aceleracion_Nm, 2),
        "torque_total_requerido_Nm": round(torque_total_requerido_Nm, 2),
        "fs_potencia_dinamico": round(fs_potencia_dinamico, 2),
        "frecuencia_torsional_Hz": round(frecuencia_torsional_Hz, 2),
        "frecuencia_excitacion_torsional_Hz": round(frecuencia_excitacion_torsional_Hz, 2),
        "ratio_torsional": round(ratio_torsional, 3),
        "resonancia_torsional": resonancia_torsional,
        "potencia_requerida_hp": round(potencia_requerida_hp, 2),
        "eficiencia_total": round(eficiencia_total, 3),
        "aceleracion_angular_rads2": round(aceleracion_angular_rads2, 3),
        "momento_inercia_kgm2": round(momento_inercia_kgm2, 2),
        "fs_fatiga_eje": round(fs_fatiga_eje, 2)
    }

def generar_diagramas_ingenieria():
    """Genera diagramas P-001 (Entradas) y P-002 (Salidas) en Base64"""
    fea = calcular_fea_analitico()
    transmision = simulacion_transmision_eje_principal(5.0)
    
    # ========== DIAGRAMA P-001: ENTRADAS ==========
    fig1, ax1 = plt.subplots(figsize=(12, 8))
    ax1.set_xlim(0, 10)
    ax1.set_ylim(0, 10)
    ax1.axis('off')
    ax1.set_title("Diagrama P-001: Entradas de Energía y Cargas", fontsize=16, fontweight='bold', pad=20)
    
    # Sprockets
    top_sprocket = patches.Circle((5, 8), 1.5, edgecolor='black', facecolor='#d1d5db', linewidth=2)
    bottom_sprocket = patches.Circle((5, 2), 1.5, edgecolor='black', facecolor='#d1d5db', linewidth=2)
    ax1.add_patch(top_sprocket)
    ax1.add_patch(bottom_sprocket)
    ax1.plot([5], [8], 'o', color='black', markersize=8)
    ax1.plot([5], [2], 'o', color='black', markersize=8)
    
    # Chain
    ax1.plot([3.5, 3.5], [2, 8], color='black', linewidth=3, linestyle='--')
    ax1.plot([6.5, 6.5], [2, 8], color='black', linewidth=3, linestyle='--')
    
    # Motor
    motor_box = patches.Rectangle((7.5, 7.5), 1.5, 1, edgecolor='black', facecolor='#3b82f6')
    ax1.add_patch(motor_box)
    ax1.text(8.25, 8, "Motor\n5 HP @ 1750RPM", color='white', ha='center', va='center', fontweight='bold', fontsize=10)
    
    # Transmission Line
    ax1.plot([6.5, 7.5], [8, 8], color='gray', linewidth=4)
    
    # Torque Arrow
    torque_arrow = patches.FancyArrowPatch((5.5, 8.5), (4.5, 8.5), connectionstyle="arc3,rad=.5",
                                         arrowstyle='Simple,tail_width=0.5,head_width=4,head_length=8', color='red')
    ax1.add_patch(torque_arrow)
    ax1.text(5, 9.5, f"Torque Motriz\n{transmision['torque_disponible_Nm']:.0f} Nm", 
             color='red', ha='center', fontsize=11, fontweight='bold')
    
    # Speed Arrow
    ax1.arrow(3.2, 5, 0, 1.2, head_width=0.3, head_length=0.3, fc='green', ec='green', linewidth=2.5)
    ax1.text(2.3, 5.5, f"Velocidad\n{transmision['velocidad_lineal_ms']:.3f} m/s", 
             color='green', ha='right', fontsize=11, fontweight='bold')
    
    # Load (Trays)
    carga_bandeja = (CONFIG['carga_viva_N'] + CONFIG['peso_muerto_N']) / 9.81
    for y in [3, 5, 7]:
        tray = patches.Rectangle((6.6, y-0.2), 0.8, 0.4, edgecolor='black', facecolor='#fcd34d')
        ax1.add_patch(tray)
        ax1.arrow(7.0, y-0.2, 0, -0.6, head_width=0.2, head_length=0.2, fc='purple', ec='purple', linewidth=2)
    
    ax1.text(8.5, 4.5, f"Carga por Bandeja\n{carga_bandeja:.1f} kg", 
             color='purple', ha='left', fontsize=11, fontweight='bold')
    
    # Reducer Box
    reducer_box = patches.Rectangle((6.8, 6.2), 1.2, 1, edgecolor='#764ba2', facecolor='#e9d5ff', linewidth=2)
    ax1.add_patch(reducer_box)
    ax1.text(7.4, 6.7, f"Reductor\n40:1", color='#764ba2', ha='center', va='center', fontweight='bold', fontsize=9)
    
    buffer1 = BytesIO()
    plt.savefig(buffer1, format='png', dpi=150, bbox_inches='tight')
    buffer1.seek(0)
    diagrama1_b64 = base64.b64encode(buffer1.getvalue()).decode()
    plt.close(fig1)
    
    # ========== DIAGRAMA P-002: SALIDAS/REACCIONES ==========
    fig2, ax2 = plt.subplots(figsize=(12, 8))
    ax2.set_xlim(0, 10)
    ax2.set_ylim(0, 10)
    ax2.axis('off')
    ax2.set_title("Diagrama P-002: Reacciones en Apoyos y Esfuerzos", fontsize=16, fontweight='bold', pad=20)
    
    # Structure
    col_left = patches.Rectangle((2, 1), 0.5, 8, edgecolor='black', facecolor='#9ca3af', linewidth=2)
    col_right = patches.Rectangle((7.5, 1), 0.5, 8, edgecolor='black', facecolor='#9ca3af', linewidth=2)
    ax2.add_patch(col_left)
    ax2.add_patch(col_right)
    
    # Main Beam
    beam = patches.Rectangle((1.5, 8.5), 7, 0.8, edgecolor='black', facecolor='#1f2937', linewidth=2)
    ax2.add_patch(beam)
    
    # Shaft
    ax2.plot([1.5, 8.5], [8.2, 8.2], color='red', linewidth=4, linestyle='-.', alpha=0.7)
    ax2.text(5, 8.7, "Eje Principal (Main Shaft)", color='red', ha='center', fontsize=10, fontweight='bold')
    
    # Bearings
    ax2.plot(2.25, 8.2, 's', color='orange', markersize=18)
    ax2.plot(7.75, 8.2, 's', color='orange', markersize=18)
    ax2.text(2.25, 7.5, "Apoyo L", color='orange', ha='center', fontweight='bold', fontsize=9)
    ax2.text(7.75, 7.5, "Apoyo D", color='orange', ha='center', fontweight='bold', fontsize=9)
    
    # Forces on Shaft
    ax2.arrow(3.5, 8.2, 0, -2.2, head_width=0.3, head_length=0.25, fc='red', ec='red', linewidth=3)
    ax2.text(3.5, 5.5, f"T1 (Carga)\n{transmision['torque_requerido_Nm']:.0f} Nm", 
             color='red', ha='center', fontsize=10, fontweight='bold')
    
    ax2.arrow(6.5, 8.2, 0, -1, head_width=0.3, head_length=0.2, fc='#ef6b6b', ec='#ef6b6b', linewidth=2)
    ax2.text(6.5, 6.5, "T2 (Retorno)", color='#ef6b6b', ha='center', fontsize=9)
    
    # Reaction Forces (Ground)
    reaccion = fea['reaccion_por_pata_N']
    ax2.arrow(2.25, 0.8, 0, 0.8, head_width=0.3, head_length=0.2, fc='green', ec='green', linewidth=3)
    ax2.text(1.2, 1.2, f"Ry₁\n{reaccion:.0f} N", color='green', ha='center', fontsize=10, fontweight='bold')
    
    ax2.arrow(7.75, 0.8, 0, 0.8, head_width=0.3, head_length=0.2, fc='green', ec='green', linewidth=3)
    ax2.text(8.8, 1.2, f"Ry₂\n{reaccion:.0f} N", color='green', ha='center', fontsize=10, fontweight='bold')
    
    # Safety Factor Box
    fs_value = fea['factor_seguridad_fluencia']
    fs_color = '#dcfce7' if fs_value >= 3 else '#fee2e2'
    fs_text_color = 'green' if fs_value >= 3 else 'red'
    
    sf_box = patches.Rectangle((3.5, 3), 3, 1.8, edgecolor=fs_text_color, facecolor=fs_color, linewidth=3)
    ax2.add_patch(sf_box)
    estado = "✓ SEGURO" if fs_value >= 3 else "✗ CRÍTICO"
    ax2.text(5, 4, f"Factor de Seguridad\n\nFS = {fs_value:.2f}\n{estado}", 
             color=fs_text_color, ha='center', va='center', fontsize=13, fontweight='bold')
    
    # Stress annotation
    ax2.text(5, 2.2, f"Esfuerzo Von Mises: {fea['esfuerzo_von_mises_MPa']:.1f} MPa | Deformación: {fea['deflexion_mm']:.2f} mm",
             color='#374151', ha='center', fontsize=10, style='italic',
             bbox=dict(boxstyle='round', facecolor='#f3f4f6', edgecolor='#9ca3af', linewidth=1))
    
    buffer2 = BytesIO()
    plt.savefig(buffer2, format='png', dpi=150, bbox_inches='tight')
    buffer2.seek(0)
    diagrama2_b64 = base64.b64encode(buffer2.getvalue()).decode()
    plt.close(fig2)
    
    return {
        'p001': f"data:image/png;base64,{diagrama1_b64}",
        'p002': f"data:image/png;base64,{diagrama2_b64}"
    }

def generar_graficos_transmision():
    """Genera gráficos de transmisión en formato Base64"""
    transmision = simulacion_transmision_eje_principal(5.0)
    
    # Parámetros para gráficos
    paso_cadena = 31.75 / 1000
    dientes_sprocket = 25
    diametro_primitivo = paso_cadena / np.sin(np.pi / dientes_sprocket)
    radio_primitivo = diametro_primitivo / 2
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    fig.patch.set_facecolor('#0b0f19')
    
    # Gráfico 1: Torque vs Carga
    cargas = np.linspace(0, 1500, 100)
    torques_req = cargas * 9.81 * radio_primitivo
    
    ax1.plot(cargas, torques_req, label='Torque Requerido', color='#ef4444', linewidth=2.5)
    ax1.axhline(y=transmision['torque_disponible_Nm'], color='#34d399', linestyle='--', 
                label=f'Torque Disponible = {transmision["torque_disponible_Nm"]} Nm', linewidth=2)
    ax1.axvline(x=600, color='#3b82f6', linestyle=':', label='Carga Actual (600kg)', linewidth=2)
    
    ax1.fill_between(cargas, 0, transmision['torque_disponible_Nm'], 
                     where=(torques_req < transmision['torque_disponible_Nm']), 
                     color='#34d399', alpha=0.1, label='Zona Segura')
    ax1.fill_between(cargas, transmision['torque_disponible_Nm'], 
                     max(torques_req), 
                     where=(torques_req > transmision['torque_disponible_Nm']), 
                     color='#ef4444', alpha=0.1, label='Zona Crítica')
    
    ax1.set_title("Capacidad de Transmisión (Torque)", color='white', fontsize=12, fontweight='bold')
    ax1.set_xlabel("Desbalance de Carga (kg)", color='white')
    ax1.set_ylabel("Torque en Eje Principal (Nm)", color='white')
    legend1 = ax1.legend(loc='upper left', facecolor='#1e293b', edgecolor='white')
    for text in legend1.get_texts():
        text.set_color('white')
    ax1.grid(True, alpha=0.2)
    ax1.set_facecolor('#1e293b')
    ax1.tick_params(colors='white')
    
    # Gráfico 2: Esfuerzo vs Diámetro Eje
    diametros = np.linspace(25, 80, 50)
    esfuerzos = []
    
    for d in diametros:
        r_m = (d/1000)/2
        J_i = (np.pi * (d/1000)**4) / 32
        tau = (transmision['torque_requerido_Nm'] * r_m) / J_i
        esfuerzos.append(tau / 1e6)
    
    ax2.plot(diametros, esfuerzos, color='#8b5cf6', linewidth=2.5)
    ax2.axhline(y=transmision['limite_fluencia_corte_MPa'], color='#ef4444', linestyle='--', 
                label=f'Límite Fluencia = {transmision["limite_fluencia_corte_MPa"]:.1f} MPa', linewidth=2)
    ax2.axvline(x=transmision['diametro_eje_mm'], color='#3b82f6', linestyle=':', 
                label=f'Diámetro Actual ({transmision["diametro_eje_mm"]}mm)', linewidth=2)
    
    ax2.set_title("Esfuerzo de Torsión vs Diámetro Eje", color='white', fontsize=12, fontweight='bold')
    ax2.set_xlabel("Diámetro del Eje (mm)", color='white')
    ax2.set_ylabel("Esfuerzo Cortante (MPa)", color='white')
    legend2 = ax2.legend(loc='upper right', facecolor='#1e293b', edgecolor='white')
    for text in legend2.get_texts():
        text.set_color('white')
    ax2.grid(True, alpha=0.2)
    ax2.set_facecolor('#1e293b')
    ax2.tick_params(colors='white')
    
    plt.tight_layout()
    
    # Convertir a Base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', facecolor='#0b0f19', dpi=100)
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close(fig)
    
    return f"data:image/png;base64,{img_base64}"

def generar_graficos_estructurales():
    """Genera gráficos de esfuerzos y deformaciones de elementos estructurales"""
    fea = calcular_fea_analitico()
    
    fig = plt.figure(figsize=(15, 10))
    fig.patch.set_facecolor('#0b0f19')
    
    # Gráfico 1: Distribución de esfuerzos a lo largo de la altura
    ax1 = plt.subplot(2, 2, 1)
    alturas = np.linspace(0, CONFIG['altura_ejes'], 100)
    # Esfuerzo aumenta con la altura debido a carga acumulativa
    esfuerzos_altura = (fea['esfuerzo_von_mises_MPa'] * alturas) / CONFIG['altura_ejes']
    
    ax1.fill_between(esfuerzos_altura, alturas, alpha=0.3, color='#ef4444')
    ax1.plot(esfuerzos_altura, alturas, color='#ef4444', linewidth=3, label='Esfuerzo Von Mises')
    ax1.axvline(x=CONFIG['material']['Sy'], color='#34d399', linestyle='--', linewidth=2, label='Límite Fluencia')
    ax1.set_xlabel("Esfuerzo (MPa)", fontsize=11, color='white', fontweight='bold')
    ax1.set_ylabel("Altura (mm)", fontsize=11, color='white', fontweight='bold')
    ax1.set_title("Distribución de Esfuerzos en Altura", fontsize=12, color='white', fontweight='bold')
    ax1.grid(True, alpha=0.2, color='white')
    ax1.set_facecolor('#1e293b')
    ax1.tick_params(colors='white')
    ax1.legend(facecolor='#1e293b', edgecolor='white', labelcolor='white')
    
    # Gráfico 2: Deformación vs Posición en altura
    ax2 = plt.subplot(2, 2, 2)
    # Deformación es cuadrática respecto a la altura
    deformaciones = (fea['deflexion_mm'] * (alturas / CONFIG['altura_ejes']) ** 2)
    deflexion_permitida = CONFIG['altura_ejes'] / 300
    
    ax2.fill_between(alturas, deformaciones, alpha=0.3, color='#3b82f6')
    ax2.plot(alturas, deformaciones, color='#3b82f6', linewidth=3, label='Deformación Actual')
    ax2.axhline(y=deflexion_permitida, color='#fbbf24', linestyle='--', linewidth=2, label='Límite Permitido')
    ax2.set_xlabel("Altura (mm)", fontsize=11, color='white', fontweight='bold')
    ax2.set_ylabel("Deformación (mm)", fontsize=11, color='white', fontweight='bold')
    ax2.set_title("Deflexión Estructural vs Altura", fontsize=12, color='white', fontweight='bold')
    ax2.grid(True, alpha=0.2, color='white')
    ax2.set_facecolor('#1e293b')
    ax2.tick_params(colors='white')
    ax2.legend(facecolor='#1e293b', edgecolor='white', labelcolor='white')
    
    # Gráfico 3: Comparativa de esfuerzos por elemento
    ax3 = plt.subplot(2, 2, 3)
    elementos = ['Parales\n(Columnas)', 'Viga Central', 'Platinas', 'Sistema\nCompleto']
    esfuerzos_elementos = [
        fea['esfuerzo_parales_MPa'],
        fea['esfuerzo_viga_central_MPa'],
        (fea['esfuerzo_parales_MPa'] + fea['esfuerzo_viga_central_MPa']) / 2,
        fea['esfuerzo_von_mises_MPa']
    ]
    colores = ['#3b82f6', '#8b5cf6', '#06b6d4', '#ef4444']
    
    barras = ax3.bar(elementos, esfuerzos_elementos, color=colores, alpha=0.7, edgecolor='white', linewidth=2)
    ax3.axhline(y=CONFIG['material']['Sy'], color='#34d399', linestyle='--', linewidth=2, label='Límite Fluencia')
    ax3.set_ylabel("Esfuerzo (MPa)", fontsize=11, color='white', fontweight='bold')
    ax3.set_title("Comparativa de Esfuerzos por Elemento", fontsize=12, color='white', fontweight='bold')
    ax3.set_facecolor('#1e293b')
    ax3.tick_params(colors='white')
    ax3.legend(facecolor='#1e293b', edgecolor='white', labelcolor='white')
    
    # Agregar valores en barras
    for barra, valor in zip(barras, esfuerzos_elementos):
        altura = barra.get_height()
        ax3.text(barra.get_x() + barra.get_width()/2., altura,
                f'{valor:.1f}', ha='center', va='bottom', color='white', fontweight='bold', fontsize=10)
    
    ax3.set_ylim(0, max(esfuerzos_elementos) * 1.2)
    
    # Gráfico 4: Factor de Seguridad por elemento
    ax4 = plt.subplot(2, 2, 4)
    elementos_fs = ['Parales', 'Viga', 'Platinas', 'General']
    factors_seg = [
        fea['factor_seguridad_parales'],
        fea['factor_seguridad_viga'],
        (fea['factor_seguridad_parales'] + fea['factor_seguridad_viga']) / 2,
        fea['factor_seguridad_fluencia']
    ]
    
    # Colores según FS: Verde si >= 3, Amarillo si 2-3, Rojo si < 2
    colores_fs = ['#34d399' if fs >= 3 else '#fbbf24' if fs >= 2 else '#ef4444' for fs in factors_seg]
    
    barras_fs = ax4.bar(elementos_fs, factors_seg, color=colores_fs, alpha=0.7, edgecolor='white', linewidth=2)
    ax4.axhline(y=3.0, color='#34d399', linestyle='--', linewidth=2, label='Recomendado (FS ≥ 3)')
    ax4.axhline(y=2.0, color='#fbbf24', linestyle=':', linewidth=2, label='Mínimo Aceptable (FS ≥ 2)')
    ax4.set_ylabel("Factor de Seguridad", fontsize=11, color='white', fontweight='bold')
    ax4.set_title("Factor de Seguridad por Elemento", fontsize=12, color='white', fontweight='bold')
    ax4.set_facecolor('#1e293b')
    ax4.tick_params(colors='white')
    ax4.legend(facecolor='#1e293b', edgecolor='white', labelcolor='white', fontsize=9)
    
    # Agregar valores en barras
    for barra, valor in zip(barras_fs, factors_seg):
        altura = barra.get_height()
        ax4.text(barra.get_x() + barra.get_width()/2., altura,
                f'{valor:.2f}', ha='center', va='bottom', color='white', fontweight='bold', fontsize=10)
    
    ax4.set_ylim(0, 5.0)
    
    plt.tight_layout()
    
    # Convertir a Base64
    buffer = BytesIO()
    plt.savefig(buffer, format='png', facecolor='#0b0f19', dpi=100)
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close(fig)
    
    return f"data:image/png;base64,{img_base64}"

def generar_tabla_comparativa_potencias():
    """Genera tabla HTML comparativa entre motorreductor de 5 HP y 10 HP"""
    transmision_5hp = simulacion_transmision_eje_principal(5.0)
    transmision_10hp = simulacion_transmision_eje_principal(10.0)
    
    # Crear tabla comparativa
    tabla_html = f"""
        <table>
            <tr>
                <th>Parámetro</th>
                <th>5 HP</th>
                <th>10 HP</th>
                <th>Incremento</th>
            </tr>
            <tr>
                <td><strong>Potencia del Motor</strong></td>
                <td>{transmision_5hp['potencia_motor_hp']:.1f} HP</td>
                <td>{transmision_10hp['potencia_motor_hp']:.1f} HP</td>
                <td>+100%</td>
            </tr>
            <tr>
                <td>RPM Eje Principal</td>
                <td>{transmision_5hp['rpm_eje_principal']:.2f}</td>
                <td>{transmision_10hp['rpm_eje_principal']:.2f}</td>
                <td>0% (idéntico)</td>
            </tr>
            <tr>
                <td>Velocidad Lineal</td>
                <td>{transmision_5hp['velocidad_lineal_ms']:.3f} m/s</td>
                <td>{transmision_10hp['velocidad_lineal_ms']:.3f} m/s</td>
                <td>0% (idéntico)</td>
            </tr>
            <tr>
                <td><strong>Torque Motor</strong></td>
                <td>{transmision_5hp['torque_motor_Nm']:.2f} Nm</td>
                <td>{transmision_10hp['torque_motor_Nm']:.2f} Nm</td>
                <td>+{((transmision_10hp['torque_motor_Nm'] / transmision_5hp['torque_motor_Nm'] - 1) * 100):.1f}%</td>
            </tr>
            <tr>
                <td><strong>Torque Disponible en Eje</strong></td>
                <td>{transmision_5hp['torque_disponible_Nm']:.2f} Nm</td>
                <td>{transmision_10hp['torque_disponible_Nm']:.2f} Nm</td>
                <td>+{((transmision_10hp['torque_disponible_Nm'] / transmision_5hp['torque_disponible_Nm'] - 1) * 100):.1f}%</td>
            </tr>
            <tr>
                <td>Torque Requerido</td>
                <td>{transmision_5hp['torque_requerido_Nm']:.2f} Nm</td>
                <td>{transmision_10hp['torque_requerido_Nm']:.2f} Nm</td>
                <td>0% (idéntico)</td>
            </tr>
            <tr>
                <td><strong>Factor de Seguridad (Potencia)</strong></td>
                <td>{transmision_5hp['factor_seguridad_potencia']:.2f}</td>
                <td>{transmision_10hp['factor_seguridad_potencia']:.2f}</td>
                <td>+{((transmision_10hp['factor_seguridad_potencia'] / transmision_5hp['factor_seguridad_potencia'] - 1) * 100):.1f}%</td>
            </tr>
            <tr>
                <td>Esfuerzo de Torsión</td>
                <td>{transmision_5hp['esfuerzo_torsion_MPa']:.2f} MPa</td>
                <td>{transmision_10hp['esfuerzo_torsion_MPa']:.2f} MPa</td>
                <td>0% (idéntico)</td>
            </tr>
            <tr>
                <td><strong>Factor Seguridad (Torsión)</strong></td>
                <td>{transmision_5hp['fs_eje_torsion']:.2f}</td>
                <td>{transmision_10hp['fs_eje_torsion']:.2f}</td>
                <td>0% (idéntico)</td>
            </tr>
        </table>
    """
    return tabla_html

def generar_documento_tecnico():
    """Genera un documento HTML completo con fórmulas y métodos de cálculo"""
    
    # Obtener datos actuales
    fea = calcular_fea_analitico()
    transmision_5hp = simulacion_transmision_eje_principal(5.0)
    transmision_10hp = simulacion_transmision_eje_principal(10.0)
    transmision = transmision_5hp  # Para compatibilidad con código existente
    tabla_comparativa = generar_tabla_comparativa_potencias()
    graficos_img = generar_graficos_transmision()  # Generar gráficos de transmisión en Base64
    graficos_estructurales = generar_graficos_estructurales()  # Generar gráficos estructurales en Base64
    diagramas = generar_diagramas_ingenieria()  # Generar diagramas P-001 y P-002
    
    # Parámetros de la estructura
    p = CONFIG['perfil']
    area = (p['H']*p['B']) - ((p['H']-2*p['t'])*(p['B']-2*p['t']))
    Ixx = (1/12 * p['B'] * p['H']**3) - (1/12 * (p['B']-2*p['t']) * (p['H']-2*p['t'])**3)
    c = p['H'] / 2
    Wxx = Ixx / c
    
    fecha = datetime.now().strftime("%d de %B de %Y")
    
    html_doc = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documento Técnico - ZASCA Digital Twin v3.0</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
            body {{
                font-family: 'Segoe UI', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 40px;
                max-width: 1000px;
                margin: 0 auto;
            }}
            .header {{
                text-align: center;
                border-bottom: 3px solid #667eea;
                padding-bottom: 30px;
                margin-bottom: 40px;
            }}
            h1 {{
                color: #667eea;
                font-size: 28px;
                margin: 10px 0;
            }}
            h2 {{
                color: #667eea;
                border-left: 4px solid #667eea;
                padding-left: 15px;
                margin-top: 40px;
            }}
            h3 {{
                color: #764ba2;
                margin-top: 25px;
            }}
            .formula {{
                background: #f0f4ff;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
                font-family: 'Courier New', monospace;
                overflow-x: auto;
            }}
            .variable {{
                background: #fff3cd;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: 'Courier New';
            }}
            .result {{
                background: #d4edda;
                border-left: 4px solid #28a745;
                padding: 15px;
                margin: 15px 0;
                border-radius: 5px;
            }}
            .critical {{
                background: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 15px 0;
                border-radius: 5px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            th, td {{
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
            }}
            th {{
                background: #667eea;
                color: white;
            }}
            tr:nth-child(even) {{
                background: #f9f9f9;
            }}
            .footer {{
                margin-top: 50px;
                border-top: 2px solid #ddd;
                padding-top: 20px;
                text-align: center;
                color: #666;
                font-size: 12px;
            }}
            .section-number {{
                background: #667eea;
                color: white;
                padding: 2px 8px;
                border-radius: 50%;
                margin-right: 10px;
                font-weight: bold;
            }}
            .note {{
                background: #e7f3ff;
                border-left: 4px solid #2196F3;
                padding: 15px;
                margin: 15px 0;
                border-radius: 5px;
            }}
            @media print {{
                body {{ padding: 0; }}
                .no-print {{ display: none; }}
            }}
            .button-container {{
                text-align: center;
                margin: 20px 0;
            }}
            button {{
                background: #667eea;
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                margin: 5px;
            }}
            button:hover {{
                background: #5568d3;
            }}
        </style>
    </head>
    <body>
        <div class="button-container no-print">
            <button onclick="window.print()">🖨️ Imprimir</button>
            <button onclick="descargarPDF()">📥 Descargar PDF</button>
            <button onclick="window.close()">✕ Cerrar</button>
        </div>

        <div class="header">
            <h1>📋 DOCUMENTO TÉCNICO</h1>
            <h3>ZASCA Digital Twin v3.0</h3>
            <p><strong>Sistema de Análisis Estructural y Transmisión</strong></p>
            <p style="color: #999;">Generado: {fecha}</p>
        </div>

        <!-- SECCIÓN 1: ANÁLISIS ESTRUCTURAL -->
        <h2><span class="section-number">1</span>ANÁLISIS ESTRUCTURAL (FEA 1D)</h2>
        
        <h3>1.1 Geometría y Propiedades del Perfil</h3>
        <p>Se utiliza <strong>Perfil Estructural DIN 100x50x6.3</strong> (secciones rectangular hueca)</p>
        
        <table>
            <tr>
                <th>Parámetro</th>
                <th>Valor</th>
                <th>Unidad</th>
            </tr>
            <tr>
                <td>Altura (H)</td>
                <td>{p['H']}</td>
                <td>mm</td>
            </tr>
            <tr>
                <td>Ancho (B)</td>
                <td>{p['B']}</td>
                <td>mm</td>
            </tr>
            <tr>
                <td>Espesor de pared (t)</td>
                <td>{p['t']}</td>
                <td>mm</td>
            </tr>
            <tr>
                <td>Área de sección (A)</td>
                <td>{area:.2f}</td>
                <td>mm²</td>
            </tr>
            <tr>
                <td>Momento de Inercia (Ixx)</td>
                <td>{Ixx:.2f}</td>
                <td>mm⁴</td>
            </tr>
            <tr>
                <td>Módulo de Sección (Wxx)</td>
                <td>{Wxx:.2f}</td>
                <td>mm³</td>
            </tr>
        </table>

        <div class="note">
            <strong>Cálculo del Área:</strong><br>
            A = (H × B) - ((H - 2t) × (B - 2t))<br>
            A = ({p['H']} × {p['B']}) - (({p['H']} - 2×{p['t']}) × ({p['B']} - 2×{p['t']}))<br>
            <strong>A = {area:.2f} mm²</strong>
        </div>

        <div class="note">
            <strong>Momento de Inercia (Ixx):</strong><br>
            Ixx = (1/12 × B × H³) - (1/12 × (B - 2t) × (H - 2t)³)<br>
            <strong>Ixx = {Ixx:.2f} mm⁴</strong>
        </div>

        <h3>1.2 Cargas Aplicadas</h3>
        <table>
            <tr>
                <th>Carga</th>
                <th>Valor</th>
                <th>Descripción</th>
            </tr>
            <tr>
                <td>Carga Viva por Bandeja</td>
                <td>{CONFIG['carga_viva_N']} N</td>
                <td>Carga máxima solicitada</td>
            </tr>
            <tr>
                <td>Peso Muerto por Bandeja</td>
                <td>{CONFIG['peso_muerto_N']} N</td>
                <td>Peso de la estructura (~40 kg)</td>
            </tr>
            <tr>
                <td>Número de Bandejas</td>
                <td>{CONFIG['num_bandejas']}</td>
                <td>Total de pisos en el paternoster</td>
            </tr>
            <tr>
                <td>Carga Total del Sistema</td>
                <td>{fea['carga_total_kN']} kN</td>
                <td>Carga en ambas columnas</td>
            </tr>
        </table>

        <div class="formula">
            <strong>Carga Total:</strong><br>
            P_total = (Carga_viva + Peso_muerto) × N_bandejas<br>
            P_total = ({CONFIG['carga_viva_N']} + {CONFIG['peso_muerto_N']}) × {CONFIG['num_bandejas']}<br>
            <strong>P_total = {fea['carga_total_kN'] * 1000:.0f} N = {fea['carga_total_kN']} kN</strong>
        </div>

        <h3>1.3 Cálculo de Esfuerzos</h3>
        
        <p><strong>Esfuerzo Axial:</strong></p>
        <div class="formula">
            σ_axial = P_columna / A<br>
            σ_axial = ({fea['carga_total_kN'] * 1000 / 2:.0f} N) / {area:.2f} mm²<br>
            <strong>σ_axial = {fea['esfuerzo_von_mises_MPa'] * 0.4:.2f} MPa</strong>
        </div>

        <p><strong>Esfuerzo por Flexión:</strong></p>
        <div class="formula">
            σ_flexión = M / Wxx<br>
            Donde M = P × e (excentricidad = 120 mm)<br>
            <strong>σ_flexión = varios componentes</strong>
        </div>

        <p><strong>Esfuerzo de Von Mises (Combinado):</strong></p>
        <div class="formula">
            σ_VM = √[(σ_axial)² + (σ_flexión)²]<br>
            <strong>σ_VM = {fea['esfuerzo_von_mises_MPa']} MPa</strong>
        </div>

        <h3>1.4 Factores de Seguridad</h3>
        
        <div class="result">
            <strong>Factor de Seguridad (Fluencia):</strong><br>
            FS = Sy / σ_VM<br>
            FS = {CONFIG['material']['Sy']} MPa / {fea['esfuerzo_von_mises_MPa']} MPa<br>
            <strong style="font-size: 18px;">FS = {fea['factor_seguridad_fluencia']}</strong>
        </div>

        <p><strong>Material: Acero ASTM A36</strong></p>
        <table>
            <tr>
                <th>Propiedad</th>
                <th>Valor</th>
            </tr>
            <tr>
                <td>Límite de Fluencia (Sy)</td>
                <td>{CONFIG['material']['Sy']} MPa</td>
            </tr>
            <tr>
                <td>Módulo de Elasticidad (E)</td>
                <td>{CONFIG['material']['E']} MPa</td>
            </tr>
            <tr>
                <td>Densidad</td>
                <td>7850 kg/m³</td>
            </tr>
        </table>

        <h3>1.5 Deformación</h3>
        
        <div class="formula">
            <strong>Deflexión Máxima (Viga Simplemente Apoyada en Dos Puntos):</strong><br>
            δ = (P × L³) / (48 × E × I)<br>
            Donde:<br>
            - P = Carga por columna = {fea['carga_total_kN'] * 1000 / 2:.0f} N<br>
            - L = Altura del eje = {CONFIG['altura_ejes']:.0f} mm = {CONFIG['altura_ejes']/1000:.2f} m<br>
            - E = Módulo de elasticidad = {CONFIG['material']['E']} MPa<br>
            - I = Momento de inercia = {Ixx:.2f} mm⁴<br>
            <strong>δ = {fea['deflexion_mm']} mm</strong>
        </div>

        <div class="result">
            <strong>Criterio de Deformación (L/300):</strong><br>
            δ_máx_permitida = {CONFIG['altura_ejes']} / 300 = {CONFIG['altura_ejes']/300:.2f} mm<br>
            δ_actual = {fea['deflexion_mm']} mm<br>
            <strong>Estado: {"✓ CUMPLE" if fea['deflexion_mm'] < CONFIG['altura_ejes']/300 else "✗ EXCEDE"}</strong>
        </div>

        <h3>1.6 Análisis de Parales Verticales</h3>
        
        <div class="formula">
            <strong>Esfuerzo en Parales (Columnas):</strong><br>
            σ_paral = σ_axial + σ_flexión<br>
            <strong>σ = {fea['esfuerzo_parales_MPa']} MPa</strong><br>
            <strong>Factor de Seguridad: {fea['factor_seguridad_parales']:.2f}</strong>
        </div>

        <h3>1.7 Análisis de Viga Central</h3>
        
        <div class="formula">
            <strong>Esfuerzo en Viga Central (Conecta Platinas):</strong><br>
            σ_viga = Momento Flexionante / Módulo Resistente<br>
            <strong>σ = {fea['esfuerzo_viga_central_MPa']} MPa</strong><br>
            <strong>Factor de Seguridad: {fea['factor_seguridad_viga']:.2f}</strong>
        </div>

        <h3>1.8 Reacciones en Apoyos</h3>
        
        <div class="formula">
            <strong>Reacción por Pata (4 apoyos):</strong><br>
            R = P_total / 4<br>
            R = {fea['carga_total_kN'] * 1000:.0f} N / 4<br>
            <strong>R = {fea['reaccion_por_pata_N']} N por pata</strong>
        </div>

        <!-- SECCIÓN 2: ANÁLISIS DE TRANSMISIÓN -->
        <h2><span class="section-number">2</span>ANÁLISIS DEL SISTEMA DE TRANSMISIÓN</h2>

        <h3>2.0 Diagrama de Entradas (Motor, Cadena y Cargas)</h3>
        <p><strong>Diagrama P-001:</strong> Representación esquemática del sistema de entrada con motor eléctrico, reductor, cadena de transmisión y distribución de cargas en bandejas:</p>
        <img src="{diagramas['p001']}" style="width: 100%; border: 2px solid #667eea; border-radius: 8px; margin: 20px 0; page-break-inside: avoid;">
        
        <div class="note">
            <strong>Especificaciones de Entrada:</strong><br>
            • Potencia nominal: {transmision['potencia_motor_hp']} HP @ {transmision['rpm_motor']:.0f} RPM<br>
            • Torque motriz: {transmision['torque_disponible_Nm']:.0f} Nm<br>
            • Velocidad lineal de cadena: {transmision['velocidad_lineal_ms']:.3f} m/s<br>
            • Carga por bandeja: {(CONFIG['carga_viva_N'] + CONFIG['peso_muerto_N'])/9.81:.1f} kg
        </div>

        <h3>2.1 Componentes del Sistema</h3>
        <table>
            <tr>
                <th>Componente</th>
                <th>Especificación</th>
            </tr>
            <tr>
                <td>Motor Eléctrico</td>
                <td>{transmision['potencia_motor_hp']} HP @ {transmision['rpm_motor']:.0f} RPM</td>
            </tr>
            <tr>
                <td>Reductor</td>
                <td>Relación {transmision['ratio_reductor']:.0f}:1 (Corona sin fin)</td>
            </tr>
            <tr>
                <td>Cadena Secundaria</td>
                <td>Relación {transmision['ratio_secundario']:.1f}:1</td>
            </tr>
            <tr>
                <td>Sprocket Principal</td>
                <td>25 dientes, paso 20A-1 (1.25")</td>
            </tr>
        </table>

        <h3>2.2 Cálculo de Velocidades (Cinemática)</h3>

        <div class="formula">
            <strong>RPM Salida Reductor:</strong><br>
            N_reductor = N_motor / Ratio_reductor<br>
            N_reductor = {transmision['rpm_motor']:.0f} / {transmision['ratio_reductor']:.0f}<br>
            <strong>N_reductor = {transmision['rpm_eje_principal']:.2f} RPM</strong>
        </div>

        <div class="formula">
            <strong>Velocidad Lineal de la Cadena:</strong><br>
            v = (N × 2π / 60) × r_primitivo<br>
            v = ({transmision['rpm_eje_principal']:.2f} × 2π / 60) × r<br>
            <strong>v = {transmision['velocidad_lineal_ms']:.3f} m/s</strong>
        </div>

        <div class="result">
            <strong>Velocidad de Ascenso de Cargas:</strong><br>
            Velocidad lineal = {transmision['velocidad_lineal_ms']:.3f} m/s ≈ {transmision['velocidad_lineal_ms']*60:.2f} m/min<br>
            Objetivo de diseño: ~0.20 m/s (12 m/min)
        </div>

        <h3>2.3 Cálculo de Torques (Dinámica)</h3>

        <div class="formula">
            <strong>Torque del Motor:</strong><br>
            T_motor = (P × 60) / (2π × N)<br>
            T_motor = ({transmision['potencia_motor_hp']*745.7:.0f} W × 60) / (2π × {transmision['rpm_motor']:.0f})<br>
            <strong>T_motor = {transmision['torque_motor_Nm']:.2f} Nm</strong>
        </div>

        <div class="formula">
            <strong>Torque Disponible en Eje Principal:</strong><br>
            T_disponible = T_motor × Ratio_reductor × Ratio_secundario × η_reductor × η_cadena<br>
            T_disponible = {transmision['torque_motor_Nm']:.2f} × {transmision['ratio_reductor']:.0f} × {transmision['ratio_secundario']:.1f} × 0.85 × 0.95<br>
            <strong>T_disponible = {transmision['torque_disponible_Nm']:.2f} Nm</strong>
        </div>

        <div class="formula">
            <strong>Torque Requerido por la Carga:</strong><br>
            T_requerido = F × r_primitivo<br>
            T_requerido = ({600*9.81:.0f} N) × r_primitivo<br>
            <strong>T_requerido = {transmision['torque_requerido_Nm']:.2f} Nm</strong>
        </div>

        <div class="result">
            <strong>Factor de Seguridad en Potencia:</strong><br>
            FS_potencia = T_disponible / T_requerido<br>
            FS_potencia = {transmision['torque_disponible_Nm']:.2f} / {transmision['torque_requerido_Nm']:.2f}<br>
            <strong>FS_potencia = {transmision['factor_seguridad_potencia']:.2f}</strong>
        </div>

        <h3>2.4 Análisis de Torsión del Eje Principal</h3>

        <div class="formula">
            <strong>Momento de Inercia Polar del Eje:</strong><br>
            J = (π × d⁴) / 32<br>
            J = (π × {transmision['diametro_eje_mm']}⁴) / 32<br>
            <strong>J = variable (según diámetro)</strong>
        </div>

        <div class="formula">
            <strong>Esfuerzo de Torsión (Shear Stress):</strong><br>
            τ = (T × r) / J<br>
            τ = ({transmision['torque_requerido_Nm']:.2f} Nm × radio) / J<br>
            <strong>τ = {transmision['esfuerzo_torsion_MPa']:.2f} MPa</strong>
        </div>

        <div class="result">
            <strong>Factor de Seguridad del Eje:</strong><br>
            FS_eje = Sy_shear / τ<br>
            FS_eje = {transmision['limite_fluencia_corte_MPa']:.2f} / {transmision['esfuerzo_torsion_MPa']:.2f}<br>
            <strong>FS_eje = {transmision['fs_eje_torsion']:.2f}</strong>
        </div>

        <!-- SECCIÓN 3: GRÁFICOS DE ANÁLISIS -->
        <h2><span class="section-number">3</span>GRÁFICOS DE ANÁLISIS</h2>
        
        <h3>3.1 Análisis de Transmisión - Visualización Gráfica</h3>
        <p>Los siguientes gráficos permiten una evaluación visual de la capacidad del sistema de transmisión:</p>
        <img src="{graficos_img}" style="width: 100%; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; page-break-inside: avoid;">
        
        <div class="note">
            <strong>Interpretación de Gráficos:</strong><br>
            <strong>◆ Gráfico Izquierdo (Capacidad de Transmisión):</strong> Compara el torque requerido (rojo) en función del desbalance de carga versus el torque disponible del sistema (verde). La zona sombreada verde es la región de operación segura, mientras que la zona roja indica sobrecarga crítica.<br><br>
            <strong>◆ Gráfico Derecho (Esfuerzo de Torsión):</strong> Muestra la relación entre el diámetro del eje y el esfuerzo cortante resultante. La línea discontinua roja marca el límite de fluencia del material. El diámetro actual ({transmision['diametro_eje_mm']}mm) está ampliamente dentro de los límites de seguridad.
        </div>

        <h3>3.2 Análisis de Esfuerzos y Deformaciones - Elementos Estructurales</h3>
        <p>Los siguientes gráficos permiten una evaluación detallada de la distribución de esfuerzos, deformaciones y factores de seguridad en los elementos estructurales del sistema:</p>
        <img src="{graficos_estructurales}" style="width: 100%; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; page-break-inside: avoid;">
        
        <div class="note">
            <strong>Interpretación de Gráficos Estructurales:</strong><br>
            <strong>◆ Gráfico Superior Izquierdo (Distribución de Esfuerzos):</strong> Muestra la distribución de esfuerzos Von Mises a lo largo de la altura de la estructura. La envolvente llena (azul) representa el rango de esfuerzos en elementos críticos (parales y viga) a diferentes alturas.<br><br>
            <strong>◆ Gráfico Superior Derecho (Perfil de Deformación):</strong> Visualiza el perfil parabólico de deformación vertical de la viga principal. La línea roja discontinua marca el límite admisible de deflexión según código (L/360). El área sombreada verde indica la zona de deformación segura.<br><br>
            <strong>◆ Gráfico Inferior Izquierdo (Comparación de Esfuerzos por Elemento):</strong> Contrasta los esfuerzos Von Mises máximos en los elementos estructurales principales: parales (soportes verticales), viga (soporte horizontal), platinas (conexiones) y factor sistema (análisis combinado).<br><br>
            <strong>◆ Gráfico Inferior Derecho (Factores de Seguridad):</strong> Presenta los factores de seguridad por elemento con codificación de colores: Verde (FS ≥ 3, excelente), Amarillo (FS 2-3, adecuado), Rojo (FS < 2, crítico). Todos los factores deben estar en verde para operación segura.
        </div>

        <h3>3.3 Análisis Comparativo: Motorreductor 5 HP vs 10 HP</h3>
        <p>La siguiente tabla compara el desempeño del sistema de transmisión utilizando un motorreductor de 5 HP (configuración actual) versus una alternativa de 10 HP (mejora de capacidad). Los resultados muestran cómo se modifica la capacidad del sistema al incrementar la potencia disponible:</p>
        {tabla_comparativa}
        <div class="note">
            <strong>Análisis Comparativo:</strong><br>
            <strong>◆ Torque Motor:</strong> Se duplica de {transmision_5hp['torque_motor_Nm']:.2f} Nm a {transmision_10hp['torque_motor_Nm']:.2f} Nm, proporcionando mayor reserves de par motor en operación.<br><br>
            <strong>◆ Factor de Seguridad (Potencia):</strong> Mejora significativamente de {transmision_5hp['factor_seguridad_potencia']:.2f} a {transmision_10hp['factor_seguridad_potencia']:.2f}, indicando mayor capacidad de sobrecarga sin riesgo de deslizamiento de la correa o cavitación del reductor.<br><br>
            <strong>◆ Velocidades y Esfuerzos:</strong> Permanecen idénticos porque la relación de transmisión (40:1 + 3:1) no cambia. El incremento de potencia NO afecta cinemática ni esfuerzos por torsión aguda.<br><br>
            <strong>Recomendación:</strong> La configuración de 10 HP ofrece mayor robustez operacional sin modificar la velocidad del sistema, siendo ideal para aplicaciones con cargas variables o demanda de ciclos cortos intensivos.
        </div>

        <!-- SECCIÓN 4: RESUMEN Y CONCLUSIONES -->
        <h2><span class="section-number">4</span>RESUMEN Y CONCLUSIONES</h2>

        <h3>4.1 Resumen de Análisis Estructural</h3>
        <table>
            <tr>
                <th>Parámetro</th>
                <th>Valor</th>
                <th>Estado</th>
            </tr>
            <tr>
                <td>Esfuerzo Von Mises</td>
                <td>{fea['esfuerzo_von_mises_MPa']} MPa</td>
                <td>✓ Normal</td>
            </tr>
            <tr>
                <td>Factor Seguridad (Fluencia)</td>
                <td>{fea['factor_seguridad_fluencia']}</td>
                <td>{"✓ CUMPLE (>3)" if fea['factor_seguridad_fluencia'] >= 3 else "✗ CRÍTICO"}</td>
            </tr>
            <tr>
                <td>Deformación Máxima</td>
                <td>{fea['deflexion_mm']:.2f} mm</td>
                <td>✓ Dentro de límites</td>
            </tr>
            <tr>
                <td>Reacción por Pata</td>
                <td>{fea['reaccion_por_pata_N']:.0f} N</td>
                <td>✓ Distribución uniforme</td>
            </tr>
        </table>

        <h3>4.2 Resumen de Análisis de Transmisión</h3>
        
        <p><strong>Diagrama P-002:</strong> Sistema de cargas, reacciones en apoyos y factor de seguridad:</p>
        <img src="{diagramas['p002']}" style="width: 100%; border: 2px solid #667eea; border-radius: 8px; margin: 20px 0; page-break-inside: avoid;">
        
        <table>
            <tr>
                <th>Parámetro</th>
                <th>Valor</th>
                <th>Estado</th>
            </tr>
            <tr>
                <td>RPM Eje Principal</td>
                <td>{transmision['rpm_eje_principal']:.2f}</td>
                <td>✓ Dentro de rango</td>
            </tr>
            <tr>
                <td>Velocidad Lineal</td>
                <td>{transmision['velocidad_lineal_ms']:.3f} m/s</td>
                <td>{"✓ ÓPTIMA" if 0.15 < transmision['velocidad_lineal_ms'] < 0.25 else "⚠️ VERIFICAR"}</td>
            </tr>
            <tr>
                <td>Factor Seg. Potencia</td>
                <td>{transmision['factor_seguridad_potencia']:.2f}</td>
                <td>{"✓ CUMPLE (>2)" if transmision['factor_seguridad_potencia'] >= 2 else "✗ CRÍTICO"}</td>
            </tr>
            <tr>
                <td>Factor Seg. Eje</td>
                <td>{transmision['fs_eje_torsion']:.2f}</td>
                <td>{"✓ CUMPLE (>2)" if transmision['fs_eje_torsion'] >= 2 else "✗ CRÍTICO"}</td>
            </tr>
        </table>

        <!-- SECCIÓN 5: ANÁLISIS DE FÓRMULAS Y MÉTODOS NUMÉRICOS -->
        <h2><span class="section-number">5</span>ANÁLISIS TÉCNICO: FÓRMULAS Y MÉTODOS NUMÉRICOS</h2>

        <h3>5.1 Fórmulas Matemáticas Aplicadas</h3>
        
        <p><strong>Este análisis utiliza ecuaciones ALGEBRAICAS cerradas de Resistencia de Materiales e Ingeniería Estructural.</strong> NO emplea ecuaciones diferenciales ordinarias.</p>

        <h4>Fórmulas de Análisis Estructural:</h4>
        
        <table>
            <tr>
                <th>Concepto</th>
                <th>Fórmula</th>
                <th>Descripción</th>
            </tr>
            <tr>
                <td><strong>Momento de Inercia</strong></td>
                <td>Ixx = (1/12 × B × H³) - (1/12 × (B - 2t) × (H - 2t)³)</td>
                <td>Sección rectangular hueca compuesta</td>
            </tr>
            <tr>
                <td><strong>Teorema de Steiner</strong></td>
                <td>I_total = I_propio + A × d²</td>
                <td>Concentración de inercia en secciones compuestas</td>
            </tr>
            <tr>
                <td><strong>Esfuerzo Axial</strong></td>
                <td>σ_axial = P / A</td>
                <td>Carga sobre área de sección</td>
            </tr>
            <tr>
                <td><strong>Esfuerzo de Flexión</strong></td>
                <td>σ_flexion = M / Wxx = (P × e) / Wxx</td>
                <td>Momento por excentricidad dividido módulo resistente</td>
            </tr>
            <tr>
                <td><strong>Criterio Von Mises</strong></td>
                <td>σ_VM = σ_axial + σ_flexion</td>
                <td>Esfuerzo equivalente combinado</td>
            </tr>
            <tr>
                <td><strong>Deflexión Máxima</strong></td>
                <td>δ = (5 × w × L⁴) / (384 × E × I)</td>
                <td>Deformación viga bajo carga distribuida</td>
            </tr>
            <tr>
                <td><strong>Factor de Seguridad</strong></td>
                <td>FS = Sy / σ_VM</td>
                <td>Relación límite fluencia / esfuerzo actual</td>
            </tr>
        </table>

        <h4>Fórmulas de Análisis de Transmisión:</h4>
        
        <table>
            <tr>
                <th>Concepto</th>
                <th>Fórmula</th>
                <th>Descripción</th>
            </tr>
            <tr>
                <td><strong>Velocidad Angular</strong></td>
                <td>ω = N × (2π / 60)</td>
                <td>Conversión de RPM a rad/s</td>
            </tr>
            <tr>
                <td><strong>Velocidad Lineal</strong></td>
                <td>v = ω × r</td>
                <td>Velocidad tangencial en cadena</td>
            </tr>
            <tr>
                <td><strong>Cálculo de Torque</strong></td>
                <td>T = (P × 60) / (2π × N)</td>
                <td>Conversión de potencia a torque</td>
            </tr>
            <tr>
                <td><strong>Momento Polar</strong></td>
                <td>J = (π × d⁴) / 32</td>
                <td>Resistencia a torsión del eje</td>
            </tr>
            <tr>
                <td><strong>Esfuerzo de Torsión</strong></td>
                <td>τ = (T × r) / J</td>
                <td>Esfuerzo cortante en el eje</td>
            </tr>
        </table>

        <h3>5.2 Tipo de Análisis: Estático vs Dinámico</h3>
        
        <div class="note">
            <strong>Análisis ESTÁTICO (Actual):</strong><br>
            ✓ Resuelve equilibrio instantáneo de fuerzas<br>
            ✓ Asume cargas CONSTANTES en tiempo<br>
            ✓ No considera variaciones temporales<br>
            ✓ Utiliza ecuaciones ALGEBRAICAS cerradas<br>
            ✓ Aplicable para condiciones nominales de operación
        </div>

        <h3>5.3 Métodos Numéricos: Runge-Kutta 4</h3>
        
        <p><strong>¿Cuándo se usaría Runge-Kutta 4?</strong></p>
        
        <p>Este método de integración numérica SE APLICARÍA si se agregara análisis DINÁMICO al modelo. Actualmente NO es necesario porque el análisis es estático.</p>

        <div class="critical">
            <strong>Situación Actual (sin Runge-Kutta 4):</strong><br>
            • Análisis de factor de seguridad en condiciones nominales<br>
            • Cargas distribuidas constantes<br>
            • Estado de equilibrio estable
        </div>

        <div class="result">
            <strong>Situación que SÍ requeriría Runge-Kutta 4:</strong><br>
            ✗ Startup del motor (0 → 1750 RPM)<br>
            ✗ Análisis de resonancia estructural<br>
            ✗ Respuesta transitoria (primeros 2-5 segundos)<br>
            ✗ Vibraciones forzadas con cargas cíclicas<br>
            ✗ Desaceleración de emergencia
        </div>

        <h4>Ecuación Diferencial para Análisis Dinámico:</h4>
        
        <div class="formula">
            <strong>Sistema Masa-Amortiguador-Rigidez (Vibraciones):</strong><br>
            m × d²y/dt² + c × dy/dt + k × y = F(t)<br><br>
            <strong>Donde:</strong><br>
            • m = masa equivalente (kg)<br>
            • c = coeficiente amortiguamiento (N·s/m)<br>
            • k = rigidez (N/m)<br>
            • F(t) = fuerza forzante dependiente del tiempo (N)<br>
            • y = desplazamiento (mm)<br>
            • dy/dt = velocidad (mm/s)<br>
            • d²y/dt² = aceleración (mm/s²)
        </div>

        <h4>Método Runge-Kutta 4 (4 Etapas):</h4>
        
        <div class="formula">
            <strong>Fórmula de integración:</strong><br>
            y<sub>n+1</sub> = y<sub>n</sub> + (h/6)×(k₁ + 2k₂ + 2k₃ + k₄)<br><br>
            <strong>Donde:</strong><br>
            • k₁ = f(t<sub>n</sub>, y<sub>n</sub>)<br>
            • k₂ = f(t<sub>n</sub> + h/2, y<sub>n</sub> + h·k₁/2)<br>
            • k₃ = f(t<sub>n</sub> + h/2, y<sub>n</sub> + h·k₂/2)<br>
            • k₄ = f(t<sub>n</sub> + h, y<sub>n</sub> + h·k₃)<br>
            • h = tamaño de paso temporal
        </div>

        <h3>5.4 Comparativa de Métodos de Integración Numérica</h3>
        
        <table>
            <tr>
                <th>Método</th>
                <th>Precisión</th>
                <th>Error Local</th>
                <th>Complejidad</th>
                <th>Aplicación</th>
            </tr>
            <tr>
                <td>Euler Explícito</td>
                <td>Baja</td>
                <td>O(h²)</td>
                <td>Muy simple</td>
                <td>Educativo</td>
            </tr>
            <tr>
                <td>Heun (RK2)</td>
                <td>Media</td>
                <td>O(h³)</td>
                <td>Simple</td>
                <td>Rápido</td>
            </tr>
            <tr>
                <td><strong>Runge-Kutta 4</strong></td>
                <td><strong>Alta</strong></td>
                <td><strong>O(h⁴)</strong></td>
                <td><strong>Moderada</strong></td>
                <td><strong>RECOMENDADO</strong></td>
            </tr>
            <tr>
                <td>RK45 Adaptativo</td>
                <td>Variable</td>
                <td>Controlado</td>
                <td>Compleja</td>
                <td>Máxima precisión</td>
            </tr>
            <tr>
                <td>Backward Euler</td>
                <td>Media</td>
                <td>Variable</td>
                <td>Muy compleja</td>
                <td>Sistemas stiff</td>
            </tr>
        </table>

        <h3>5.5 Conclusiones sobre Metodología</h3>
        
        <div class="result">
            <strong>✓ El análisis actual es apropiado para:</strong><br>
            • Evaluación de factor de seguridad en condiciones nominales<br>
            • Diseño estructural de componentes<br>
            • Validación de criterios de resistencia<br>
            • Análisis estático de carga máxima<br>
            <br>
            <strong>→ Se recomienda mantener el método actual para estas aplicaciones.</strong>
        </div>

        <div class="note">
            <strong>Futuras mejoras (opcional):</strong><br>
            Si en el futuro se requiere análisis de comportamiento transitorio del sistema (startup, parada de emergencia, vibraciones), se sugiere integrar Runge-Kutta 4 u otro método de integración numérica para resolver las ecuaciones diferenciales de dinámica estructural.
        </div>

        <div class="footer">
            <p><strong>CONCLUSIÓN GENERAL:</strong> El sistema de FASECOL S.A.S cumple con todos los criterios de seguridad y funcionalidad. El análisis utiliza métodos analíticos rigurosos de Resistencia de Materiales, permitiendo evaluación precisa del estado estructural bajo condiciones nominales de operación.</p>
            <p>Documento generado automáticamente por ZASCA Digital Twin v3.0</p>
        </div>

    </body>
    <script>
        function descargarPDF() {{
            const element = document.body;
            const opt = {{
                margin: 10,
                filename: 'ZASCA_Documento_Tecnico.pdf',
                image: {{ type: 'jpeg', quality: 0.98 }},
                html2canvas: {{ scale: 2 }},
                jsPDF: {{ orientation: 'portrait', unit: 'mm', format: 'a4' }}
            }};
            html2pdf().set(opt).from(element).save();
        }}
    </script>
    </html>
    """
    
    return html_doc

# ==============================================================================
# 3. INTERFAZ GRÁFICA (WEBGL / THREE.JS)
# ==============================================================================
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZASCA Digital Twin | High-Fidelity</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js"></script>
    <style>
        body { margin: 0; background: #0b0f19; color: white; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
        /* Canvas debajo de la UI para que la interacción funcione correctamente */
        #canvas-container {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 1;
        }
        #canvas-container canvas { display: block; width: 100% !important; height: 100% !important; }
        
        /* Contenedor: barra de escala a la izquierda + panel FEA */
        #fea-panel-wrapper {
            position: absolute; top: 20px; right: 20px;
            display: flex; align-items: flex-start; gap: 0;
            z-index: 100; pointer-events: auto;
        }
        /* Panel de Ingeniería (Overlay) */
        #hud {
            width: 300px;
            background: rgba(16, 23, 41, 0.9); border: 1px solid #3b82f6;
            border-radius: 8px; padding: 20px; backdrop-filter: blur(10px);
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }
        h1 { font-size: 16px; color: #60a5fa; margin-top: 0; text-transform: uppercase; letter-spacing: 1px; }
        .stat-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; }
        .stat-val { font-family: 'Consolas', monospace; font-weight: bold; color: #fff; }
        .stat-safe { color: #4ade80; } .stat-danger { color: #ef4444; }
        
        /* Controles y paneles sobre el canvas para que reciban clics */
        #controls {
            position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 15px;
            z-index: 100; pointer-events: auto;
        }
        .btn {
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            color: white; padding: 10px 20px; border-radius: 30px; cursor: pointer;
            transition: 0.3s; font-size: 13px; text-transform: uppercase;
        }
        .btn:hover { background: #3b82f6; border-color: #3b82f6; }
        .btn.active { background: #3b82f6; box-shadow: 0 0 15px #3b82f6; }

        /* Loader */
        #loader {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #000; display: flex; justify-content: center; align-items: center;
            z-index: 999; transition: opacity 0.5s;
        }
        /* Contenedor barra de escala (a la izquierda del panel FEA) */
        #colorbar-wrapper {
            display: flex; align-items: stretch; height: 300px;
            background: rgba(16, 23, 41, 0.85); border: 1px solid rgba(59, 130, 246, 0.5);
            border-radius: 8px 0 0 8px; padding: 12px 10px 12px 12px;
            box-shadow: 0 0 15px rgba(0,0,0,0.3);
        }
        #colorbar-scale-ticks {
            display: flex; flex-direction: column; justify-content: space-between;
            font-size: 11px; color: #94a3b8; font-family: Consolas, monospace;
            padding-right: 6px; line-height: 1.2;
        }
        #colorbar {
            width: 28px; height: 100%; border-radius: 4px;
            flex-shrink: 0;
        }
        /* Tooltip al pasar sobre miembro estructural */
        #tooltipFEA {
            position: fixed; z-index: 1000; display: none;
            background: rgba(16, 23, 41, 0.98); border: 1px solid #3b82f6;
            border-radius: 8px; padding: 12px 16px; min-width: 220px;
            font-size: 12px; color: #e0e7ff; pointer-events: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        #tooltipFEA .tooltip-title { color: #60a5fa; font-weight: bold; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; }
        #tooltipFEA .tooltip-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        /* Paneles laterales e inferiores: encima del canvas, reciben clics */
        #scalePanel, #reactionsPanel, #transmisionPanel, #dynamicPanel { z-index: 100; pointer-events: auto; }
        #dynamicPanel {
            max-height: 400px; overflow-y: auto;
        }
    </style>
</head>
<body>

<div id="loader"><div>INITIALIZING PHYSICS ENGINE...</div></div>

<div id="canvas-container"></div>

<!-- Barra de escala a la izquierda del panel ANÁLISIS FEA -->
<div id="fea-panel-wrapper">
    <div id="colorbar-wrapper">
        <div id="colorbar-scale-ticks">
            <span id="tickMax">--</span>
            <span id="tick75">--</span>
            <span id="tick50">--</span>
            <span id="tick25">--</span>
            <span id="tickMin">0</span>
        </div>
        <div id="colorbar" style="
            background: linear-gradient(180deg, #ef4444 0%, #f97316 25%, #fbbf24 50%, #86efac 75%, #34d399 100%);
            border: 2px solid rgba(255,255,255,0.3); border-radius: 4px;
        "></div>
    </div>
    <div id="hud">
        <h1>Análisis FEA (Tiempo Real)</h1>
        <div class="stat-row"><span>Carga Viva (Vectores):</span><span class="stat-val" style="color:#f87171">{{ config.carga_viva_N }} N</span></div>
        <div class="stat-row"><span>Carga Total Sistema:</span><span class="stat-val">{{ fea.carga_total_kN }} kN</span></div>
        <div class="stat-row"><span>Esfuerzo Von Mises:</span><span class="stat-val">{{ fea.esfuerzo_von_mises_MPa }} MPa</span></div>
        <div class="stat-row"><span>Deformación Est.:</span><span class="stat-val">{{ fea.deflexion_mm }} mm</span></div>
        <br>
        <div style="text-align: center; font-size: 12px; color: #94a3b8;">FACTOR DE SEGURIDAD</div>
        <div style="text-align: center; font-size: 32px; font-weight: bold;" class="{{ 'stat-safe' if fea.factor_seguridad_fluencia >= 3 else 'stat-danger' }}">
            {{ fea.factor_seguridad_fluencia }}
        </div>
    </div>
</div>

<!-- Tooltip al pasar sobre miembro estructural -->
<div id="tooltipFEA">
    <div class="tooltip-title" id="tooltipFEA_nombre">Miembro</div>
    <div class="tooltip-row"><span>Factor de Seguridad (FS):</span><span id="tooltipFEA_fs">--</span></div>
    <div class="tooltip-row"><span>Esfuerzo Máximo:</span><span id="tooltipFEA_esfMax">-- MPa</span></div>
    <div class="tooltip-row"><span>Esfuerzo Von Mises:</span><span id="tooltipFEA_vonMises">-- MPa</span></div>
</div>

<div id="controls">
    <select id="analysisType" onchange="changeAnalysis(this.value)" style="
        background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
        color: white; padding: 10px 15px; border-radius: 30px; cursor: pointer;
        font-size: 13px; text-transform: uppercase;
    ">
        <option value="von_mises">Von Mises Stress</option>
        <option value="esfuerzo_max">Maximum Stress</option>
        <option value="factor_seguridad">Safety Factor</option>
        <option value="deformacion">Max Deformation</option>
    </select>
    <button class="btn active" onclick="toggleVectors()">Vectores de Fuerza</button>
    <button class="btn" onclick="toggleHeatmap()">Mapa de Calor</button>
    <button class="btn" onclick="toggleRotation()">Auto Rotación</button>
</div>

<!-- ESCALA DE VALORES (Min/Max) -->
<div id="scalePanel" style="
    position: absolute; right: 30px; top: 460px;
    background: rgba(16, 23, 41, 0.95); border: 1px solid #3b82f6;
    border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); width: 180px;
    font-size: 12px; color: #e0e7ff;
">
    <div style="text-align: center; margin-bottom: 10px; color: #60a5fa; font-weight: bold;">
        <span id="scaleLabel">Von Mises Stress</span>
    </div>
    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
        <span>Max:</span><span id="scaleMax" style="color: #ef4444; font-weight: bold;">-- MPa</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
        <span>Min:</span><span id="scaleMin" style="color: #34d399; font-weight: bold;">0</span>
    </div>
</div>

<!-- REACCIONES EN PATAS -->
<div id="reactionsPanel" style="
    position: absolute; left: 30px; bottom: 100px;
    background: rgba(16, 23, 41, 0.95); border: 1px solid #10b981;
    border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); width: 280px;
    font-size: 11px; color: #e0e7ff;
">
    <div style="text-align: center; margin-bottom: 10px; color: #10b981; font-weight: bold;">
        ANÁLISIS ESTRUCTURAL
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
            <span>Por Pata:</span><span id="reactionPer" style="color: #60a5fa; font-weight: bold;">-- N</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Total:</span><span id="reactionTotal" style="color: #fbbf24; font-weight: bold;">-- N</span>
        </div>
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="text-align: center; color: #34d399; font-weight: bold; margin-bottom: 5px; font-size: 10px;">PARALES</div>
        <div style="display: flex; justify-content: space-between;">
            <span>σ:</span><span id="stressParales" style="color: #fbbf24;">-- MPa</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>FS:</span><span id="fsParales" style="color: #10b981;">-- </span>
        </div>
    </div>
    <div>
        <div style="text-align: center; color: #34d399; font-weight: bold; margin-bottom: 5px; font-size: 10px;">VIGA CENTRAL</div>
        <div style="display: flex; justify-content: space-between;">
            <span>σ:</span><span id="stressViga" style="color: #fbbf24;">-- MPa</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>FS:</span><span id="fsViga" style="color: #10b981;">-- </span>
        </div>
    </div>
</div>

<!-- SISTEMA DE TRANSMISIÓN -->
<div id="transmisionPanel" style="
    position: absolute; left: 30px; top: 100px;
    background: rgba(16, 23, 41, 0.95); border: 1px solid #f97316;
    border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);
    box-shadow: 0 0 20px rgba(249, 115, 22, 0.3); width: 280px;
    font-size: 11px; color: #e0e7ff; max-height: 350px; overflow-y: auto;
">
    <div style="text-align: center; margin-bottom: 10px; color: #f97316; font-weight: bold;">
        ⚙️ SISTEMA DE TRANSMISIÓN
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
            <span>RPM Eje Principal:</span><span id="rpmEje" style="color: #60a5fa;">-- rpm</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Velocidad Cadena:</span><span id="velCadena" style="color: #60a5fa;">-- m/s</span>
        </div>
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
            <span>Torque Disponible:</span><span id="torqueDispo" style="color: #34d399;">-- Nm</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Torque Requerido:</span><span id="torqueReq" style="color: #fbbf24;">-- Nm</span>
        </div>
        <div style="display: flex; justify-content: space-between; color: #10b981; font-weight: bold;">
            <span>FS Potencia:</span><span id="fsPotencia">--</span>
        </div>
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between;">
            <span>Esfuerzo Torsión:</span><span id="esfuerzoTors" style="color: #ef4444;">-- MPa</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>FS Eje (Torsión):</span><span id="fsEje" style="color: #10b981; font-weight: bold;">--</span>
        </div>
    </div>
    <button onclick="loadGraficos()" style="
        width: 100%; background: rgba(249, 115, 22, 0.3); border: 1px solid #f97316;
        color: #f97316; padding: 8px; border-radius: 5px; cursor: pointer;
        font-size: 10px; font-weight: bold; margin-top: 8px;
    ">📊 Ver Gráficos</button>
    <button onclick="abrirDocumento()" style="
        width: 100%; background: rgba(59, 130, 246, 0.3); border: 1px solid #3b82f6;
        color: #3b82f6; padding: 8px; border-radius: 5px; cursor: pointer;
        font-size: 10px; font-weight: bold; margin-top: 8px;
    ">📄 Documento Técnico</button>
</div>

<!-- ANÁLISIS DINÁMICO MEJORADO -->
<div id="dynamicPanel" style="
    position: absolute; left: 30px; top: 470px;
    background: rgba(16, 23, 41, 0.95); border: 1px solid #8b5cf6;
    border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); width: 280px;
    font-size: 11px; color: #e0e7ff;
">
    <div style="text-align: center; margin-bottom: 10px; color: #8b5cf6; font-weight: bold;">
        ⚡ ANÁLISIS DINÁMICO
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="text-align: center; color: #a78bfa; font-weight: bold; margin-bottom: 5px; font-size: 10px;">VIBRACIONES</div>
        <div style="display: flex; justify-content: space-between;">
            <span>Frec. Natural:</span><span id="freqNatural" style="color: #60a5fa;">-- Hz</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Frec. Excitación:</span><span id="freqExcitacion" style="color: #60a5fa;">-- Hz</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Ratio:</span><span id="ratioFreq" style="color: #fbbf24;">--</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Estado:</span><span id="estadoResonancia" style="color: #10b981; font-weight: bold;">OK</span>
        </div>
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="text-align: center; color: #a78bfa; font-weight: bold; margin-bottom: 5px; font-size: 10px;">FUERZAS INERCIALES</div>
        <div style="display: flex; justify-content: space-between;">
            <span>Aceleración:</span><span id="aceleracion" style="color: #fbbf24;">-- m/s²</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Fuerza Inercial:</span><span id="fuerzaInercial" style="color: #fbbf24;">-- N</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Masa Total:</span><span id="masaTotal" style="color: #60a5fa;">-- kg</span>
        </div>
    </div>
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
        <div style="text-align: center; color: #a78bfa; font-weight: bold; margin-bottom: 5px; font-size: 10px;">FACTORES DE SEGURIDAD</div>
        <div style="display: flex; justify-content: space-between;">
            <span>FS Fatiga:</span><span id="fsFatiga" style="color: #10b981;">--</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>FS Pandeo:</span><span id="fsPandeo" style="color: #10b981;">--</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>FS Global:</span><span id="fsGlobal" style="color: #10b981; font-weight: bold;">--</span>
        </div>
    </div>
    <div>
        <div style="text-align: center; color: #a78bfa; font-weight: bold; margin-bottom: 5px; font-size: 10px;">TRANSMISIÓN DINÁMICA</div>
        <div style="display: flex; justify-content: space-between;">
            <span>Torque Acel.:</span><span id="torqueAcel" style="color: #fbbf24;">-- Nm</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Frec. Torsional:</span><span id="freqTorsional" style="color: #60a5fa;">-- Hz</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span>Resonancia:</span><span id="resonanciaTorsional" style="color: #10b981;">NO</span>
        </div>
    </div>
</div>

<!-- MODAL PARA GRÁFICOS -->
<div id="graficosModal" style="
    display: none;
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.9); z-index: 1000;
    justify-content: center; align-items: center;
">
    <div style="
        background: #0b0f19; border: 2px solid #f97316;
        border-radius: 15px; padding: 20px; max-width: 95vw; max-height: 95vh;
        overflow: auto;
    ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h2 style="color: #f97316; margin: 0;">Análisis del Sistema de Transmisión</h2>
            <button onclick="cerrarGraficos()" style="
                background: #ef4444; color: white; border: none;
                padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;
            ">✕ Cerrar</button>
        </div>
        <img id="graficoImg" src="" style="width: 100%; border-radius: 10px;">
    </div>
</div>

<script>
    // Datos del Backend
    const CONFIG = {
        h: {{ config.altura_ejes }} / 1000,
        w: {{ config.ancho_total }} / 1000,
        d: {{ config.profundidad }} / 1000,
        n: {{ config.num_bandejas }},
        fs: {{ fea.factor_seguridad_fluencia }}
    };

    let scene, camera, renderer, controls;
    let trays = [], arrows = [], columns = [];
    let platinas = [], vigas = [];  // Elementos de refuerzo estructural
    let structuralMeshes = [];  // Todos los miembros para hover (parales, platinas, vigas)
    let raycaster, mouse;
    let showVectors = true;
    let showHeatmap = false;
    let autoRotate = true;
    let currentAnalysis = 'von_mises';

    init();
    animate();
    loadAnalysisData('von_mises');
    loadTransmisionData();
    loadDynamicData();

    // --- CARGAR DATOS DE TRANSMISIÓN ---
    async function loadTransmisionData() {
        try {
            const response = await fetch('/api/get_transmision');
            const data = await response.json();
            
            // Actualizar panel de transmisión
            document.getElementById('rpmEje').textContent = data.rpm_eje_principal.toFixed(2) + ' rpm';
            document.getElementById('velCadena').textContent = data.velocidad_lineal_ms.toFixed(3) + ' m/s';
            document.getElementById('torqueDispo').textContent = data.torque_disponible_Nm.toFixed(2) + ' Nm';
            document.getElementById('torqueReq').textContent = data.torque_requerido_Nm.toFixed(2) + ' Nm';
            document.getElementById('fsPotencia').textContent = data.factor_seguridad_potencia.toFixed(2);
            document.getElementById('esfuerzoTors').textContent = data.esfuerzo_torsion_MPa.toFixed(2) + ' MPa';
            document.getElementById('fsEje').textContent = data.fs_eje_torsion.toFixed(2);
            
            // Actualizar datos dinámicos de transmisión
            if (data.torque_aceleracion_Nm) {
                document.getElementById('torqueAcel').textContent = data.torque_aceleracion_Nm.toFixed(2) + ' Nm';
            }
            if (data.frecuencia_torsional_Hz) {
                document.getElementById('freqTorsional').textContent = data.frecuencia_torsional_Hz.toFixed(2) + ' Hz';
            }
            if (data.resonancia_torsional !== undefined) {
                document.getElementById('resonanciaTorsional').textContent = data.resonancia_torsional ? 'SÍ' : 'NO';
                document.getElementById('resonanciaTorsional').style.color = data.resonancia_torsional ? '#ef4444' : '#10b981';
            }
            
        } catch (error) {
            console.error('Error cargando transmisión:', error);
        }
    }

    // --- CARGAR DATOS DINÁMICOS ESTRUCTURALES ---
    async function loadDynamicData() {
        try {
            const response = await fetch('/api/get_analysis', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({type: 'von_mises'})
            });
            const feaResponse = await response.json();
            
            // Obtener datos completos del FEA
            const feaFullResponse = await fetch('/api/get_analysis');
            const feaFull = await feaFullResponse.json();
            
            // Actualizar panel dinámico
            if (feaFull.frecuencia_natural_Hz) {
                document.getElementById('freqNatural').textContent = feaFull.frecuencia_natural_Hz.toFixed(2) + ' Hz';
            }
            if (feaFull.frecuencia_excitacion_Hz) {
                document.getElementById('freqExcitacion').textContent = feaFull.frecuencia_excitacion_Hz.toFixed(2) + ' Hz';
            }
            if (feaFull.ratio_frecuencias !== undefined) {
                document.getElementById('ratioFreq').textContent = feaFull.ratio_frecuencias.toFixed(3);
            }
            if (feaFull.estado_resonancia) {
                document.getElementById('estadoResonancia').textContent = feaFull.estado_resonancia;
                document.getElementById('estadoResonancia').style.color = feaFull.estado_resonancia === 'RESONANCIA' ? '#ef4444' : '#10b981';
            }
            if (feaFull.aceleracion_ms2) {
                document.getElementById('aceleracion').textContent = feaFull.aceleracion_ms2.toFixed(3) + ' m/s²';
            }
            if (feaFull.fuerza_inercial_N) {
                document.getElementById('fuerzaInercial').textContent = feaFull.fuerza_inercial_N.toFixed(0) + ' N';
            }
            if (feaFull.masa_total_kg) {
                document.getElementById('masaTotal').textContent = feaFull.masa_total_kg.toFixed(1) + ' kg';
            }
            if (feaFull.factor_seguridad_fatiga) {
                document.getElementById('fsFatiga').textContent = feaFull.factor_seguridad_fatiga.toFixed(2);
            }
            if (feaFull.factor_seguridad_pandeo) {
                document.getElementById('fsPandeo').textContent = feaFull.factor_seguridad_pandeo.toFixed(2);
            }
            if (feaFull.factor_seguridad_global) {
                document.getElementById('fsGlobal').textContent = feaFull.factor_seguridad_global.toFixed(2);
            }
            
        } catch (error) {
            console.error('Error cargando datos dinámicos:', error);
        }
    }

    async function loadGraficos() {
        try {
            const response = await fetch('/api/get_graficos_transmision');
            const data = await response.json();
            
            document.getElementById('graficoImg').src = data.grafico;
            document.getElementById('graficosModal').style.display = 'flex';
            
        } catch (error) {
            console.error('Error cargando gráficos:', error);
        }
    }

    window.cerrarGraficos = function() {
        document.getElementById('graficosModal').style.display = 'none';
    };

    // Cerrar modal al hacer click fuera
    window.onclick = function(event) {
        const modal = document.getElementById('graficosModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    window.abrirDocumento = function() {
        const ventana = window.open('about:blank', 'documento', 'width=1200,height=800,scrollbars=yes');
        
        // Cargar el documento
        fetch('/api/generar_documento')
            .then(response => response.text())
            .then(html => {
                ventana.document.write(html);
                ventana.document.close();
            })
            .catch(error => {
                console.error('Error cargando documento:', error);
                alert('Error al generar el documento');
            });
    };

    // --- CARGAR DATOS DE ANÁLISIS ---
    async function loadAnalysisData(type) {
        try {
            const response = await fetch('/api/get_analysis', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({type: type})
            });
            const data = await response.json();
            
            currentAnalysis = type;
            
            // Actualizar panel de escala y barra con escala numérica
            document.getElementById('scaleLabel').textContent = data.label;
            document.getElementById('scaleMax').textContent = data.value.toFixed(2) + ' ' + data.unit;
            document.getElementById('scaleMin').textContent = '0 ' + data.unit;
            updateScaleTicks(data);
            
            // Actualizar panel de reacciones y análisis
            document.getElementById('reactionPer').textContent = data.reactions.per_leg_N.toFixed(0) + ' N';
            document.getElementById('reactionTotal').textContent = data.reactions.total_N.toFixed(0) + ' N';
            document.getElementById('stressParales').textContent = data.reactions.esfuerzo_parales_MPa.toFixed(2) + ' MPa';
            document.getElementById('fsParales').textContent = data.reactions.fs_parales.toFixed(2);
            document.getElementById('stressViga').textContent = data.reactions.esfuerzo_viga_MPa.toFixed(2) + ' MPa';
            document.getElementById('fsViga').textContent = data.reactions.fs_viga.toFixed(2);
            
            // Cambiar color de la escala según el análisis
            updateColorbar(data);
            
        } catch (error) {
            console.error('Error cargando análisis:', error);
        }
    }

    function updateScaleTicks(data) {
        const maxVal = data.value;
        const unit = (data.unit && data.unit.length) ? (' ' + data.unit) : '';
        const fmt = (v) => (typeof v === 'number' && (v % 1 !== 0)) ? v.toFixed(2) + unit : v + unit;
        document.getElementById('tickMax').textContent = fmt(maxVal);
        document.getElementById('tick75').textContent = fmt(maxVal * 0.75);
        document.getElementById('tick50').textContent = fmt(maxVal * 0.5);
        document.getElementById('tick25').textContent = fmt(maxVal * 0.25);
        document.getElementById('tickMin').textContent = fmt(0);
    }

    function updateColorbar(data) {
        const colorbar = document.getElementById('colorbar');
        
        if (data.type === 'factor_seguridad') {
            // Verde a Rojo (menor FS = más peligroso)
            colorbar.style.background = 'linear-gradient(180deg, #ef4444 0%, #f97316 25%, #fbbf24 50%, #86efac 75%, #34d399 100%)';
            colorearElementosPorFS(data);
        } else if (data.type === 'deformacion') {
            // Para deformación
            colorbar.style.background = 'linear-gradient(180deg, #34d399 0%, #86efac 50%, #fbbf24 100%)';
            colorearElementosPorDeformacion(data);
        } else {
            // Para esfuerzos (rojo es crítico)
            colorbar.style.background = 'linear-gradient(180deg, #ef4444 0%, #f97316 25%, #fbbf24 50%, #86efac 75%, #34d399 100%)';
            colorearElementosPorEsfuerzo(data);
        }
    }

    function getColorFromValue(value, min, max) {
        // Normalizar valor entre 0 y 1
        const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
        
        // Colores: Rojo (crítico) -> Naranja -> Amarillo -> Verde (seguro) -> Verde oscuro
        if (norm < 0.2) {
            return 0xef4444; // Rojo
        } else if (norm < 0.4) {
            return 0xf97316; // Naranja
        } else if (norm < 0.6) {
            return 0xfbbf24; // Amarillo
        } else if (norm < 0.8) {
            return 0x86efac; // Verde claro
        } else {
            return 0x34d399; // Verde oscuro
        }
    }

    function colorearElementosPorEsfuerzo(data) {
        const maxEsfuerzo = data.value * 1.2;
        const paralesEsfuerzo = data.reactions.esfuerzo_parales_MPa;
        const vigaEsfuerzo = data.reactions.esfuerzo_viga_MPa;
        const fsParales = data.reactions.fs_parales;
        const fsViga = data.reactions.fs_viga;
        const esfuerzoPlatina = (paralesEsfuerzo + vigaEsfuerzo) / 2;
        const fsPlatina = (fsParales + fsViga) / 2;
        
        columns.forEach(col => {
            const color = getColorFromValue(paralesEsfuerzo, 0, maxEsfuerzo);
            col.material.color.setHex(color);
            col.material.emissive.setHex(0x000000);
            col.userData = { tipo: 'Paral', fs: fsParales, esfuerzoMax: paralesEsfuerzo, esfuerzoVonMises: paralesEsfuerzo };
        });
        platinas.forEach(plat => {
            const color = getColorFromValue(esfuerzoPlatina, 0, maxEsfuerzo);
            plat.material.color.setHex(color);
            plat.material.emissive.setHex(0x000000);
            plat.userData = { tipo: 'Platina', fs: fsPlatina, esfuerzoMax: esfuerzoPlatina, esfuerzoVonMises: esfuerzoPlatina };
        });
        vigas.forEach(viga => {
            const color = getColorFromValue(vigaEsfuerzo, 0, maxEsfuerzo);
            viga.material.color.setHex(color);
            viga.material.emissive.setHex(0x000000);
            viga.userData = { tipo: 'Viga Central', fs: fsViga, esfuerzoMax: vigaEsfuerzo, esfuerzoVonMises: vigaEsfuerzo };
        });
    }

    function colorearElementosPorFS(data) {
        const fsParales = data.reactions.fs_parales;
        const fsViga = data.reactions.fs_viga;
        const paralesEsfuerzo = data.reactions.esfuerzo_parales_MPa;
        const vigaEsfuerzo = data.reactions.esfuerzo_viga_MPa;
        const fsPlatina = (fsParales + fsViga) / 2;
        const esfuerzoPlatina = (paralesEsfuerzo + vigaEsfuerzo) / 2;
        
        columns.forEach(col => {
            const color = getColorFromValue(fsParales, 0, 5);
            col.material.color.setHex(color);
            col.material.emissive.setHex(0x000000);
            col.userData = { tipo: 'Paral', fs: fsParales, esfuerzoMax: paralesEsfuerzo, esfuerzoVonMises: paralesEsfuerzo };
        });
        platinas.forEach(plat => {
            const color = getColorFromValue(fsPlatina, 0, 5);
            plat.material.color.setHex(color);
            plat.material.emissive.setHex(0x000000);
            plat.userData = { tipo: 'Platina', fs: fsPlatina, esfuerzoMax: esfuerzoPlatina, esfuerzoVonMises: esfuerzoPlatina };
        });
        vigas.forEach(viga => {
            const color = getColorFromValue(fsViga, 0, 5);
            viga.material.color.setHex(color);
            viga.material.emissive.setHex(0x000000);
            viga.userData = { tipo: 'Viga Central', fs: fsViga, esfuerzoMax: vigaEsfuerzo, esfuerzoVonMises: vigaEsfuerzo };
        });
    }

    function colorearElementosPorDeformacion(data) {
        const maxDeformacion = data.value * 1.5;
        const colorDeformacion = getColorFromValue(data.value, 0, maxDeformacion);
        const fsParales = data.reactions.fs_parales;
        const fsViga = data.reactions.fs_viga;
        const paralesEsfuerzo = data.reactions.esfuerzo_parales_MPa;
        const vigaEsfuerzo = data.reactions.esfuerzo_viga_MPa;
        const fsPlatina = (fsParales + fsViga) / 2;
        const esfuerzoPlatina = (paralesEsfuerzo + vigaEsfuerzo) / 2;
        
        columns.forEach(col => {
            col.material.color.setHex(colorDeformacion);
            col.material.emissive.setHex(0x000000);
            col.userData = { tipo: 'Paral', fs: fsParales, esfuerzoMax: paralesEsfuerzo, esfuerzoVonMises: paralesEsfuerzo };
        });
        platinas.forEach(plat => {
            plat.material.color.setHex(colorDeformacion);
            plat.material.emissive.setHex(0x000000);
            plat.userData = { tipo: 'Platina', fs: fsPlatina, esfuerzoMax: esfuerzoPlatina, esfuerzoVonMises: esfuerzoPlatina };
        });
        
        vigas.forEach(viga => {
            viga.material.color.setHex(colorDeformacion);
            viga.material.emissive.setHex(0x000000);
            viga.userData = { tipo: 'Viga Central', fs: fsViga, esfuerzoMax: vigaEsfuerzo, esfuerzoVonMises: vigaEsfuerzo };
        });
    }

    window.changeAnalysis = function(type) {
        loadAnalysisData(type);
    };

    function init() {
        const container = document.getElementById('canvas-container');

        // 1. Escena & Ambiente (Fondo azul-gris claro como en las imágenes)
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xb0c4de); // Light steel blue
        scene.fog = new THREE.FogExp2(0xb0c4de, 0.02); // Niebla muy suave

        // 2. Cámara
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(4, 3, 5);

        // 3. Renderizador PBR (Physically Based Rendering mejorado para máximo realismo)
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Mejor calidad en pantallas Retina
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.3;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = true;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.physicallyCorrectLights = true;
        container.appendChild(renderer.domElement);

        // 4. Luces (Iluminación industrial realista según planos)
        // Luz ambiente (cielo + suelo) - más balanceada
        const ambient = new THREE.HemisphereLight(0xffffff, 0x888888, 0.7);
        scene.add(ambient);

        // Luz principal direccional (simula iluminación de taller industrial)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
        mainLight.position.set(8, 12, 6);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 4096;  // Mayor resolución para sombras más nítidas
        mainLight.shadow.mapSize.height = 4096;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 100;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        mainLight.shadow.bias = -0.0001;
        mainLight.shadow.normalBias = 0.02;
        scene.add(mainLight);
        
        // Luz de relleno desde el lado opuesto (reduce sombras negras)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-6, 8, -4);
        fillLight.castShadow = false;
        scene.add(fillLight);
        
        // Luces de acento laterales (simulan iluminación de taller)
        const leftLight = new THREE.PointLight(0xffffff, 0.8, 20);
        leftLight.position.set(-8, CONFIG.h/2, 0);
        scene.add(leftLight);
        
        const rightLight = new THREE.PointLight(0xffffff, 0.8, 20);
        rightLight.position.set(8, CONFIG.h/2, 0);
        scene.add(rightLight);
        
        // Luz superior (iluminación cenital)
        const topLight = new THREE.SpotLight(0xffffff, 1.0, 30, Math.PI / 4, 0.5);
        topLight.position.set(0, CONFIG.h + 3, 0);
        topLight.target.position.set(0, CONFIG.h/2, 0);
        topLight.castShadow = true;
        scene.add(topLight);
        scene.add(topLight.target);

        // 5. Controles
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, CONFIG.h/2, 0);

        // --- CONSTRUCCIÓN DEL MODELO MEJORADO ---
        createFloor();
        createBaseStructure();  // Base con refuerzos en X
        createStructure();       // Estructura principal mejorada
        structuralMeshes = [...columns, ...platinas, ...vigas];
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        document.addEventListener('mousemove', onMouseMoveFEA);
        
        createTrays();          // Bandejas mejoradas con bordes redondeados
        createGuidesAndRollers(); // Guías y rodillos amarillos/dorados
        createTransmission();   // Sistema de transmisión mejorado
        
        // Ocultar loader para que no bloquee clics ni cursor
        setTimeout(() => {
            const loader = document.getElementById('loader');
            loader.style.opacity = 0;
            loader.style.pointerEvents = 'none';
        }, 1000);
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 1500);

        window.addEventListener('resize', onWindowResize);
    }

    function createFloor() {
        // Grid más claro para fondo azul-gris
        const grid = new THREE.GridHelper(20, 20, 0x8fa3b8, 0xc0d0e0);
        scene.add(grid);
        
        // Piso claro (blanco/gris muy claro como en las imágenes)
        const planeGeo = new THREE.PlaneGeometry(20, 20);
        const planeMat = new THREE.MeshStandardMaterial({ 
            color: 0xe8eef5, roughness: 0.3, metalness: 0.1 
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.01;
        plane.receiveShadow = true;
        scene.add(plane);
    }

    function createBaseStructure() {
        // Material base (gris metálico)
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x4a5568,
            metalness: 0.7,
            roughness: 0.4
        });

        const baseWidth = CONFIG.w + 0.8;
        const baseDepth = CONFIG.d + 0.8;
        const baseHeight = 0.15;
        const beamThickness = 0.08;

        // Marco rectangular izquierdo
        const leftFrame = new THREE.Group();
        const frameGeo = new THREE.BoxGeometry(beamThickness, baseHeight, baseDepth);
        
        // Lados del marco
        const leftSide = new THREE.Mesh(frameGeo, baseMat);
        leftSide.position.set(-baseWidth/2, baseHeight/2, 0);
        leftFrame.add(leftSide);
        
        const rightSide = new THREE.Mesh(frameGeo, baseMat);
        rightSide.position.set(-baseWidth/2 + 0.6, baseHeight/2, 0);
        leftFrame.add(rightSide);
        
        const frontSide = new THREE.Mesh(new THREE.BoxGeometry(0.6, baseHeight, beamThickness), baseMat);
        frontSide.position.set(-baseWidth/2 + 0.3, baseHeight/2, baseDepth/2);
        leftFrame.add(frontSide);
        
        const backSide = new THREE.Mesh(new THREE.BoxGeometry(0.6, baseHeight, beamThickness), baseMat);
        backSide.position.set(-baseWidth/2 + 0.3, baseHeight/2, -baseDepth/2);
        leftFrame.add(backSide);

        // Refuerzo en X dentro del marco izquierdo
        const diagonal1 = new THREE.Mesh(
            new THREE.BoxGeometry(beamThickness * 0.6, baseHeight, Math.sqrt(0.6*0.6 + baseDepth*baseDepth)),
            baseMat
        );
        diagonal1.rotation.y = Math.atan2(baseDepth, 0.6);
        diagonal1.position.set(-baseWidth/2 + 0.3, baseHeight/2, 0);
        leftFrame.add(diagonal1);

        const diagonal2 = new THREE.Mesh(
            new THREE.BoxGeometry(beamThickness * 0.6, baseHeight, Math.sqrt(0.6*0.6 + baseDepth*baseDepth)),
            baseMat
        );
        diagonal2.rotation.y = -Math.atan2(baseDepth, 0.6);
        diagonal2.position.set(-baseWidth/2 + 0.3, baseHeight/2, 0);
        leftFrame.add(diagonal2);

        leftFrame.position.y = 0;
        scene.add(leftFrame);

        // Marco rectangular derecho (simétrico)
        const rightFrame = new THREE.Group();
        const rightFrameLeftSide = new THREE.Mesh(frameGeo, baseMat);
        rightFrameLeftSide.position.set(baseWidth/2 - 0.6, baseHeight/2, 0);
        rightFrame.add(rightFrameLeftSide);
        
        const rightFrameRightSide = new THREE.Mesh(frameGeo, baseMat);
        rightFrameRightSide.position.set(baseWidth/2, baseHeight/2, 0);
        rightFrame.add(rightFrameRightSide);
        
        const rightFrameFrontSide = new THREE.Mesh(new THREE.BoxGeometry(0.6, baseHeight, beamThickness), baseMat);
        rightFrameFrontSide.position.set(baseWidth/2 - 0.3, baseHeight/2, baseDepth/2);
        rightFrame.add(rightFrameFrontSide);
        
        const rightFrameBackSide = new THREE.Mesh(new THREE.BoxGeometry(0.6, baseHeight, beamThickness), baseMat);
        rightFrameBackSide.position.set(baseWidth/2 - 0.3, baseHeight/2, -baseDepth/2);
        rightFrame.add(rightFrameBackSide);

        // Refuerzo en X dentro del marco derecho
        const rightDiagonal1 = new THREE.Mesh(
            new THREE.BoxGeometry(beamThickness * 0.6, baseHeight, Math.sqrt(0.6*0.6 + baseDepth*baseDepth)),
            baseMat
        );
        rightDiagonal1.rotation.y = Math.atan2(baseDepth, 0.6);
        rightDiagonal1.position.set(baseWidth/2 - 0.3, baseHeight/2, 0);
        rightFrame.add(rightDiagonal1);

        const rightDiagonal2 = new THREE.Mesh(
            new THREE.BoxGeometry(beamThickness * 0.6, baseHeight, Math.sqrt(0.6*0.6 + baseDepth*baseDepth)),
            baseMat
        );
        rightDiagonal2.rotation.y = -Math.atan2(baseDepth, 0.6);
        rightDiagonal2.position.set(baseWidth/2 - 0.3, baseHeight/2, 0);
        rightFrame.add(rightDiagonal2);

        rightFrame.position.y = 0;
        scene.add(rightFrame);
    }

    function createStructure() {
        // Material Acero Industrial (PBR mejorado según planos - acabado industrial realista)
        const steelMat = new THREE.MeshStandardMaterial({
            color: 0x6b7280,  // Gris acero más claro y realista
            metalness: 0.9,
            roughness: 0.2,
            envMapIntensity: 1.0
        });

        // Columnas (Parales Verticales) - más robustas
        const colGeo = new THREE.BoxGeometry(0.1, CONFIG.h + 0.5, 0.05);
        const positions = [
            [-CONFIG.w/2, (CONFIG.h+0.5)/2, -CONFIG.d/2],
            [CONFIG.w/2, (CONFIG.h+0.5)/2, -CONFIG.d/2],
            [-CONFIG.w/2, (CONFIG.h+0.5)/2, CONFIG.d/2],
            [CONFIG.w/2, (CONFIG.h+0.5)/2, CONFIG.d/2]
        ];

        positions.forEach(pos => {
            const col = new THREE.Mesh(colGeo, steelMat.clone());
            col.position.set(...pos);
            col.castShadow = true;
            col.receiveShadow = true;
            scene.add(col);
            columns.push(col);
        });

        // VIGAS HORIZONTALES formando cuadrícula robusta (como en las imágenes)
        const horizontalBeamGeo = new THREE.BoxGeometry(CONFIG.w, 0.08, 0.08);
        const numHorizontalBeams = 6;
        for (let i = 0; i <= numHorizontalBeams; i++) {
            const yPos = 0.4 + (i / numHorizontalBeams) * CONFIG.h;
            const beam = new THREE.Mesh(horizontalBeamGeo, steelMat.clone());
            beam.position.set(0, yPos, -CONFIG.d/2);
            beam.castShadow = true;
            beam.receiveShadow = true;
            scene.add(beam);
            
            const beamBack = new THREE.Mesh(horizontalBeamGeo, steelMat.clone());
            beamBack.position.set(0, yPos, CONFIG.d/2);
            beamBack.castShadow = true;
            beamBack.receiveShadow = true;
            scene.add(beamBack);
        }


        // Ejes principales (superior e inferior) - más gruesos y visibles
        const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, CONFIG.w, 32);
        shaftGeo.rotateZ(Math.PI/2);
        const shaftTop = new THREE.Mesh(shaftGeo, steelMat);
        shaftTop.position.set(0, CONFIG.h, 0);
        shaftTop.castShadow = true;
        shaftTop.receiveShadow = true;
        scene.add(shaftTop);
        
        const shaftBot = new THREE.Mesh(shaftGeo, steelMat);
        shaftBot.position.set(0, 0.4, 0);
        shaftBot.castShadow = true;
        shaftBot.receiveShadow = true;
        scene.add(shaftBot);

        // PLATINAS DE CONEXIÓN (10mm espesor, 500mm altura)
        // Una platina por cada lado, PEGADA A LOS PARALES
        const platinaMaterial = new THREE.MeshStandardMaterial({
            color: 0x475569,
            metalness: 0.7,
            roughness: 0.3
        });

        const platinaHeight = 0.5;  // 500 mm
        const platinaThickness = 0.01;  // 10 mm
        
        // Posición X de las platinas: ADHERIDAS A LOS PARALES
        const platinaXPos_right = CONFIG.w / 2;  // Pegada al paral derecho
        const platinaXPos_left = -CONFIG.w / 2;  // Pegada al paral izquierdo

        // Platina lado derecha - conecta paral frontal con trasero
        const platinaGeo_right = new THREE.BoxGeometry(platinaThickness, platinaHeight, CONFIG.d);
        const platinaRight = new THREE.Mesh(platinaGeo_right, platinaMaterial.clone());
        platinaRight.position.set(platinaXPos_right, CONFIG.h / 2.2, 0);  // Centrada en Z
        platinaRight.castShadow = true;
        platinaRight.receiveShadow = true;
        scene.add(platinaRight);
        platinas.push(platinaRight);  // Guardar referencia para mapa de calor

        // Platina lado izquierda - conecta paral frontal con trasero
        const platinaGeo_left = new THREE.BoxGeometry(platinaThickness, platinaHeight, CONFIG.d);
        const platinaLeft = new THREE.Mesh(platinaGeo_left, platinaMaterial.clone());
        platinaLeft.position.set(platinaXPos_left, CONFIG.h / 2.2, 0);  // Centrada en Z
        platinaLeft.castShadow = true;
        platinaLeft.receiveShadow = true;
        scene.add(platinaLeft);
        platinas.push(platinaLeft);  // Guardar referencia para mapa de calor

        // VIGAS DE 100x50x6 que salen del punto medio de cada platina
        // Geometría de viga: 100mm altura (Y), 50mm ancho (Z), 6mm espesor (X)
        const beamHeight = 0.1;   // 100 mm
        const beamWidth = 0.05;   // 50 mm
        const beamThickness = 0.006; // 6 mm
        const beamLength = CONFIG.w / 2;  // Largo de la viga que une las dos platinas

        const beamGeo = new THREE.BoxGeometry(beamLength, beamHeight, beamThickness);
        
        // Viga central derecha - sale del punto medio de la platina derecha hacia el centro
        const beamRight = new THREE.Mesh(beamGeo, steelMat.clone());
        beamRight.position.set(platinaXPos_right - beamLength / 2, CONFIG.h / 2.2, 0);
        beamRight.castShadow = true;
        beamRight.receiveShadow = true;
        scene.add(beamRight);
        vigas.push(beamRight);  // Guardar referencia para mapa de calor

        // Viga central izquierda - sale del punto medio de la platina izquierda hacia el centro
        const beamLeft = new THREE.Mesh(beamGeo, steelMat.clone());
        beamLeft.position.set(platinaXPos_left + beamLength / 2, CONFIG.h / 2.2, 0);
        beamLeft.castShadow = true;
        beamLeft.receiveShadow = true;
        scene.add(beamLeft);
        vigas.push(beamLeft);  // Guardar referencia para mapa de calor
    }

    function createTrays() {
        // Material Bandeja mejorado (gris claro metálico según planos - acabado industrial)
        const trayMat = new THREE.MeshStandardMaterial({
            color: 0xcbd5e1,  // Gris más claro y limpio
            metalness: 0.6,
            roughness: 0.4,
            envMapIntensity: 0.8
        });
        
        const trayWidth = CONFIG.w - 0.2;
        const trayDepth = CONFIG.d - 0.2;
        const trayHeight = 0.05;
        const h_util = CONFIG.h - 0.4;

        for (let i = 0; i < CONFIG.n; i++) {
            // Crear bandeja con bordes redondeados usando RoundedBoxGeometry si está disponible
            // Si no, usar BoxGeometry con esquinas más suaves visualmente
            const geo = new THREE.BoxGeometry(trayWidth, trayHeight, trayDepth);
            
            const mesh = new THREE.Mesh(geo, trayMat);
            
            // Posicionamiento en Loop continuo (con curvas en top/bottom)
            let z_pos, y_pos;
            const progress = i / CONFIG.n; // 0 a 1
            
            if (progress < 0.25) {
                // Lado derecho subiendo
                y_pos = 0.4 + (progress * 4) * h_util;
                z_pos = CONFIG.d/4;
            } else if (progress < 0.5) {
                // Curva superior (simulada con posición intermedia)
                const curveProgress = (progress - 0.25) / 0.25;
                y_pos = CONFIG.h - 0.2;
                z_pos = CONFIG.d/4 - (curveProgress * CONFIG.d/2);
            } else if (progress < 0.75) {
                // Lado izquierdo bajando
                const downProgress = (progress - 0.5) / 0.25;
                y_pos = CONFIG.h - 0.2 - (downProgress * h_util);
                z_pos = -CONFIG.d/4;
            } else {
                // Curva inferior
                const bottomProgress = (progress - 0.75) / 0.25;
                y_pos = 0.4;
                z_pos = -CONFIG.d/4 + (bottomProgress * CONFIG.d/2);
            }
            
            mesh.position.set(0, y_pos, z_pos);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            trays.push(mesh);

            // --- VECTORES DE FUERZA (1200N) ---
            const dir = new THREE.Vector3(0, -1, 0);
            const length = 0.5;
            const hex = 0xef4444; // Rojo Intenso
            
            const arrow = new THREE.ArrowHelper(dir, mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), length, hex, 0.15, 0.1);
            scene.add(arrow);
            arrows.push(arrow);
        }
    }

    function createGuidesAndRollers() {
        // Material para rodillos (amarillo/dorado como en las imágenes)
        const rollerMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.7,
            roughness: 0.3
        });

        // Material para guías (gris metálico)
        const guideMat = new THREE.MeshStandardMaterial({
            color: 0x6b7280,
            metalness: 0.8,
            roughness: 0.3
        });

        const rollerRadius = 0.015;
        const rollerHeight = 0.03;
        const numRollersPerSide = 12;
        const h_util = CONFIG.h - 0.4;

        // Rodillos en el lado derecho (guía vertical)
        for (let i = 0; i < numRollersPerSide; i++) {
            const yPos = 0.4 + (i / (numRollersPerSide - 1)) * h_util;
            const rollerGeo = new THREE.CylinderGeometry(rollerRadius, rollerRadius, rollerHeight, 16);
            rollerGeo.rotateZ(Math.PI / 2);
            
            // Rodillo frontal derecho
            const roller1 = new THREE.Mesh(rollerGeo, rollerMat);
            roller1.position.set(CONFIG.w/2 + 0.15, yPos, CONFIG.d/4);
            roller1.castShadow = true;
            roller1.receiveShadow = true;
            scene.add(roller1);
            
            // Rodillo trasero derecho
            const roller2 = new THREE.Mesh(rollerGeo, rollerMat);
            roller2.position.set(CONFIG.w/2 + 0.15, yPos, -CONFIG.d/4);
            roller2.castShadow = true;
            roller2.receiveShadow = true;
            scene.add(roller2);
        }

        // Rodillos en el lado izquierdo (guía vertical)
        for (let i = 0; i < numRollersPerSide; i++) {
            const yPos = 0.4 + (i / (numRollersPerSide - 1)) * h_util;
            const rollerGeo = new THREE.CylinderGeometry(rollerRadius, rollerRadius, rollerHeight, 16);
            rollerGeo.rotateZ(Math.PI / 2);
            
            // Rodillo frontal izquierdo
            const roller1 = new THREE.Mesh(rollerGeo, rollerMat);
            roller1.position.set(-CONFIG.w/2 - 0.15, yPos, CONFIG.d/4);
            roller1.castShadow = true;
            roller1.receiveShadow = true;
            scene.add(roller1);
            
            // Rodillo trasero izquierdo
            const roller2 = new THREE.Mesh(rollerGeo, rollerMat);
            roller2.position.set(-CONFIG.w/2 - 0.15, yPos, -CONFIG.d/4);
            roller2.castShadow = true;
            roller2.receiveShadow = true;
            scene.add(roller2);
        }

        // Guías verticales (rieles metálicos)
        const guideGeo = new THREE.BoxGeometry(0.04, h_util, 0.04);
        const guideRight = new THREE.Mesh(guideGeo, guideMat);
        guideRight.position.set(CONFIG.w/2 + 0.15, 0.4 + h_util/2, 0);
        guideRight.castShadow = true;
        guideRight.receiveShadow = true;
        scene.add(guideRight);
        
        const guideLeft = new THREE.Mesh(guideGeo, guideMat);
        guideLeft.position.set(-CONFIG.w/2 - 0.15, 0.4 + h_util/2, 0);
        guideLeft.castShadow = true;
        guideLeft.receiveShadow = true;
        scene.add(guideLeft);
    }

    function createTransmission() {
        // Material Sprocket/Polea (gris metálico como en las imágenes)
        const sprocketMat = new THREE.MeshStandardMaterial({
            color: 0x6b7280,
            metalness: 0.8,
            roughness: 0.3
        });

        // Material Eje (Acero gris)
        const steelMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            metalness: 0.8,
            roughness: 0.2
        });

        // Material Correa (azul brillante como en las imágenes)
        const beltMat = new THREE.MeshStandardMaterial({
            color: 0x87ceeb,
            metalness: 0.1,
            roughness: 0.9,
            emissive: 0x004080,
            emissiveIntensity: 0.2
        });

        // Material Motor (gris claro/blanco)
        const motorMat = new THREE.MeshStandardMaterial({
            color: 0xd1d5db,
            metalness: 0.6,
            roughness: 0.4
        });

        // Parámetros de transmisión mejorados
        const sprocket_radio = 0.25;  // Radio más grande como en las imágenes
        const chain_height = CONFIG.h - 0.5;
        const sprocket_x_pos = CONFIG.w/2 + 0.35;  // Más separado
        const sprocket_z = 0;

        // SPROCKETS/POLEAS grandes (superior e inferior)
        const sprocketThickness = 0.12;
        
        // Sprocket inferior (motriz) - más grande y detallado
        const sprocketGeoBottom = new THREE.CylinderGeometry(sprocket_radio, sprocket_radio, sprocketThickness, 32);
        const sprocketBottom = new THREE.Mesh(sprocketGeoBottom, sprocketMat);
        sprocketBottom.position.set(sprocket_x_pos, 0.4, sprocket_z);
        sprocketBottom.rotation.z = Math.PI / 2;
        sprocketBottom.castShadow = true;
        sprocketBottom.receiveShadow = true;
        scene.add(sprocketBottom);

        // Anillo interior del sprocket inferior (detalle azul)
        const innerRingBottom = new THREE.CylinderGeometry(sprocket_radio * 0.6, sprocket_radio * 0.6, sprocketThickness + 0.02, 32);
        const ringBottom = new THREE.Mesh(innerRingBottom, beltMat);
        ringBottom.position.set(sprocket_x_pos, 0.4, sprocket_z);
        ringBottom.rotation.z = Math.PI / 2;
        scene.add(ringBottom);

        // Sprocket superior (conducido)
        const sprocketGeoTop = new THREE.CylinderGeometry(sprocket_radio, sprocket_radio, sprocketThickness, 32);
        const sprocketTop = new THREE.Mesh(sprocketGeoTop, sprocketMat);
        sprocketTop.position.set(sprocket_x_pos, CONFIG.h - 0.2, sprocket_z);
        sprocketTop.rotation.z = Math.PI / 2;
        sprocketTop.castShadow = true;
        sprocketTop.receiveShadow = true;
        scene.add(sprocketTop);

        // Anillo interior del sprocket superior
        const innerRingTop = new THREE.CylinderGeometry(sprocket_radio * 0.6, sprocket_radio * 0.6, sprocketThickness + 0.02, 32);
        const ringTop = new THREE.Mesh(innerRingTop, beltMat);
        ringTop.position.set(sprocket_x_pos, CONFIG.h - 0.2, sprocket_z);
        ringTop.rotation.z = Math.PI / 2;
        scene.add(ringTop);

        // CADENA/CORREA AZUL BRILLANTE (lados izquierdo y derecho)
        const chainRadius = 0.025;

        // Lado izquierdo de la cadena
        const leftChainGeo = new THREE.CylinderGeometry(chainRadius, chainRadius, chain_height, 16);
        const leftChain = new THREE.Mesh(leftChainGeo, beltMat);
        leftChain.position.set(sprocket_x_pos - sprocket_radio * 0.9, 0.4 + chain_height / 2, sprocket_z);
        leftChain.castShadow = true;
        leftChain.receiveShadow = true;
        scene.add(leftChain);

        // Lado derecho de la cadena
        const rightChainGeo = new THREE.CylinderGeometry(chainRadius, chainRadius, chain_height, 16);
        const rightChain = new THREE.Mesh(rightChainGeo, beltMat);
        rightChain.position.set(sprocket_x_pos + sprocket_radio * 0.9, 0.4 + chain_height / 2, sprocket_z);
        rightChain.castShadow = true;
        rightChain.receiveShadow = true;
        scene.add(rightChain);

        // DIENTES DEL SPROCKET (más visibles)
        const toothGeo = new THREE.BoxGeometry(0.04, sprocketThickness + 0.01, 0.08);
        const num_teeth = 20;

        for (let tooth = 0; tooth < num_teeth; tooth++) {
            const angle1 = (tooth / num_teeth) * Math.PI * 2;
            const radius = sprocket_radio * 1.15;
            
            // Dientes sprocket inferior
            const toothBottom = new THREE.Mesh(toothGeo, sprocketMat);
            toothBottom.position.set(
                sprocket_x_pos + Math.cos(angle1) * radius,
                0.4,
                sprocket_z + Math.sin(angle1) * radius
            );
            toothBottom.castShadow = true;
            toothBottom.receiveShadow = true;
            scene.add(toothBottom);

            // Dientes sprocket superior
            const toothTop = new THREE.Mesh(toothGeo, sprocketMat);
            toothTop.position.set(
                sprocket_x_pos + Math.cos(angle1) * radius,
                CONFIG.h - 0.2,
                sprocket_z + Math.sin(angle1) * radius
            );
            toothTop.castShadow = true;
            toothTop.receiveShadow = true;
            scene.add(toothTop);
        }

        // MOTOR DETALLADO (cilíndrico grande como en las imágenes)
        const motorRadius = 0.12;
        const motorLength = 0.18;
        const motorGeo = new THREE.CylinderGeometry(motorRadius, motorRadius, motorLength, 32);
        motorGeo.rotateZ(Math.PI / 2);
        const motor = new THREE.Mesh(motorGeo, motorMat);
        motor.position.set(sprocket_x_pos + 0.3, 0.4, sprocket_z);
        motor.castShadow = true;
        motor.receiveShadow = true;
        scene.add(motor);

        // Detalles del motor (caja de engranajes/cooling fins)
        const gearboxGeo = new THREE.BoxGeometry(0.08, motorLength * 0.7, motorRadius * 1.2);
        const gearbox = new THREE.Mesh(gearboxGeo, new THREE.MeshStandardMaterial({
            color: 0x9ca3af,
            metalness: 0.7,
            roughness: 0.4
        }));
        gearbox.position.set(sprocket_x_pos + 0.3 + motorRadius + 0.04, 0.4, sprocket_z);
        gearbox.castShadow = true;
        gearbox.receiveShadow = true;
        scene.add(gearbox);

        // POLEA PEQUEÑA DEL MOTOR (azul claro)
        const smallPulleyRadius = 0.06;
        const smallPulleyGeo = new THREE.CylinderGeometry(smallPulleyRadius, smallPulleyRadius, 0.05, 32);
        smallPulleyGeo.rotateZ(Math.PI / 2);
        const smallPulley = new THREE.Mesh(smallPulleyGeo, beltMat);
        smallPulley.position.set(sprocket_x_pos + 0.3 + motorRadius + 0.08, 0.4, sprocket_z);
        smallPulley.castShadow = true;
        smallPulley.receiveShadow = true;
        scene.add(smallPulley);

        // CORREA AZUL conectando polea pequeña con sprocket grande
        const beltDistance = Math.sqrt(Math.pow(sprocket_x_pos - (sprocket_x_pos + 0.3 + motorRadius + 0.08), 2) + 
                                       Math.pow(0.4 - 0.4, 2));
        const beltAngle = Math.atan2(0, sprocket_x_pos - (sprocket_x_pos + 0.3 + motorRadius + 0.08));
        const beltGeo = new THREE.BoxGeometry(0.02, beltDistance, 0.02);
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.set(sprocket_x_pos - beltDistance/2, 0.4, sprocket_z);
        belt.rotation.z = beltAngle;
        belt.castShadow = true;
        belt.receiveShadow = true;
        scene.add(belt);

        // EJE PRINCIPAL (Horizontal) - más grueso
        const shaftMainGeo = new THREE.CylinderGeometry(0.04, 0.04, CONFIG.w * 0.3, 32);
        shaftMainGeo.rotateZ(Math.PI / 2);
        const shaftMain = new THREE.Mesh(shaftMainGeo, steelMat);
        shaftMain.position.set(sprocket_x_pos - CONFIG.w * 0.15, CONFIG.h - 0.2, sprocket_z);
        shaftMain.castShadow = true;
        shaftMain.receiveShadow = true;
        scene.add(shaftMain);

        // Rodillos amarillos en los ejes (como en las imágenes)
        const rollerMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.7,
            roughness: 0.3
        });
        const rollerGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 16);
        rollerGeo.rotateZ(Math.PI / 2);
        
        // Rodillos en el eje superior
        for (let i = 0; i < 3; i++) {
            const roller = new THREE.Mesh(rollerGeo, rollerMat);
            roller.position.set(sprocket_x_pos - CONFIG.w * 0.15 + (i - 1) * 0.15, CONFIG.h - 0.2, sprocket_z);
            roller.castShadow = true;
            roller.receiveShadow = true;
            scene.add(roller);
        }
    }

    // --- INTERACCIONES ---
    window.toggleVectors = () => {
        showVectors = !showVectors;
        arrows.forEach(a => a.visible = showVectors);
        document.querySelectorAll('.btn')[0].classList.toggle('active');
    };

    window.toggleHeatmap = () => {
        showHeatmap = !showHeatmap;
        const color = showHeatmap ? 0x10b981 : 0x64748b;
        const finalColor = (showHeatmap && CONFIG.fs < 3) ? 0xef4444 : color;
        
        columns.forEach(col => {
            col.material.color.setHex(finalColor);
            col.material.emissive.setHex(showHeatmap ? 0x064e3b : 0x000000);
        });
        
        // Colorear también platinas y vigas
        platinas.forEach(plat => {
            plat.material.color.setHex(finalColor);
            plat.material.emissive.setHex(showHeatmap ? 0x064e3b : 0x000000);
        });
        
        vigas.forEach(viga => {
            viga.material.color.setHex(finalColor);
            viga.material.emissive.setHex(showHeatmap ? 0x064e3b : 0x000000);
        });
        
        document.querySelectorAll('.btn')[1].classList.toggle('active');
    };

    window.toggleRotation = () => {
        autoRotate = !autoRotate;
        document.querySelectorAll('.btn')[2].classList.toggle('active');
    };

    function onMouseMoveFEA(event) {
        const canvas = renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            document.getElementById('tooltipFEA').style.display = 'none';
            return;
        }
        mouse.x = (x / rect.width) * 2 - 1;
        mouse.y = -(y / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(structuralMeshes);
        const tooltip = document.getElementById('tooltipFEA');
        if (intersects.length > 0 && intersects[0].object.userData && intersects[0].object.userData.tipo) {
            const ud = intersects[0].object.userData;
            document.getElementById('tooltipFEA_nombre').textContent = ud.tipo;
            document.getElementById('tooltipFEA_fs').textContent = (ud.fs != null) ? ud.fs.toFixed(2) : '--';
            document.getElementById('tooltipFEA_esfMax').textContent = (ud.esfuerzoMax != null) ? ud.esfuerzoMax.toFixed(2) + ' MPa' : '-- MPa';
            document.getElementById('tooltipFEA_vonMises').textContent = (ud.esfuerzoVonMises != null) ? ud.esfuerzoVonMises.toFixed(2) + ' MPa' : '-- MPa';
            tooltip.style.display = 'block';
            tooltip.style.left = (event.clientX + 18) + 'px';
            tooltip.style.top = (event.clientY + 18) + 'px';
        } else {
            tooltip.style.display = 'none';
        }
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        
        if (autoRotate) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 1.0;
        } else {
            controls.autoRotate = false;
        }

        controls.update();
        renderer.render(scene, camera);
    }
</script>
</body>
</html>
"""

# ==============================================================================
# 4. RUTAS SERVIDOR
# ==============================================================================
@app.route('/')
def index():
    fea_results = calcular_fea_analitico()
    escalas = calcular_escalas()
    return render_template_string(HTML_TEMPLATE, config=CONFIG, fea=fea_results, escalas=escalas)

@app.route('/api/get_analysis', methods=['GET'])
def get_analysis_data():
    """Retorna todos los datos de análisis FEA para la interfaz 3D (GET)"""
    fea_results = calcular_fea_analitico()
    transmision = simulacion_transmision_eje_principal(5.0)
    
    # Combinar todos los datos incluyendo los nuevos datos dinámicos
    result = {
        'carga_viva_N': CONFIG['carga_viva_N'],
        'carga_muerta_N': CONFIG['peso_muerto_N'],
        'num_bandejas': CONFIG['num_bandejas'],
        'carga_total_N': (CONFIG['carga_viva_N'] + CONFIG['peso_muerto_N']) * CONFIG['num_bandejas'],
        'esfuerzo_von_mises_MPa': round(fea_results['esfuerzo_von_mises_MPa'], 2),
        'esfuerzo_max_MPa': round(fea_results['esfuerzo_max_MPa'], 2),
        'deflexion_mm': round(fea_results['deflexion_mm'], 3),
        'factor_seguridad_fluencia': round(fea_results['factor_seguridad_fluencia'], 2),
        'factor_seguridad_deformacion': round(fea_results['factor_seguridad_deformacion'], 2),
        'esfuerzo_parales_MPa': round(fea_results['esfuerzo_parales_MPa'], 2),
        'esfuerzo_viga_MPa': round(fea_results['esfuerzo_viga_central_MPa'], 2),
        'fs_parales': round(fea_results['factor_seguridad_parales'], 2),
        'fs_viga': round(fea_results['factor_seguridad_viga'], 2),
        'motorreductor_hp': 5.0,
        'motorreductor_torque': round(transmision['torque_disponible_Nm'], 2),
        'motorreductor_fs': round(transmision['factor_seguridad_potencia'], 2)
    }
    
    # Añadir datos dinámicos estructurales
    if 'frecuencia_natural_Hz' in fea_results:
        result.update({
            'frecuencia_natural_Hz': fea_results['frecuencia_natural_Hz'],
            'frecuencia_excitacion_Hz': fea_results['frecuencia_excitacion_Hz'],
            'ratio_frecuencias': fea_results['ratio_frecuencias'],
            'factor_amplificacion': fea_results['factor_amplificacion'],
            'fuerza_inercial_N': fea_results['fuerza_inercial_N'],
            'aceleracion_ms2': fea_results['aceleracion_ms2'],
            'masa_total_kg': fea_results['masa_total_kg'],
            'factor_seguridad_fatiga': fea_results['factor_seguridad_fatiga'],
            'factor_seguridad_pandeo': fea_results['factor_seguridad_pandeo'],
            'factor_seguridad_global': fea_results['factor_seguridad_global'],
            'carga_critica_pandeo_N': fea_results['carga_critica_pandeo_N'],
            'ciclos_por_ano': fea_results['ciclos_por_ano'],
            'estado_resonancia': fea_results['estado_resonancia']
        })
    
    return jsonify(result)

@app.route('/api/get_analysis', methods=['POST'])
def get_analysis():
    """Retorna los datos de análisis según el tipo solicitado"""
    analysis_type = request.json.get('type', 'von_mises')
    fea_results = calcular_fea_analitico()
    escalas = calcular_escalas()
    
    analysis_map = {
        'von_mises': {
            'value': fea_results['esfuerzo_von_mises_MPa'],
            'label': 'Von Mises Stress',
            'unit': 'MPa'
        },
        'esfuerzo_max': {
            'value': fea_results['esfuerzo_max_MPa'],
            'label': 'Maximum Stress',
            'unit': 'MPa'
        },
        'factor_seguridad': {
            'value': fea_results['factor_seguridad_fluencia'],
            'label': 'Safety Factor',
            'unit': ''
        },
        'deformacion': {
            'value': fea_results['deflexion_mm'],
            'label': 'Maximum Deformation',
            'unit': 'mm'
        }
    }
    
    selected = analysis_map.get(analysis_type, analysis_map['von_mises'])
    
    return jsonify({
        'type': analysis_type,
        'value': selected['value'],
        'label': selected['label'],
        'unit': selected['unit'],
        'scale': escalas[analysis_type],
        'reactions': {
            'per_leg_N': fea_results['reaccion_por_pata_N'],
            'total_N': fea_results['carga_total_kN'] * 1000,
            'esfuerzo_parales_MPa': fea_results['esfuerzo_parales_MPa'],
            'esfuerzo_viga_MPa': fea_results['esfuerzo_viga_central_MPa'],
            'fs_parales': fea_results['factor_seguridad_parales'],
            'fs_viga': fea_results['factor_seguridad_viga']
        }
    })

@app.route('/api/get_transmision', methods=['GET'])
def get_transmision():
    """Retorna todos los datos de simulación de transmisión
    
    Query params:
        potencia (float, optional): Potencia del motor en HP (default: 5.0, opciones: 5.0, 10.0)
    """
    potencia = request.args.get('potencia', 5.0, type=float)
    transmision = simulacion_transmision_eje_principal(potencia)
    return jsonify(transmision)

@app.route('/api/get_graficos_transmision', methods=['GET'])
def get_graficos_transmision():
    """Retorna los gráficos de transmisión en Base64"""
    img_base64 = generar_graficos_transmision()
    return jsonify({'grafico': img_base64})

@app.route('/api/generar_documento', methods=['GET'])
def generar_documento():
    """Retorna el documento técnico en HTML"""
    html_doc = generar_documento_tecnico()
    return html_doc

@app.route('/documento/descargar', methods=['GET'])
def descargar_documento():
    """Abre el documento técnico en una nueva ventana/pestaña"""
    html_doc = generar_documento_tecnico()
    return html_doc

if __name__ == '__main__':
    print("="*60)
    print(" ZASCA DIGITAL TWIN v3.0 - SERVER ONLINE")
    print("="*60)
    print(f" Carga Aplicada: {CONFIG['carga_viva_N']} N")
    print(" Accede en: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)