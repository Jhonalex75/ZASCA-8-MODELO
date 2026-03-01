
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def create_input_diagram():
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Settings
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    ax.set_title("Diagrama 1: Entradas de Energía y Cargas (P-001)", fontsize=16, fontweight='bold', pad=20)
    
    # --- GEOMETRY ---
    # Sprockets
    top_sprocket = patches.Circle((5, 8), 1.5, edgecolor='black', facecolor='#d1d5db', linewidth=2)
    bottom_sprocket = patches.Circle((5, 2), 1.5, edgecolor='black', facecolor='#d1d5db', linewidth=2)
    ax.add_patch(top_sprocket)
    ax.add_patch(bottom_sprocket)
    
    # Axis
    ax.plot([5], [8], 'o', color='black') # Top Shaft
    ax.plot([5], [2], 'o', color='black') # Bottom Shaft
    
    # Chain (Simplified Loop)
    ax.plot([3.5, 3.5], [2, 8], color='black', linewidth=3, linestyle='--') # Left
    ax.plot([6.5, 6.5], [2, 8], color='black', linewidth=3, linestyle='--') # Right
    
    # Motor & Drive
    motor_box = patches.Rectangle((7.5, 7.5), 1.5, 1, edgecolor='black', facecolor='#3b82f6')
    ax.add_patch(motor_box)
    ax.text(8.25, 8, "Motor\n10 HP", color='white', ha='center', va='center', fontweight='bold')
    
    # Transmission Line
    ax.plot([6.5, 7.5], [8, 8], color='gray', linewidth=4)
    
    # --- ANNOTATIONS ---
    
    # Torque Arrow (Curved)
    torque_arrow = patches.FancyArrowPatch((5.5, 8.5), (4.5, 8.5), connectionstyle="arc3,rad=.5", 
                                         arrowstyle='Simple,tail_width=0.5,head_width=4,head_length=8', color='red')
    ax.add_patch(torque_arrow)
    ax.text(5, 9.7, "Torque Motriz\n> 1500 Nm", color='red', ha='center', fontsize=12, fontweight='bold')
    
    # Speed Arrow
    ax.arrow(3.2, 5, 0, 1, head_width=0.3, head_length=0.3, fc='green', ec='green', linewidth=2)
    ax.text(2.5, 5.5, "Velocidad Lineal\n0.2 m/s", color='green', ha='right', fontsize=12)
    
    # Load (Trays)
    for y in [3, 5, 7]:
        # Tray Right (Down)
        tray = patches.Rectangle((6.6, y-0.2), 0.8, 0.4, edgecolor='black', facecolor='#fcd34d')
        ax.add_patch(tray)
        # Force Arrow (Gravity)
        ax.arrow(7.0, y-0.2, 0, -0.6, head_width=0.2, head_length=0.2, fc='purple', ec='purple', linewidth=2)
    
    ax.text(8.5, 4.5, "Carga (Gravedad)\n~20 kg/bandeja (Máx)", color='purple', ha='left', fontsize=12)

    # Save
    plt.tight_layout()
    plt.savefig('Diagrama_Entradas_P001.png', dpi=150)
    print("Generated Diagrama_Entradas_P001.png")

def create_output_diagram():
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Settings
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')
    ax.set_title("Diagrama 2: Reacciones y Esfuerzos (P-002)", fontsize=16, fontweight='bold', pad=20)
    
    # --- STRUCTURE (Frame) ---
    # Columns
    col_left = patches.Rectangle((2, 1), 0.5, 8, edgecolor='black', facecolor='#9ca3af')
    col_right = patches.Rectangle((7.5, 1), 0.5, 8, edgecolor='black', facecolor='#9ca3af')
    ax.add_patch(col_left)
    ax.add_patch(col_right)
    
    # Main Beam
    beam = patches.Rectangle((1.5, 8.5), 7, 0.8, edgecolor='black', facecolor='#1f2937')
    ax.add_patch(beam)
    
    # Shaft
    ax.plot([1.5, 8.5], [8.2, 8.2], color='red', linewidth=3, linestyle='-.', alpha=0.6)
    ax.text(5, 8, "Eje Principal (Main Shaft)", color='red', ha='center', fontsize=10)
    
    # Bearings (Supports)
    ax.plot(2.25, 8.2, 's', color='orange', markersize=15) # Left Bearing
    ax.plot(7.75, 8.2, 's', color='orange', markersize=15) # Right Bearing
    
    # --- FORCES ---
    
    # Chain Tension (Load on Shaft)
    # T1
    ax.arrow(3.5, 8.2, 0, -2, head_width=0.3, head_length=0.3, fc='red', ec='red', linewidth=3)
    ax.text(3.5, 6, "Tensión T1\n(Lado Carga)", color='red', ha='center', fontsize=11, fontweight='bold')
    # T2
    ax.arrow(6.5, 8.2, 0, -1, head_width=0.3, head_length=0.3, fc='red', ec='red', linewidth=2)
    ax.text(6.5, 7, "Tensión T2\n(Lado Retorno)", color='red', ha='center', fontsize=11)
    
    # Reaction Forces (At Columns/Ground)
    # Ry1
    ax.arrow(2.25, 0.5, 0, 1, head_width=0.3, head_length=0.3, fc='green', ec='green', linewidth=3)
    ax.text(1.5, 1, "Reacción Ry1", color='green', ha='center', fontsize=11, fontweight='bold')
    # Ry2
    ax.arrow(7.75, 0.5, 0, 1, head_width=0.3, head_length=0.3, fc='green', ec='green', linewidth=3)
    ax.text(8.5, 1, "Reacción Ry2", color='green', ha='center', fontsize=11, fontweight='bold')
    
    # Safety Factor Box
    sf_box = patches.Rectangle((4, 3), 2, 1.5, edgecolor='green', facecolor='#dcfce7', linewidth=2)
    ax.add_patch(sf_box)
    ax.text(5, 3.75, "Factor de Seguridad\n\nFS = 6.17\n(OK)", color='green', ha='center', va='center', fontsize=14, fontweight='bold')
    
    # Save
    plt.tight_layout()
    plt.savefig('Diagrama_Salidas_P002.png', dpi=150)
    print("Generated Diagrama_Salidas_P002.png")


def create_velocity_profile():
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Data Points (Approximation of Step Function from Screenshot)
    # Time (s), Speed (%)
    times = [0, 0.1, 7.0, 7.01, 7.5, 7.51, 7.9]
    speeds = [0, 100, 100, 50,  50,  10, 10] 
    # NOTE: User manually requested 10% for Crawl phase. 
    # Speed sequence: 0 -> 100 -> 50 -> 10 -> 0 (Stop)
    
    # Plot
    ax.plot(times, speeds, color='#2563eb', linewidth=3)
    ax.fill_between(times, speeds, color='#bfdbfe', alpha=0.4)
    
    # Settings
    ax.set_title("Perfil de Velocidad: Función Escalonada (Step Function)", fontsize=14, fontweight='bold', pad=15)
    ax.set_xlabel("Tiempo (segundos) - Estimado para 5 Bandejas")
    ax.set_ylabel("Velocidad (%)")
    ax.set_ylim(0, 110)
    ax.set_xlim(0, 8.5)
    ax.grid(True, linestyle='--', alpha=0.7)
    
    # Annotations
    ax.annotate('Rampa (0.1s)', xy=(0.05, 50), xytext=(0.5, 80),
                arrowprops=dict(facecolor='black', shrink=0.05))
                
    ax.text(3.5, 103, "CRUCERO (100%)", ha='center', color='#1e40af', fontweight='bold')
    ax.text(7.25, 53, "APROX (50%)", ha='left', color='#1e40af', fontweight='bold')
    ax.text(7.7, 12, "CRAWL (10%)", ha='left', color='#1e40af', fontweight='bold')
    ax.text(8.0, 2, "STOP", ha='left', color='red', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('Perfil_Movimiento_ZASCA.png', dpi=150)
    print("Generated Perfil_Movimiento_ZASCA.png")

if __name__ == "__main__":
    create_input_diagram()
    create_output_diagram()
    create_velocity_profile()
