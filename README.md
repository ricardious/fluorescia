# Fluorescia

Arcade de supervivencia con desplazamiento lateral infinito. Controlas una criatura de luz (y a sus cientos de clones) que desciende por un ecosistema subterráneo bioluminiscente antes de que el **Vacío Devorador** la alcance.

**Jugar:** https://ricardious.github.io/fluorescia/

## Controles

| Acción | Teclado | Ratón / táctil |
|---|---|---|
| Volar (mantener) | `Espacio`, `↑` o `W` | mantener pulsado |
| Pausa | `P` / `Esc` | — |
| Sonido on/off | `M` | — |
| Menú del Nido | flechas + `Enter`/`Espacio` | clic / toque |

## Cómo se juega

- **Un solo botón:** mantenerlo hace que el enjambre aletee hacia arriba y adelante; al soltarlo cae y se queda atrás.
- **El Vacío** avanza desde la izquierda. La criatura que se queda atascada o se rezaga, muere.
- **Esporas Madre** (rosas): atraviésalas para clonarte. Más enjambre = más puntos por segundo.
- **Esquirlas de Luz** (doradas): están en las rutas más peligrosas. Se gastan en el Nido.
- **Ruido:** chocar contra las paredes llena la barra. Si se llena, despierta un **Acechador** que persigue al enjambre.

### Mutaciones
| Zona | Efecto |
|---|---|
| GIGANTE (naranja) | Criaturas enormes y pesadas que rompen cristales y geodas |
| MINI (verde) | Diminutas y ágiles: caben por grietas, pero el viento y las corrientes las arrastran |
| LENTO (azul pálido) | Cámara lenta global |
| INVERSO (púrpura) | Gravedad invertida |
| Lianas | Te atrapan y te arrastran un rato |
| Corrientes de agua | Te disparan hacia adelante |

### Biomas
Bosque de Hongos (sombreros que rebotan, plantas carnívoras, lianas) → Cavernas de Cristal (púas, geodas giratorias, muros de cristal) → Ruinas Mecánicas (engranajes, corrientes). Pasados los 200 m aparece el **Frenesí Climático**: terremotos que alteran el terreno, viento térmico y apagones.

### El Nido
Mejoras permanentes (clones iniciales, duración de mutaciones, lianas débiles, descenso sereno, aleteo silencioso, imán de esquirlas) y cosméticos (6 colores y 3 formas: chispa, polilla, medusa). Todo se guarda en `localStorage`.

## Reglas del reto

- **≤ 32 KB:** el juego completo es un único `index.html` (~31 KB sin comprimir). El script de build falla si se pasa.
- **Código propio:** JavaScript puro con Canvas 2D y Web Audio. Sin librerías, frameworks ni motores.
- **Cero assets:** los gráficos (pixel art, fuente 3×5, iluminación) y el sonido (efectos, dron y música generativa) se crean con código.

## Desarrollo

```bash
npm install      # solo instala terser (minificador, en build)
npm run build    # src/ → index.html (y comprueba el límite de 32 KB)
```

El código fuente legible está en `src/game.js`; `index.html` en la raíz es el build que se publica en GitHub Pages.
