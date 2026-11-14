# 005. Contraste de controles con los temas — Especificación

- Feature: `005-contraste-de-controles-con-los-temas`
- Historia de usuario: ninguna. Sale de [PBI-0048](../../../planning/backlog.md) (texto del enlace «Ver todos los productos» del cajón móvil, a 2.18:1) y [PBI-0049](../../../planning/backlog.md) (casillas marcadas del Admin con el tema C, a 1:1). Los dos se detectaron en la feature [004](../004-ajustes-de-la-tienda/verification.md#ejecución-por-tarea), y Sebastián Avila los eligió como siguiente trabajo el 2026-11-13.
- Estado: borrador
- Fecha: 2026-11-13
- Hito de alcance: pendiente

## Problema y actores

Dos controles no se leen con algunos temas, y en los dos casos el código declara un color que luego no se aplica.

1. **El enlace «Ver todos los productos» del cajón móvil de la tienda** lleva `bg-primary text-on-primary`, pero su texto sale con el color heredado del cajón. Con B, `#1E293B` sobre `#1D4ED8` da 2.18:1, por debajo del 4.5:1 de WCAG 1.4.3. Con `--ws-on-primary`, blanco, serían 6.70:1.
   - La causa es la regla `a { color: inherit; }` de `frontend/src/styles.css`, que está fuera de toda capa. Una regla sin `@layer` gana a cualquier regla en capa, sin importar la especificidad, así que ninguna utilidad de color de Tailwind (capa `utilities`) llega a un `<a>` de la tienda.
   - El mismo archivo ya movió a `@layer base` la regla de márgenes de títulos y párrafos por el mismo motivo («Fuera de una capa, esta regla las anulaba en toda la tienda»).
2. **Las casillas marcadas (`mat-checkbox`) del Admin con el tema C** salen como un cuadrado oscuro sin marca: fondo y marca valen `#1F2328` (1:1). Con A mide 10.23:1 y con B, 6.70:1.
   - La causa es el mapeo de Material de `frontend/src/styles/tokens.css`, que también carga el Admin: `--mat-sys-primary` es `--ws-link` (para que la etiqueta enfocada de los campos se lea como texto) y `--mat-sys-on-primary` es `--ws-on-primary`. Material pinta `on-primary` sobre `primary`, es decir, el texto del principal sobre el color del enlace.
   - Con C, `--ws-link` y `--ws-on-primary` son el mismo grafito. La feature 004 lo corrigió solo para el botón relleno (`--mat-button-filled-*`).
   - No es exclusivo de C: en un tema propio cuyo principal no se lee sobre los fondos, el BFF da a `--ws-link` el color de contraste y a `--ws-on-primary` el texto más legible sobre el principal, que suele ser ese mismo color de contraste (`tokensDeMarca` en `backend/src/domain/temas/tema.rules.mjs`).

Ecom, el primer cliente, usará el tema C ([`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md), «Confirmación de la paleta»), así que el defecto de las casillas lo verá en su Admin.

Actores: el comprador (invitado o con cuenta) en la tienda móvil, y el `superadmin`, el `admin` y el `vendedor` en las páginas del Admin con casillas. Aplicaciones afectadas: Storefront y Admin; el BFF, según la [pregunta 2](#preguntas-abiertas).

## Alcance

**Incluye:**

- Que el texto de «Ver todos los productos» use el color que declara, con A, B y C.
- Que los demás enlaces de la tienda que declaran un color (`text-*` o `bg-*`) lo muestren, según la [pregunta 1](#preguntas-abiertas).
- Que la marca de las casillas marcadas del Admin se lea con A, B y C, y con un tema propio de principal claro.
- Medir con A, B y C cada componente de Material que usan las dos aplicaciones y que pinta un color sobre el principal: casilla, botón de opción, botón relleno, etiqueta enfocada del campo, opción seleccionada de la lista y menú.
- Capturas antes y después con A, B y C en la tienda y el Admin.

**Excluye:**

- Los colores de los temas A, B y C y la fórmula de los temas propios, salvo lo que añada la [pregunta 2](#preguntas-abiertas).
- El contorno de los demás formularios ([PBI-0047](../../../planning/backlog.md)).
- El desborde de `/productos` del Admin a 375 px ([PBI-0045](../../../planning/backlog.md)) y el 404 de `/favicon.ico` ([PBI-0046](../../../planning/backlog.md)).
- Componentes de Material que hoy no se usan (interruptor, selector de fecha, selección múltiple): quedan cubiertos si se elige la alternativa A de la pregunta 2, pero no se miden.

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | El texto del enlace «Ver todos los productos» del cajón móvil de la tienda tiene el color `--ws-on-primary` sobre `--ws-primary`, con al menos 4.5:1 en A, B y C | PBI-0048; WCAG 1.4.3 (STD-11) | Alta |
| REQ-02 | Los enlaces de la tienda que declaran una utilidad de color la muestran, incluido su estado `hover` | PBI-0048 («Puede afectar a otros enlaces»); depende de la pregunta 1 | Media |
| REQ-03 | La marca de una casilla marcada del Admin contrasta al menos 3:1 con el relleno de la casilla, y el relleno al menos 3:1 con el fondo donde está, en A, B y C | PBI-0049; WCAG 1.4.11 (STD-11) | Alta |
| REQ-04 | REQ-03 se cumple también con un tema propio cuyo principal no se lee sobre los fondos | PBI-0049 (la causa); **propuesto** | Media |
| REQ-05 | Ningún componente de Material usado en la tienda o el Admin pinta un texto o una marca sobre el principal con menos de 4.5:1 (texto) o 3:1 (marca), en A, B y C | PBI-0049 («Puede afectar a otros controles de Material»); **propuesto** | Media |
| REQ-06 | Fuera de los cambios de REQ-01 a REQ-05, la tienda y el Admin se ven igual con A, B y C | STD-12 | Alta |

## Criterios de aceptación

### AC-01 — Botón del cajón móvil

- Cubre: REQ-01
- Origen: PBI-0048

**Dado** la tienda a 375 px de ancho con el tema A, B o C
**Cuando** el comprador abre el cajón del menú
**Entonces** el texto «Ver todos los productos» tiene el color de `--ws-on-primary` sobre el de `--ws-primary` (con B, blanco sobre `#1D4ED8`, 6.70:1), y la relación es de al menos 4.5:1 con los tres temas.

### AC-02 — Enlaces de la tienda con color declarado

- Cubre: REQ-02
- Origen: PBI-0048; la lista depende de la pregunta 1

**Dado** el tema B
**Cuando** se mide con `getComputedStyle` cada enlace de la tienda que declara una utilidad de color
**Entonces** su color es el que declara:
- «Crear cuenta» en `/cuenta/ingresar`: `--ws-link`;
- «Ver toda la categoría» del cajón móvil: `--ws-link`;
- las categorías del cajón móvil: `--ws-muted`;
- «Mis pedidos», el enlace de vuelta del detalle del pedido: `--ws-muted`, y `--ws-ink` al pasar el puntero;
- el nombre del producto en el carrito: `--ws-link` al pasar el puntero.

### AC-03 — Casilla marcada del Admin con C

- Cubre: REQ-03
- Origen: PBI-0049

**Dado** el Admin con el tema C activo
**Cuando** una casilla está marcada (por ejemplo, «Página Contacto» en `/contenido`)
**Entonces** la marca contrasta al menos 3:1 con el relleno de la casilla, y el relleno al menos 3:1 con el fondo de la tarjeta.

### AC-04 — Casillas con A y B

- Cubre: REQ-03, REQ-06
- Origen: PBI-0049; **propuesto**

**Dado** el Admin con el tema A o B
**Cuando** una casilla está marcada
**Entonces** se ve igual que antes de la feature: relleno del principal y marca blanca (10.23:1 con A y 6.70:1 con B).

### AC-05 — Tema propio de principal claro

- Cubre: REQ-04
- Origen: **propuesto**

**Dado** un tema propio con principal `#F2B705` y color de contraste `#1F2328`, activo en el Admin
**Cuando** una casilla está marcada
**Entonces** se cumple AC-03.

### AC-06 — Componentes de Material con los tres temas

- Cubre: REQ-05
- Origen: **propuesto**

**Dado** cada componente de Material que usan las dos aplicaciones: casilla (Admin), botón de opción (checkout), botón relleno (diálogo de la tienda), etiqueta enfocada de un campo, opción seleccionada de una lista desplegable y menú (menú de usuario del Admin)
**Cuando** se mide con A, B y C
**Entonces** cada texto o marca pintado sobre el principal cumple REQ-05, y el informe de la verificación lista la medida de cada uno.

### AC-07 — Sin otros cambios visuales

- Cubre: REQ-06
- Origen: STD-12

**Dado** las capturas antes y después de la tienda y el Admin con A, B y C, a 1440 y 375 px
**Cuando** se comparan
**Entonces** solo cambian los elementos de AC-01 a AC-05.

## Datos y contrato

Según la [pregunta 2](#preguntas-abiertas):

- **Con la alternativa A**, el mapa de tokens de cada tema ([contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md), `Tema.tokens` y `theme.css`) gana un token, `--ws-on-link`: el texto más legible sobre `--ws-link`, calculado por el BFF igual que `--ws-on-primary` sobre el principal. El contrato solo crece y no hay migración, como en la feature 004. La réplica de las reglas del Admin (`tema.rules.ts`) lo incluye.
- **Con la alternativa B**, no cambia ni el contrato ni el BFF.

Los permisos no cambian: los temas los sigue gestionando solo el `superadmin` (`themes.manage`).

## Interfaz

Cambio visual pedido en los elementos que hoy no muestran el color que declaran. El diseño de referencia es el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md), sin cambios.

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| Cajón móvil de la tienda | «Ver todos los productos» con el texto blanco con A y B, y grafito sobre amarillo con C | Sí (PBI-0048) |
| `/cuenta/ingresar`, cajón móvil, detalle del pedido y carrito | Los enlaces de AC-02 toman su color declarado | Sí, si se elige la alternativa A de la pregunta 1 |
| Páginas del Admin con casillas: `/contenido`, `/banners`, `/marcas`, `/productos` y `/usuarios` | Con C, la casilla marcada deja de ser un cuadrado sin marca. Con A y B, igual | Sí, solo con C (PBI-0049) |
| Resto de la tienda y del Admin | Ninguno | No |

## Integraciones

Ninguna.

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| Enlace sin utilidad de color (por ejemplo, «Olvidé mi contraseña») | Sigue heredando el color del texto que lo rodea | REQ-02, AC-07 |
| Enlace con una clase propia de `storefront.css` (`ws-text-link`, etc.) | Sin cambio: esas reglas no están en capa y ya ganan por especificidad | AC-07 |
| Casilla sin marcar | Sin cambio: borde `--ws-border-strong` sobre la superficie | AC-07 |
| Casilla deshabilitada | Mantiene el aspecto deshabilitado de Material | AC-07 |
| Tema propio de principal oscuro (se lee sobre los fondos) | El enlace es el principal y la marca, blanca: igual que hoy | REQ-04 |
| Tema propio en el que ni el blanco ni el color de contraste llegan a 3:1 sobre el enlace | El BFF ya bloquea guardar temas con pares de contraste insuficientes en los pares que bloquean. Con la alternativa A de la pregunta 2, el par nuevo es otro aviso | REQ-04 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio):

- `frontend/src/styles.css:75-78` tiene `a { color: inherit; text-decoration: none; }` fuera de `@layer`. Las líneas 39-49 del mismo archivo ya movieron a `@layer base` la regla de márgenes por el mismo motivo.
- El Admin no tiene esa regla en su `styles.css`: sus enlaces con utilidades de color (Resumen y tarjetas de indicador) ya muestran su color.
- Hay seis enlaces de la tienda con utilidades de color, en `app.layout.ts` (3), `login.page.ts`, `detalle-pedido.page.ts` y `carrito.page.ts`. Solo el de «Ver todos los productos» se midió (2.18:1 con B, en la feature 004). Los otros cinco se deducen de la cascada y se medirán en las capturas «antes».
- `frontend/src/styles/tokens.css:67-68` mapea `--mat-sys-primary` a `--ws-link` y `--mat-sys-on-primary` a `--ws-on-primary`, y las líneas 79-80 corrigen solo el botón relleno.
- Con C, `--ws-link` y `--ws-on-primary` valen `#1F2328` (`temas-predefinidos.mjs`). El mapeo llegó con la feature 002 (`04296c6`, PR #15).
- Las casillas están en cinco páginas del Admin (`banners`, `contenido`, `marcas`, `productos` y `usuarios`). La tienda solo usa botones de opción (checkout), que pintan el principal sobre blanco y no usan `on-primary`.
- Ninguna lista desplegable usa selección múltiple.
- Angular Material 22.2.4.
- Con C, el amarillo `#F2B705` sobre blanco da 1.82:1 y el grafito `#1F2328` sobre blanco, 15.80:1.

**Supuestos** (se asumen hasta que se confirmen):

- Las utilidades de color de los seis enlaces expresan el diseño que se quería, y no un color que alguien dejó sin querer. Se confirma con la pregunta 1.

**Decisiones pendientes:** ninguna de `PENDING-DECISIONS.md` afecta a esta feature.

## Preguntas abiertas

1. **¿Cómo se corrige el enlace del cajón (PBI-0048)?**
   - **A (recomendada).** Mover `a { color: inherit; text-decoration: none; }` a `@layer base`, como ya se hizo con los márgenes. Las utilidades vuelven a aplicarse a los enlaces, y los otros cinco enlaces de AC-02 toman su color declarado: cinco cambios visuales más, todos en la tienda y medidos en las capturas.
   - **B.** Corregir solo «Ver todos los productos» con una regla más específica. No cambia nada más, pero los otros cinco siguen sin mostrar su color y la próxima utilidad de color en un enlace vuelve a fallar.
2. **¿Cómo se corrigen las casillas (PBI-0049)?**
   - **A (recomendada).** Un token nuevo del tema, `--ws-on-link` (el texto más legible sobre el enlace), calculado por el BFF, y `--mat-sys-on-primary: var(--ws-on-link)`.
     - Con C, la casilla es grafito con la marca blanca (15.80:1, y 15.80:1 contra la tarjeta).
     - Con A y B, nada cambia, porque el enlace es el principal y el texto sobre él ya es blanco.
     - Cubre los temas propios y cualquier componente de Material que pinte sobre el principal.
     - El contrato crece de 31 a 32 tokens y necesita un ADR que amplíe ADR-0011, como ADR-0013.
   - **B.** Tokens propios de la casilla (`--mat-checkbox-selected-*`) con el principal y su texto, como el botón relleno de la feature 004.
     - Con C, la casilla es amarilla con la marca grafito (8.69:1), pero el relleno amarillo contra la tarjeta blanca da 1.82:1, por debajo del 3:1 de REQ-03.
     - Cada componente nuevo de Material necesitaría su propio arreglo.
     - No toca el BFF.
   - **C.** Igual que B, pero con el grafito como relleno solo con C. Es un caso especial que no cubre los temas propios.

## Referencias

- [Backlog](../../../planning/backlog.md): PBI-0048 y PBI-0049
- [Verificación de la feature 004](../004-ajustes-de-la-tienda/verification.md#ejecución-por-tarea): mediciones de origen
- [ADR-0011](../../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md) y [ADR-0013](../../../adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Estándares](../../../architecture/standards.md): STD-11 y STD-12
- [Trazabilidad](../../../planning/TRACEABILITY.md)
