# 0028. Hacer visible el secundario en la tienda e invertir el tema C

- Estado: Aceptada
- Fecha: 2026-11-24

Decidida en el lote 28 de [ADR-0027](0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md) (PBI-0240), con sus decisiones provisionales de partida. Queda «Provisional, por confirmar con Daniel». Amplía [ADR-0023](0023-dar-al-tema-un-borde-del-acento-y-un-acento-fuerte-legible.md): cambia dónde se usa el acento y da uso al secundario suave, que estaba reservado.

## Contexto

### Por qué había que decidir

En la reunión del 2026-11-20, sobre el storefront del modo demo, Daniel dijo que el tema C está al revés («Principal negro, secundario, amarillo») y que el secundario no se ve: «no veo hasta ahorita ni un solo botón secundario», «Parece un color de adorno». Propuso dónde: «El botón podría ser amarillo con icono negro» y «Los fonditos que tiene aquí podrían ser fondo amarillo cuando le haga foco». Del tema B: «Casi no se nota el color rojo». Hasta el lote, el acento solo rellenaba la insignia «Oferta», el contador del carrito y el botón secundario de los banners, todos con el contorno de ADR-0023; los botones secundarios (`ws-btn-secondary`) eran blancos con borde gris, y el fondo con el puntero encima era el gris neutro (`--ws-surface-soft`). El tinte `--ws-accent-soft` estaba en el mapa sin ningún uso.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Rellenar los botones secundarios con el acento y teñir con el secundario suave el fondo con el puntero encima (elegida)** | `ws-btn-secondary` pasa a `--ws-accent` con `--ws-on-accent` y el borde del acento; los fondos neutros con el puntero encima o con el foco pasan a `--ws-accent-soft`, que sube del 9 % al 20 % | Es lo que propuso Daniel, en los tres temas. Sin tokens nuevos: usa los del mapa y el reservado | Más color en la tienda; dos pares de contraste nuevos y la réplica del Admin que actualizar |
| Solo invertir los colores de C | C pasa a negro y amarillo y nada más | Lo mínimo | Daniel dijo que el secundario no se ve también en B; los botones secundarios seguirían blancos |
| Un token nuevo para el fondo con el puntero encima | Un `--ws-accent-hover` propio, con su cálculo y su par | Deja `--ws-accent-soft` como estaba | Un token más (39) en el BFF, la réplica, `NombreToken`, `tokens.css`, el contrato y el smoke test, cuando el reservado sirve para eso |

## Decisión

- **Tema C.** Principal `#1F2328` y secundario `#F2B705` (antes, al revés). Los tokens de la marca se derivan de los cinco colores: texto blanco sobre el grafito, texto grafito sobre el amarillo, tinte del principal `color-mix(#1F2328 10%, #FFFFFF)`, borde del acento `color-mix(#F2B705 60%, #1F2328)` y acento fuerte `color-mix(#F2B705 78%, #1F2328)`. C conserva sus literales presentados que no dependen de cuál es el principal (la franja, el lienzo, el texto tenue y el pie) y fija `--ws-primary-strong` en `color-mix(#1F2328 90%, #FFFFFF)`: la mezcla derivada del grafito con el grafito es el mismo grafito y el botón principal no cambiaría con el puntero encima (1.00:1; con el literal, 1.36:1, como el acento fuerte del lote 20). El nombre «Grafito y ámbar» se conserva.
- **Botones secundarios de la tienda.** `ws-btn-secondary` se rellena con `--ws-accent`, escribe con `--ws-on-accent` y se contornea con `--ws-accent-line`; con el puntero encima, `--ws-accent-strong`, como `ws-btn-accent`. Deshabilitado, como el principal. El «Seguir comprando» del diálogo y del panel lateral de «Producto agregado» (Material) toma los mismos colores.
- **Fondo con el puntero encima o con el foco.** Donde la tienda usaba un fondo neutro (las acciones de la cabecera, los botones de íconos, los controles del carrusel de destacados, los botones de cantidad, las filas de sugeridos, las subcategorías del menú del celular, las opciones del menú de la tarjeta y de las listas desplegables), usa `--ws-accent-soft`, y el texto pasa al contraste (`--ws-ink`), no al color de los enlaces. `--ws-accent-soft` pasa de `color-mix(S 9%, Sf)` a `color-mix(S 20%, Sf)`.
- **Insignia «Oferta» de la ficha.** Era una píldora blanca: lleva el secundario, su texto y su borde, como la de la tarjeta del catálogo.
- **Contador del carrito.** No cambia su regla: ya era el acento con `--ws-on-accent`. Con C invertido, es el amarillo con el número grafito, como propuso Sebastián.
- **Contraste.** `PARES_DE_CONTRASTE` gana dos pares al final, a 4.5:1 y sin bloquear: `contrast/accentSoft` y `muted/accentSoft` (29 pares). No hay un par del enlace sobre el secundario suave porque la tienda no escribe con el color de los enlaces sobre él: en la base oscura de `casos-tema.json`, `#3B82F6` sobre ese fondo da 3.36:1. Con A, B y C: texto 15.71, 13.29 y 13.99:1; texto tenue 6.01, 4.75 y 6.06:1.
- **Sin migración ni tokens nuevos.** El mapa sigue con 38 tokens y se calcula al leer: los temas propios guardados cambian solo en `--ws-accent-soft`, que antes no se veía en ninguna pantalla.

*Motivo:* es lo que pidió Daniel, en los tres temas, con el contraste de ADR-0022 y ADR-0023 y sin ampliar el mapa: el tinte reservado ya era el fondo suave del secundario.

## Consecuencias

**Lo que se vuelve más fácil:** el secundario se ve en cada página de la tienda (botones, cabecera con el puntero encima, menús, contador), y C se ve como la marca de Ecom: negro con amarillo.

**Lo que se vuelve más difícil:**

- Un botón secundario nuevo de la tienda es de color, no neutro: para una acción discreta hay que usar un enlace o `ws-btn-ghost`.
- Con C, todo lo que se pintaba con el principal pasa a grafito: los botones principales, el tinte del principal (los fondos del inicio, la opción seleccionada y, en el Admin, el elemento activo del menú, que deja el tinte ámbar `#FFF6D6` por el gris `#E9E9EA`) y los indicadores del carrusel.
- Daniel puede pedir rehacer qué elementos llevan el secundario.

**Fuera de alcance:**

- En un tema propio cuyo principal se parece a su contraste (un principal negro sobre un contraste negro), `--ws-primary-strong` también queda igual al principal y el botón principal no cambia con el puntero encima. Aplicarle la regla del acento fuerte del lote 20 cambiaría el principal fuerte, la franja superior y el texto sobre el tinte de 4 de los 6 temas propios de `casos-tema.json`; queda como hallazgo para el backlog.
- El Admin no cambia su forma de usar el acento: solo recibe los colores nuevos de C y la vista previa de Temas muestra el fondo con el puntero encima.

> Nota (2026-11-25, lote 34, PBI-0247): el principal fuerte de los temas propios que no se distingue del principal lo resuelve [ADR-0030](0030-alejar-el-principal-fuerte-que-no-se-distingue-del-principal.md), con la misma regla que el acento fuerte. Con los colores de C da el literal que C fija.
