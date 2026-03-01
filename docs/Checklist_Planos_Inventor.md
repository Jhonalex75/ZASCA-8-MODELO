# Lista de Chequeo: Vistas de Inventor para Plano Mecánico
**Proyecto:** ZASCA Paternoster
**Referencia:** Informe INF-ZAS-FAS-003

Esta lista detalla las vistas específicas que se deben exportar desde el modelo 3D de Autodesk Inventor (.iam / .ipt) para generar el dossier de planos de fabricación.

## 1. Vistas Generales (Ensamble Completo)
- [ ] **Isométrica NO (Noreste):** Vista 3D general de la máquina completa, mostrando chasis y carrusel. (Sin cerramientos externos para ver el mecanismo).
- [ ] **Vista Frontal:** Proyección ortogonal frontal. Debe acotarse la **Altura Total** (aprox. 3.2m) y el **Ancho Total**.
- [ ] **Vista Lateral Derecha:** Debe mostrar el montaje del Motor y Reductor. Acotar la **Profundidad Total**.
- [ ] **Planta (Superior):** Debe mostrar la huella de la máquina y los puntos de anclaje al suelo.

## 2. Detalles del Mecanismo (Cruciales)
- [ ] **Detalle "Trompa de Elefante":** Zoom a la curva superior de la cadena. Debe apreciarse cómo la bandeja mantiene la horizontalidad al dar la vuelta.
- [ ] **Unión Cadena-Bandeja:**
    *   Vista de detalle del **Pin Extendido**.
    *   Mostrar la conexión entre el Eslabón de la Cadena 20A-1 y el buje de la bandeja.
- [ ] **Tensor de Cadena:** Vista del mecanismo de ajuste de tensión en el eje inferior.

## 3. Vistas de Subsistemas
- [ ] **Tren de Potencia (Explosionado):**
    *   Motor + Reductor + Piñón Z1 + Cadena Transmisión + Piñón Z2 + Eje Principal.
    *   Ideal para lista de repuestos (BOM).
- [ ] **Bandeja Individual:** Vista aislada de una bandeja (400mm x 2437mm) mostrando costillas de refuerzo y material (Lámina CR Calibre 14/16?).

## 4. Esquema de Sensores (Control)
- [ ] **Sensor de Posición (Encoder Virtual):** Detalle mostrando el sensor inductivo M18 apuntando a los dientes del sprocket o a una bandera ("Target") en la cadena. Distancia de sensado: < 8mm.
- [ ] **Final de Carrera (Over-travel):** Ubicación física de los limit switches de seguridad superior e inferior.

---
**Formato de Entrega Sugerido:**
*   PDF (Planos listos para imprimir en A3/A1).
*   DWG (Editables para corte láser de chapas).
