
import numpy as np
from dataclasses import dataclass

@dataclass
class MaterialProperties:
    E: float = 200e9      # Pa
    fy: float = 250e6     # Pa

@dataclass
class ProfileProperties:
    h: float
    b: float
    t: float
    name: str

    def __post_init__(self):
        self.Ix = (self.b * self.h**3 - (self.b - 2*self.t) * (self.h - 2*self.t)**3) / 12
        self.Wx = self.Ix / (self.h / 2)

def analyze_beam(profile, num_beams=1):
    # Load Constants
    num_bandejas = 20
    carga_por_bandeja = 150 # kg
    peso_propio_bandeja = 45 # kg
    total_weight_kg = num_bandejas * (carga_por_bandeja + peso_propio_bandeja) # 3900 kg
    total_force_N = total_weight_kg * 9.81 # ~38259 N
    
    # Load per beam
    load_per_beam = total_force_N / num_beams
    
    # Geometry
    L_eje = 2.80 # m
    
    # Moment (Simply supported, worst case distributed -> M = wL^2/8 = FL/8)
    M_max = (load_per_beam * L_eje) / 8
    
    # Stress
    mat = MaterialProperties()
    sigma_bending = M_max / profile.Wx
    sf = mat.fy / sigma_bending
    
    return {
        "Profile": profile.name,
        "Num Beams": num_beams,
        "Load (N)": load_per_beam,
        "Moment (Nm)": M_max,
        "Stress (MPa)": sigma_bending / 1e6,
        "SF": sf
    }

# Scenarios
profiles = [
    ProfileProperties(0.100, 0.050, 0.006, "Original RHS 100x50x6"),
    ProfileProperties(0.150, 0.050, 0.006, "RHS 150x50x6"),
    ProfileProperties(0.150, 0.100, 0.006, "RHS 150x100x6"),
    ProfileProperties(0.150, 0.150, 0.006, "RHS 150x150x6"),
    ProfileProperties(0.200, 0.100, 0.008, "RHS 200x100x8"),
]

print(f"{'Profile':<25} | {'Beams':<5} | {'Stress (MPa)':<12} | {'SF':<5}")
print("-" * 55)

for p in profiles:
    # 1 Beam
    res1 = analyze_beam(p, num_beams=1)
    print(f"{res1['Profile']:<25} | {res1['Num Beams']:<5} | {res1['Stress (MPa)']:<12.1f} | {res1['SF']:<5.2f}")
    
    # 2 Beams
    res2 = analyze_beam(p, num_beams=2)
    print(f"{res2['Profile']:<25} | {res2['Num Beams']:<5} | {res2['Stress (MPa)']:<12.1f} | {res2['SF']:<5.2f}")
