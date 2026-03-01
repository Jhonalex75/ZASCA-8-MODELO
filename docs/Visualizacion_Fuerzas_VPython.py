from vpython import *
import numpy as np

def run_vpython_simulation():
    # --- CONFIGURACIÓN DE ESCENA ---
    scene = canvas(title='ZASCA Paternoster - Visualización de Fuerzas (P-002)',
                   width=1000, height=600, center=vector(0, 1.5, 0), background=color.white)
    
    scene.camera.pos = vector(4, 2, 4)
    scene.camera.axis = vector(-4, -1, -4)

    # --- GEOMETRÍA (P-002) ---
    H_TOTAL = 2.779
    W_TOTAL = 2.80
    DEPTH = 1.0 # Estimado para visualización
    
    # Materiales
    color_acero = vector(0.4, 0.4, 0.4)
    color_fuerza = color.red
    color_bandeja = vector(0.2, 0.6, 1.0) # Azul claro
    
    print("Generando Estructura...")

    # 1. COLUMNAS (4 RHS 100x100)
    col_dim = vector(0.1, H_TOTAL, 0.1)
    col1 = box(pos=vector(-W_TOTAL/2, H_TOTAL/2, -DEPTH/2), size=col_dim, color=color_acero)
    col2 = box(pos=vector(W_TOTAL/2, H_TOTAL/2, -DEPTH/2), size=col_dim, color=color_acero)
    col3 = box(pos=vector(-W_TOTAL/2, H_TOTAL/2, DEPTH/2), size=col_dim, color=color_acero)
    col4 = box(pos=vector(W_TOTAL/2, H_TOTAL/2, DEPTH/2), size=col_dim, color=color_acero)
    
    # 2. VIGA PRINCIPAL SUPERIOR (EJE)
    shaft = cylinder(pos=vector(-W_TOTAL/2, H_TOTAL - 0.2, 0), axis=vector(W_TOTAL, 0, 0), radius=0.08, color=color.gray(0.2))
    
    # 3. GUIAS LATERALES Y CADENAS
    guide_l = box(pos=vector(-W_TOTAL/2 + 0.2, H_TOTAL/2, 0), size=vector(0.05, H_TOTAL*0.8, 0.2), color=color.orange, opacity=0.5)
    guide_r = box(pos=vector(W_TOTAL/2 - 0.2, H_TOTAL/2, 0), size=vector(0.05, H_TOTAL*0.8, 0.2), color=color.orange, opacity=0.5)

    # --- BANDEJAS Y FUERZAS ---
    num_bandejas = 20
    spacing = (H_TOTAL * 2) / num_bandejas # Simplificado loop
    
    bandejas = []
    flechas_fuerza = []
    
    # Generar posiciones en el loop (Elipse simplificada)
    t = np.linspace(0, 2*np.pi, num_bandejas, endpoint=False)
    
    path_w = W_TOTAL - 0.8 # Ancho del Loop
    path_h = H_TOTAL - 0.8 # Alto del Loop
    
    for i in range(num_bandejas):
        # Posición paramétrica (Solo visualización)
        # En la realidad es vertical, pero aquí lo haremos un loop visible
        # Vamos a simular el loop vertical: Subida (Frontal) y Bajada (Trasera) para ver mejor
        
        # Lado Derecho (Bajando)
        if i < 10: 
            px = W_TOTAL/3
            py = H_TOTAL - 0.5 - (i * (path_h/10))
            pz = 0
            is_loaded = True # Las 10 primeras llenas
        else:
            px = -W_TOTAL/3
            py = 0.5 + ((i-10) * (path_h/10))
            pz = 0
            is_loaded = False # Retorno vacía
            
        # Bandeja
        b = box(pos=vector(0, py, pz), size=vector(1.8, 0.05, 0.4), color=color_bandeja)
        # Ajuste posición X (simulando que cuelgan de las cadenas laterales)
        # En realidad en Paternoster las bandejas están ENTRE las cadenas.
        # Aquí simplificamos para ver la fuerza.
        
        bandejas.append(b)
        
        # Fuerzas (Vectores)
        if is_loaded:
            # Carga Máxima (150kg = ~1500N)
            f_val = 1500 
            scale = 0.0005
            v_len = f_val * scale
            
            # Flecha roja hacia abajo (Gravedad)
            arrow_force = arrow(pos=b.pos, axis=vector(0, -v_len, 0), color=color.red, shaftwidth=0.05)
            
            # Etiqueta de valor
            if i % 3 == 0: # No etiquetar todas para no saturar
                label(pos=b.pos + vector(0.5, 0, 0), text=f'{f_val}N', box=False, opacity=0, height=10, color=color.red)

    # --- SIMULACIÓN ANIMADA (OSCILACIÓN CARGA) ---
    print("Iniciando Animación...")
    dt = 0.05
    t_sim = 0
    
    while True:
        rate(30)
        t_sim += dt
        
        # Efecto visual: Las fuerzas "pulsan" ligeramente para indicar carga dinámica
        factor = 1.0 + 0.1 * np.sin(5 * t_sim)
        
        # Mover bandejas (Cinemática simple)
        for j, b in enumerate(bandejas):
             # Simular movimiento vertical muy lento
             pass 

if __name__ == "__main__":
    print("Para ver la visualización, ejecute este script localmente con Python instalado y la librería 'vpython'.")
    print("pip install vpython")
    # run_vpython_simulation() # Comentado para no bloquear el agente, el usuario debe correrlo.
