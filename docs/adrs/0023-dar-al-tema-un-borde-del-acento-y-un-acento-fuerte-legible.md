# 0023. Dar al tema un borde del acento y un acento fuerte legible

- Estado: Aceptada
- Fecha: 2026-11-23

Decidida en el lote 14 de [ADR-0021](0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md) (PBI-0189). Amplía [ADR-0011](0011-guardar-los-temas-como-recurso-propio-del-bff.md), como antes [ADR-0013](0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md), [ADR-0014](0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md) y [ADR-0019](0019-calcular-con-el-tema-el-error-la-alerta-y-el-texto-sobre-el-principal.md). Qué elementos llevan el secundario queda «Provisional, por confirmar con Daniel».

## Contexto

### Por qué había que decidir

Daniel Avila observó el 2026-11-20 que «la configuración del color secundario ofrecido no se visibiliza correctamente» y que, con una variación del ámbar, «parece que predomina más el color de fondo secundario (blanco) que el mismo color secundario» (PBI-0189). Al revisarlo se encontraron tres causas:

1. **El secundario no se separa del fondo.** El secundario rellena la insignia «Oferta», el contador del carrito, el botón secundario de los banners, las barras de «Clientes nuevos» del Dashboard y la vista previa del editor, sin borde propio. Un ámbar sobre el blanco queda bajo el 3:1 que pide WCAG 1.4.11 para distinguir un componente: `#F5A524` de A, 2.04:1; `#FFB300`, 1.79:1; `#FCD34D`, 1.44:1. Lo que se ve es el blanco de la superficie, el «fondo secundario».
2. **La insignia «Oferta» usaba el texto del principal.** `.ws-product-badge.is-offer` cambiaba el fondo al acento pero dejaba `--ws-on-primary`: blanco sobre el ámbar de A (2.04:1) y grafito sobre grafito con C (1:1, la palabra no se veía). Es un defecto de CSS, no del mapa.
3. **El botón secundario con el puntero encima.** `--ws-accent-strong` era siempre la mezcla al 78 % con el contraste. Con un acento medio y texto oscuro (por ejemplo `#D97706`), el texto pasa de 5.60:1 a 3.85:1 al pasar el puntero.

El tinte suave (`--ws-accent-soft`, el secundario al 9 % sobre la superficie) no es la causa: hoy ninguna plantilla lo usa.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Un token de borde del acento y un acento fuerte que respete el texto (elegida)** | `--ws-accent-line`: el secundario si llega a 3:1 sobre el fondo principal y la superficie; si no, su primera mezcla con el contraste, de 10 en 10 %, que llega (en último caso, el contraste). Contornea los componentes rellenos con el acento. `--ws-accent-strong` pasa a ser el acento si el texto sobre el acento no llega a 4.5:1 sobre la mezcla | El relleno sigue siendo exactamente el secundario elegido y gana un contorno que lo separa del blanco. B y C no cambian a la vista: su borde es el propio secundario | El mapa pasa de 37 a 38 tokens; A cambia (gana un contorno ámbar oscuro), porque el defecto también está en A |
| Oscurecer el relleno hasta 3:1 | El acento que se pinta sería otro color, más oscuro, que el elegido | Sin token nuevo | Lo que Daniel elige no es lo que ve: contradice «que el color secundario se vea» |
| Rechazar o avisar de un secundario claro al guardar | Un par nuevo `accent/surface` que avisa o bloquea | Sin cambios en la tienda | El ámbar es un secundario legítimo (A lo usa); solo traslada el problema a quien configura |

## Decisión

- El mapa del tema gana `--ws-accent-line`, justo después de `--ws-on-accent`: el secundario, o su primera mezcla con el contraste de 10 en 10 % (90 %, 80 %…), o el contraste, que llegue a 3:1 sobre el fondo principal y la superficie. En A es `color-mix(in srgb, #F5A524 70%, #17151C)`; en B, `var(--ws-accent)`; en C, `#1F2328`.
- `--ws-accent-strong` es `color-mix(S 78%, C)` si el texto sobre el acento llega ahí a 4.5:1; si no, el acento. A, B y C no cambian.
- El borde del acento contornea la insignia «Oferta», el contador del carrito, el botón secundario de los banners, las barras y la leyenda de «Clientes nuevos» y la vista previa del editor. La insignia «Oferta» usa `--ws-on-accent`.
- No se añaden pares: el borde llega a 3:1 por construcción, porque el contraste llega a 4.5:1 sobre los dos fondos (`contrast/*` bloquea), y el acento fuerte cae al acento, cuyo texto ya mide `onAccent/accent`.
- Sin migración: los tokens se calculan al leer. El contrato solo crece; un cliente que ignore la clave sigue funcionando.

*Motivo:* es la única opción que muestra el secundario elegido tal cual y con el contraste que pide WCAG, sin cambiar B ni C y con la misma regla en el BFF y en la réplica del Admin, fijada valor por valor en `casos-tema.json`.

## Consecuencias

**Más fácil:** un secundario claro (un ámbar, un amarillo) se distingue sobre el blanco y su texto se lee, también con el puntero encima.

**Más difícil:** el mapa tiene 38 tokens. Quien añada un token sigue el patrón de ADR-0019 (BFF, réplica del Admin, `NombreToken` en las dos aplicaciones, `casos-tema.json`, `tokens.css`, contrato y smoke test). Un componente nuevo relleno con el acento debe llevar también el borde (`ring-1 ring-inset ring-accent-line` o `box-shadow: inset 0 0 0 1px var(--ws-accent-line)`).

**Fuera de alcance:** qué otros elementos de la tienda deberían llevar el secundario es una pregunta de producto para Daniel; el lote solo hace que se vea bien donde ya se aplica.

## Ampliación del 2026-11-23 (lote 20)

Un hallazgo de los lotes de ADR-0021: con C, el botón secundario con el puntero encima no cambiaba de tono. Su secundario y su contraste son el mismo grafito (`#1F2328`), así que la mezcla al 78 % daba el grafito (1.00:1 frente al acento) y solo cambiaban la sombra y el desplazamiento. Lo mismo le pasa a cualquier tema propio cuyo secundario se parezca a su contraste, y a los que caían en el acento porque su texto no llegaba sobre la mezcla (por ejemplo `#D97706`).

- `--ws-accent-strong` sirve si deja el texto sobre el acento a 4.5:1 **y** se distingue del acento con al menos 1.3:1 (B, el de referencia, cambia 1.37:1). Primero, la mezcla al 78 % con el contraste, como hasta ahora; si no sirve, la primera mezcla con el blanco o con el negro, de 10 en 10 % (`color-mix(S 90%, #FFFFFF)`, `color-mix(S 90%, #000000)`, 80 %…), que sirva; si ninguna sirve, el acento.
- A y B no cambian. C pasa de `color-mix(in srgb, #1F2328 78%, #1F2328)` a `color-mix(in srgb, #1F2328 90%, #FFFFFF)`: 1.36:1 frente al grafito y su texto ámbar a 6.39:1. En los casos de `casos-tema.json`, `#D97706` sobre la base de B pasa del acento a `color-mix(#D97706 70%, #FFFFFF)` y `#F97316` sobre la base oscura, de su mezcla con `#F5F7FA` a `color-mix(#F97316 70%, #FFFFFF)`.
- Sin tokens ni pares nuevos y sin migración: el mapa sigue con 38 tokens y 27 pares; los tokens se calculan al leer. Cambia el valor de una clave que ya existía.

*Motivo:* el estado con el puntero encima debe verse en cualquier tema sin perder el contraste del texto; empezar por la mezcla de siempre deja A y B como estaban.

El mismo lote revisó el tinte suave: `--ws-accent-soft` sigue sin uso en las plantillas (su única regla, `.ws-promo-secondary`, tampoco se usaba y se quitó). Queda en el mapa como **reservado** para un fondo suave del secundario: quitarlo cambiaría el contrato de 38 claves, el cálculo del BFF y su réplica, `casos-tema.json`, el smoke test y estos ADR, sin ningún efecto visible.
