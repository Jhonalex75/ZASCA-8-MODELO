
import matplotlib.pyplot as plt
import numpy as np
from mpl_toolkits.mplot3d import Axes3D

def plot_static_forces():
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # --- GEOMETRÍA (P-002) ---
    H_TOTAL = 2.779
    W_TOTAL = 2.80
    DEPTH = 1.0 
    
    # 1. ESTRUCTURA (Line Frame)
    # Columnas
    ax.plot([-W_TOTAL/2, -W_TOTAL/2], [0, H_TOTAL], [-DEPTH/2, -DEPTH/2], color='gray', linewidth=3) # Col 1
    ax.plot([W_TOTAL/2, W_TOTAL/2], [0, H_TOTAL], [-DEPTH/2, -DEPTH/2], color='gray', linewidth=3)   # Col 2
    ax.plot([-W_TOTAL/2, -W_TOTAL/2], [0, H_TOTAL], [DEPTH/2, DEPTH/2], color='gray', linewidth=3)   # Col 3
    ax.plot([W_TOTAL/2, W_TOTAL/2], [0, H_TOTAL], [DEPTH/2, DEPTH/2], color='gray', linewidth=3)     # Col 4
    
    # Vigas Superiores
    ax.plot([-W_TOTAL/2, W_TOTAL/2], [H_TOTAL, H_TOTAL], [-DEPTH/2, -DEPTH/2], color='gray', linewidth=2)
    ax.plot([-W_TOTAL/2, W_TOTAL/2], [H_TOTAL, H_TOTAL], [DEPTH/2, DEPTH/2], color='gray', linewidth=2)
    
    # Eje Principal (Rojo oscuro)
    ax.plot([-W_TOTAL/2, W_TOTAL/2], [H_TOTAL-0.2, H_TOTAL-0.2], [0, 0], color='darkred', linewidth=4, label='Eje Principal')

    # --- BANDEJAS Y FUERZAS ---
    num_bandejas = 20
    path_w = W_TOTAL - 0.8
    path_h = H_TOTAL - 0.8
    
    # Coordenadas de bandejas (Loop simplificado)
    # Subida (Trasera) y Bajada (Frontal)
    
    xs, ys, zs = [], [], []
    u, v, w = [], [], [] # Componentes vector fuerza
    
    for i in range(num_bandejas):
        # Lado Derecho (Bajando - Cargado)
        if i < 10: 
            px = W_TOTAL/3
            py = H_TOTAL - 0.5 - (i * (path_h/10))
            pz = -0.2
            loaded = True
        # Lado Izquierdo (Subiendo - Vacío)
        else:
            px = -W_TOTAL/3
            py = 0.5 + ((i-10) * (path_h/10))
            pz = -0.2
            loaded = False
            
        # Dibujar Bandeja (Punto azul)
        ax.scatter(px, py, pz, color='blue', s=50, alpha=0.6)
        
        # Vector Fuerza (Solo si cargado)
        if loaded:
            xs.append(px)
            ys.append(py)
            zs.append(pz)
            # Fuerza hacia abajo (Gravedad)
            u.append(0)
            v.append(-1000) # Magnitud visual
            w.append(0)

    # Quiver (Flechas de Fuerza)
    ax.quiver(xs, ys, zs, u, v, w, color='red', length=0.0005, normalize=True, arrow_length_ratio=0.3, label='Carga (150kg)')

    # Configuración del Gráfico
    ax.set_title('Modelo Estático de Fuerzas - ZASCA P-002')
    ax.set_xlabel('Ancho (m)')
    ax.set_ylabel('Altura (m)')
    ax.set_zlabel('Profundidad (m)')
    ax.legend()
    
    # Ajustar vista
    ax.view_init(elev=20, azim=30)
    
    # Guardar
    output_path = "Distribuccion_Fuerzas_P002.png"
    plt.savefig(output_path, dpi=100)
    print(f"Imagen guardada: {output_path}")

if __name__ == "__main__":
    plot_static_forces()
