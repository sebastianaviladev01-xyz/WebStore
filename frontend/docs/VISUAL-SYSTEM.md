# Sistema visual WebStore

## Dirección

Hay **tres temas predefinidos**, las tres propuestas del 05/11: **A · Violeta tienda**, **B · Azul cobalto** y **C · Grafito y ámbar**. Todos sus pares de texto cumplen WCAG AA (tablas en «Paleta y tokens»). B es el tema por defecto, en la demo y en toda instalación nueva, y es el que describe el resto de este documento; A y C solo cambian los colores, nunca la estructura, la tipografía ni el espaciado. El tema activo lo elige el `superadmin` en Admin → Temas ([ADR-0010](../../docs/adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md) y [ADR-0011](../../docs/adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md)).

La paleta **B · Azul cobalto** se eligió entre las tres propuestas por mayoría (2–1) el 06/11; Daniel prefería la tercera y, después, la primera. Desde la reunión del 11/11 las tres son temas predefinidos. B es además la única que no choca con ninguna versión de lo acordado: no usa beige, verde ni violeta, se aleja del rojo y los neutros cálidos de LG y todos sus pares de texto cumplen WCAG AA.

La tienda es un retail de tecnología y electrohogar en Lima. El azul cobalto transmite confianza para comprar; el naranja quemado se reserva para lo que exige atención comercial (ofertas, contador del carrito). Todo lo demás es estructura neutra: en la tienda, sobre un lienzo casi blanco, el lienzo de la tienda (`--ws-store-bg`); en el Admin, sobre un lienzo plomo (`--ws-bg`).

Por pedido de Sebastián (06/11), el inicio actual toma la **estructura** de la portada de LG Perú (banner amplio con el texto sobre la imagen, beneficios en el banner, controles abajo a la derecha y una fila de accesos con ícono). El **estilo** es propio: paleta cobalto, Source Sans 3, radios redondeados, velo azul en lugar de texto sobre la foto cruda y fotos y textos propios. No se usan marca, campañas, contador de ofertas ni recursos de LG. La versión con estructura totalmente propia sigue en `/inicio-anterior`.

| Zona            | Patrón típico de LG                                | WebStore                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero            | Carrusel a sangre completa con texto sobre la foto | Banner pegado a la cabecera y de borde a borde hasta 1920 px (el alto acompaña al ancho con la proporción del banner original, 1520 × 520, mínimo 520 px); en pantallas más grandes deja de crecer y queda centrado, como en LG. La foto y el velo son los del banner original; el texto se alinea con el logo y los controles van en la esquina inferior derecha en la esquina inferior derecha con el mismo aire a la derecha y abajo (40 px; 16 px en móvil), igual para cualquier banner, como en LG, en una cápsula de vidrio transparente sin borde, como en LG (blanco al 50 %, desenfoque mínimo, 40 px de alto, con el hover de cada botón al ras de la cápsula y en azul de la marca); en las fotos de estudio el producto va centrado en la mitad derecha del contenido; sobre fotos de ambiente, los beneficios van en el color de texto principal y la descripción y los beneficios llevan un halo suave del azul del velo; si el banner tiene "Tono de la foto: Oscura", en escritorio la cápsula pasa a vidrio oscuro con íconos blancos; en tablet y móvil vuelve a ser una tarjeta redondeada. La foto llena el banner y un velo azul suave asegura el contraste del texto; las fotos de estudio se funden con el azul. Etiqueta del banner, dos botones y dos beneficios del CMS; controles en una píldora abajo a la derecha: contador "1 / N", una barra de progreso única (escala a cualquier cantidad de banners), anterior, pausa y siguiente. En móvil la imagen va arriba y el texto debajo |
| Cabecera        | Una fila: logo, categorías, buscador e íconos      | Dos filas ordenadas: franja azul (mensaje del CMS y Ayuda); logo con su sombra, buscador de hasta 560 px centrado entre WebStore e Ingresar, Ingresar, Pedidos (ícono de caja) y Carrito; categorías con Envíos (ícono de camión, mismo color que las categorías) alineado con Carrito, y la flecha de las categorías con submenú tenue en reposo, sin línea divisoria. Cada destino aparece una sola vez                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Accesos rápidos | Fila de íconos circulares de campañas              | Fila de íconos de servicios: Tienda online, Destacados, Mis pedidos, Envíos, Mi cuenta, Libro de reclamaciones y Contáctanos (Envíos y Contacto según su interruptor del CMS). No son categorías, que siguen sin íconos (desde el lote 07b, una categoría puede llevar una imagen pequeña en los menús, PBI-0052)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Categorías      | Íconos o fotos circulares de producto              | Tarjetas de texto a todo el ancho: nombre, cantidad real de productos, subcategorías, precio "Desde" calculado del catálogo y flecha; sin íconos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Beneficios      | Franja oscura con íconos de línea                  | Tarjetas claras con ícono en recuadro azul suave                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Footer          | Gris claro multinivel                              | Azul marino `#0F1B33` con texto `#C5CEDD`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Admin           | —                                                  | Barra lateral clara agrupada por área (Catálogo, Ventas, Tienda, Accesos), con un ícono de trazo por página; la hamburguesa de la cabecera la reduce a íconos y, por debajo de 1024 px, abre el menú en un panel lateral (lote 07b, PBI-0044)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Paleta y tokens

`src/styles/tokens.css`, importado por la tienda y por el Admin, es la paleta B y el respaldo: lo que se ve si el BFF no responde. El tema activo llega del BFF en `/bff/appearance/theme.css`, una hoja que redefine los tokens del tema en un bloque `:root:root` y bloquea el primer pintado, así que no hay parpadeo. La tabla siguiente son los valores de B. Las plantillas usan nombres semánticos de Tailwind (`bg-primary`, `text-muted`, `border-line`…); no hay grises, índigos ni hex sueltos en los templates.

| Token CSS                              | Clase Tailwind   |                 Valor | Uso                                                   |                                   Contraste |
| -------------------------------------- | ---------------- | --------------------: | ----------------------------------------------------- | ------------------------------------------: |
| `--ws-primary`                         | `primary`        |             `#1D4ED8` | Acciones, enlaces, foco, navegación activa            |                          6.7:1 sobre blanco |
| `--ws-primary-strong`                  | `primary-strong` |    mezcla ≈ `#183996` | Hover, texto sobre azul suave (franja superior: `--ws-topbar`)        | 10.2:1 sobre blanco, 8.7:1 sobre azul suave |
| `--ws-primary-soft`                    | `primary-soft`   |    mezcla ≈ `#E8EDFB` | Hero, ítem activo, fondos de confirmación             |                                           — |
| `--ws-accent`                          | `accent`         |             `#C2410C` | Ofertas y contador del carrito (texto blanco)         |                            5.2:1 con blanco |
| `--ws-store-bg`                        | `store-canvas`   |             `#F9FAFC` | Lienzo de la tienda                                   |                                           — |
| `--ws-bg`                              | `canvas`         |             `#F3F5F8` | Fondo principal: lienzo plomo del Admin y relleno de los buscadores |                             — |
| `--ws-surface`                         | `surface`        |             `#FFFFFF` | Tarjetas, formularios, cabecera                       |                                           — |
| `--ws-surface-subtle`                  | `subtle`         |             `#F6F8FA` | Fondo de imagen de producto, filas al pasar el cursor |                                           — |
| `--ws-surface-soft`                    | `soft`           |             `#E9EDF3` | Botones neutros, chips                                |                                           — |
| `--ws-ink`                             | `ink`            |             `#0F172A` | Titulares                                             |                                      17.9:1 |
| `--ws-text`                            | `body`           |             `#1E293B` | Texto principal                                       |                                      14.6:1 |
| `--ws-muted`                           | `muted`          |             `#526075` | Texto secundario                                      |       6.4:1 sobre blanco, 5.9:1 sobre plomo |
| `--ws-border`                          | `line`           |             `#DDE3EC` | Separadores y contornos                               |                                           — |
| `--ws-border-strong`                   | `line-strong`    |             `#8894A6` | Contorno de los campos y de los botones secundarios   |                   3.07:1 sobre blanco (≥ 3) |
| `--ws-disabled` / `--ws-disabled-text` | —                | `#E6E9EE` / `#5A6577` | Botones deshabilitados                                |                                       4.8:1 |
| `--ws-footer`                          | `footer`         |             `#0F1B33` | Pie de página                                         |                                           — |
| `--ws-footer-text`                     | `footer-text`    |             `#C5CEDD` | Texto del pie                                         |                         10.8:1 sobre el pie |
| `--ws-danger`                          | `danger`         |             `#B42318` | Errores, eliminar, cancelado                          |          6.6:1 (6.1:1 sobre su fondo suave) |
| `--ws-warning`                         | `warning`        |             `#8A4B08` | Stock bajo                                            |          6.8:1 (6.3:1 sobre su fondo suave) |
| `--ws-dot`                             | —                |             `#B9C8F2` | Indicadores inactivos del carrusel                    |                                           — |

No hay verde: los estados positivos usan el azul (`primary-soft` + `primary-strong`).

### Temas y tokens del tema

Un tema es un nombre y cinco colores: principal, secundario (el acento), fondo principal, fondo secundario (la superficie) y contraste (el texto). El BFF calcula de ellos el mapa completo de **37 tokens** (`TOKENS_DEL_TEMA`); la tienda y el Admin solo lo aplican. Son nuevos respecto a la paleta B original (antes eran un color fijo o reutilizaban `--ws-primary` o `--ws-primary-strong`):

| Token | Uso |
|---|---|
| `--ws-on-primary` | Texto e íconos sobre el principal y el principal fuerte |
| `--ws-on-primary-soft` | Texto sobre el tinte del principal |
| `--ws-on-accent` | Texto sobre el acento |
| `--ws-link` | Enlaces y texto en el color de marca |
| `--ws-on-link` | Texto y marcas que Material pinta sobre el color de los enlaces (`--mat-sys-on-primary`): la marca de las casillas marcadas (feature 005) |
| `--ws-focus-ring` | Contorno del foco |
| `--ws-topbar` | Franja superior de la tienda |
| `--ws-on-topbar` | Texto de la franja superior |
| `--ws-footer-heading` | Títulos y enlaces al pasar el cursor en el pie |
| `--ws-store-bg` | Lienzo de la tienda (feature 004) |
| `--ws-danger`, `--ws-danger-soft`, `--ws-danger-line` | Error: texto, recuadro y su borde (lote 03, [ADR-0019](../../docs/adrs/0019-calcular-con-el-tema-el-error-la-alerta-y-el-texto-sobre-el-principal.md)) |
| `--ws-warning`, `--ws-warning-soft` | Alerta: texto y recuadro (lote 03) |

**Lienzo de la tienda** ([ADR-0013](../../docs/adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md), feature 004, entregado con el [PR #26](https://github.com/sebastianaviladev01-xyz/WebStore/pull/26)). La tienda pinta el fondo de sus páginas (`html`, `body`, el shell y la página 404) con `--ws-store-bg` y la clase `bg-store-canvas`; el Admin conserva su lienzo plomo, `--ws-bg` con `bg-canvas`, y lo único suyo que usa el lienzo de la tienda es la vista previa de Temas. `bg-canvas` sigue siendo el relleno de los dos buscadores de la tienda, que así se siguen viendo como campo sobre la cabecera blanca. El valor es el **tono intermedio**, a medio camino entre el fondo principal y el blanco, elegido por Daniel el 2026-11-13 frente al blanco puro (AC-14): A `#FAFAFB`, B `#F9FAFC` y C `#F9F9FA`. En un tema propio, el lienzo de la tienda es su fondo principal. Las tarjetas, el resumen y el panel del checkout se separan del lienzo por su relleno blanco (1.04, 1.04 y 1.05:1 con A, B y C) y por su borde de 1 px. Con B, la colección alternada del inicio (`subtle`, `#F6F8FA`) queda algo más oscura que el lienzo.

La franja superior (`--ws-topbar` y `--ws-on-topbar`) es: en B, `--ws-primary-strong` con `#ffffff`; en A, `#2E1A5C` con `#FFFFFF`; en C, grafito `#1F2328` con `#FFFFFF`; en un tema propio, su `primary-strong` con el más legible entre blanco, el color de contraste y la superficie (lote 03).

Quedan **fijos en `tokens.css`**, fuera del mapa, porque no dependen de la paleta: `--ws-on-media` (texto y botones sobre fotos y velos) y `--ws-scrim` (velo negro al 45 %). Dónde se usan hoy: `--ws-scrim` solo pinta el fondo que oscurece la página tras el cajón de navegación abierto, en la tienda y en el Admin (`bg-scrim`); ningún texto va sobre él ni sobre una foto con él, así que no necesita un contraste mínimo (PBI-0166, descartada en el lote 10). `--ws-on-media` pinta el fondo del enlace «Saltar al contenido» y los botones `ws-btn-on-dark` y `ws-btn-light`, que hoy ninguna plantilla usa. El texto que sí va sobre una foto, el contador del carrusel del inicio con «Tono de la foto: Oscura», se define aparte ([Controles del carrusel sobre fotos](#controles-del-carrusel-sobre-fotos)). El error y la alerta eran fijos hasta el lote 03: con A, B y C conservan sus valores (`#B42318`, `#FEF3F2`, `#FECDCA`, `#8A4B08` y `#FFF6E5`), y en un tema propio se calculan ([ADR-0019](../../docs/adrs/0019-calcular-con-el-tema-el-error-la-alerta-y-el-texto-sobre-el-principal.md)).

**Derivación de un tema propio.** Cada token que no es uno de los cinco colores se calcula con `color-mix(in srgb, <hex> N%, <hex>)` sobre colores literales (P, S, F, Sf y C son el principal, el secundario, el fondo principal, el secundario y el contraste):

- Con texto blanco sobre el principal, `primary-strong` es `color-mix(P 62%, C)`; con el texto en el color de contraste, `color-mix(P 88%, C)`. Si el texto sobre P no llega a 4.5:1 sobre el resultado, `primary-strong` es P.
- `primary-soft` es `color-mix(P 10%, Sf)`; `accent-strong`, `color-mix(S 78%, C)`; `accent-soft`, `color-mix(S 9%, Sf)`.
- `on-primary` es, entre blanco, C y Sf, el que más contraste dé sobre P, y `on-topbar`, con los mismos candidatos, sobre `primary-strong` (lote 03, ADR-0019): con un principal muy claro sobre una base oscura, la superficie. `on-accent` es, con los mismos candidatos, el que más contraste dé sobre S (lote 02, PBI-0152). `on-primary-soft` es `primary-strong` si llega a 4.5:1 sobre el tinte; si no, C.
- `link` y `focus-ring` son P si llega a 4.5:1 y 3:1 sobre F y sobre Sf; si no, C.
- `on-link` es, entre blanco, C y Sf, el que más contraste dé sobre el `link` ya calculado. A diferencia de `on-primary`, considera la superficie: en un tema oscuro es lo único que se lee sobre un enlace claro. En A, B, C y los temas claros da el blanco ([ADR-0014](../../docs/adrs/0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md)).
- Neutros: `muted` `color-mix(C 68%, Sf)`, `muted-strong` `color-mix(C 82%, Sf)`, `surface-subtle` `color-mix(C 3%, Sf)`, `surface-soft` `color-mix(C 9%, Sf)`, `border` `color-mix(C 14%, Sf)`, `border-strong` `color-mix(C 50%, Sf)`, `disabled` `color-mix(C 10%, Sf)`, `disabled-text` `color-mix(C 68%, Sf)` y `dot` `color-mix(P 30%, Sf)`.
- Pie: `footer` es C, `footer-text` `color-mix(Sf 78%, C)`, `footer-rule` `color-mix(Sf 15%, C)` y `footer-heading` Sf.
- Error y alerta (lote 03): para cada uno, la variante cuyo texto se lee mejor sobre F y sobre Sf. Sobre fondos claros, los valores de A, B y C; sobre fondos oscuros, `#FDA29B` y `#FEC84B`, con el recuadro `color-mix(texto 12%, Sf)` y la línea del error `color-mix(texto 40%, Sf)`. Con la superficie `#1B1E25`, el error y la alerta pasan de 2.54 y 2.45:1 a 8.59 y 10.78:1.

**Base neutra.** Si el fondo principal, el fondo secundario y el contraste de un tema propio coinciden con los de un predefinido, sin distinguir mayúsculas, el tema hereda la escala neutra de ese predefinido: `bg`, superficies, `ink`, `text`, `muted` y `muted-strong`, bordes, deshabilitados, `dot` y los cuatro tokens del pie. Así, un tema que solo cambia el principal y el secundario sobre la base de B se ve como antes con esos dos colores. Los tokens de marca (principal, acento y los que se calculan con ellos) se derivan siempre.

**Contraste al guardar.** Hay 27 pares medidos (`PARES_DE_CONTRASTE`). Solo el contraste sobre el fondo principal y sobre el secundario bloquean el guardado de un tema propio; el foco y el contorno de los campos piden 3:1 y el resto 4.5:1, y esos solo avisan. La feature 004 añadió cinco: el texto, el texto secundario, el enlace y el foco sobre el lienzo de la tienda (`*/storeBackground`) y el contorno de los campos sobre la superficie (`borderStrong/surface`, WCAG 1.4.11). Para que este último llegue a 3:1 con B, `--ws-border-strong` de B pasó de `#8a96a8` (2.996:1) a `#8894a6` (3.07:1); A y C no cambian. La feature 005 añadió el par 21, `onLink/link` (el texto sobre el enlace, 4.5:1, solo avisa). Con las reglas actuales no baja de 4.5:1 en ningún tema válido, porque la superficie es candidata y `contrast/surface` bloquea: es una red de seguridad. El lote 03 añadió seis, a 4.5:1 y sin bloquear: el error y la alerta sobre el fondo, sobre la superficie y sobre su recuadro (`danger/*` y `warning/*`). Con A, B y C: error 5.98, 6.02 y 5.92:1 sobre el fondo, 6.57:1 sobre la superficie y 6.05:1 sobre su recuadro; alerta 6.19, 6.22 y 6.12:1, 6.79:1 y 6.33:1.

**Contraste medido de los predefinidos** (fórmula de WCAG 2.1, sobre los mapas reales; todos alcanzan su mínimo):

**B · Azul cobalto** (por defecto)

| Par | Contraste |
|---|---:|
| Texto sobre el fondo / la superficie | 16.35 / 17.85 |
| Texto secundario sobre el fondo / la superficie | 5.85 / 6.39 |
| Texto sobre el principal / el principal fuerte | 6.70 / 10.17 |
| Texto sobre el tinte | 8.69 |
| Texto sobre el acento | 5.18 |
| Enlace sobre el fondo / la superficie | 6.14 / 6.70 |
| Texto sobre el enlace | 6.70 |
| Foco sobre el fondo / la superficie (mínimo 3) | 6.14 / 6.70 |
| Pie | 10.81 |
| Texto deshabilitado | 4.84 |
| Barra superior (texto sobre la barra) | 10.17 |
| Texto / texto secundario sobre el lienzo de la tienda | 17.09 / 6.11 |
| Enlace / foco sobre el lienzo de la tienda | 6.42 / 6.42 |
| Contorno de los campos sobre la superficie (mínimo 3) | 3.07 |

**A · Violeta tienda**: principal `#4C2A92`, secundario `#F5A524`, fondo `#F4F4F6`, superficie `#FFFFFF`, contraste `#17151C`.

| Par | Contraste |
|---|---:|
| Texto sobre el fondo / la superficie | 16.47 / 18.10 |
| Texto secundario sobre el fondo / la superficie | 6.30 / 6.92 |
| Texto sobre el principal / el principal fuerte | 10.23 / 14.80 |
| Texto sobre el tinte | 10.95 |
| Texto sobre el acento | 8.40 |
| Enlace sobre el fondo / la superficie | 9.31 / 10.23 |
| Texto sobre el enlace | 10.23 |
| Foco sobre el fondo / la superficie (mínimo 3) | 9.31 / 10.23 |
| Pie | 10.78 |
| Texto deshabilitado | 5.09 |
| Barra superior (texto sobre la barra) | 14.80 |
| Texto / texto secundario sobre el lienzo de la tienda | 17.35 / 6.64 |
| Enlace / foco sobre el lienzo de la tienda | 9.80 / 9.80 |
| Contorno de los campos sobre la superficie (mínimo 3) | 3.43 |

**C · Grafito y ámbar**: principal `#F2B705`, secundario `#1F2328`, fondo `#F2F3F5`, superficie `#FFFFFF`, contraste `#1F2328`. Sobre el principal claro, el texto, el enlace y el foco van en grafito, no en blanco (REQ-17).

| Par | Contraste |
|---|---:|
| Texto sobre el fondo / la superficie | 14.23 / 15.80 |
| Texto secundario sobre el fondo / la superficie | 6.16 / 6.84 |
| Texto sobre el principal / el principal fuerte | 8.69 / 7.02 |
| Texto sobre el tinte | 5.48 |
| Texto sobre el acento | 8.69 |
| Enlace sobre el fondo / la superficie | 14.23 / 15.80 |
| Texto sobre el enlace | 15.80 |
| Foco sobre el fondo / la superficie (mínimo 3) | 14.23 / 15.80 |
| Pie | 11.14 |
| Texto deshabilitado | 4.53 |
| Barra superior (texto sobre la barra) | 15.80 |
| Texto / texto secundario sobre el lienzo de la tienda | 15.01 / 6.50 |
| Enlace / foco sobre el lienzo de la tienda | 15.01 / 15.01 |
| Contorno de los campos sobre la superficie (mínimo 3) | 3.16 |

Particularidades aceptadas:

- Las fotos de producto se funden con `mix-blend-mode: multiply` sobre el fondo de su tarjeta, que es un token del tema: con A y C su fondo blanco toma el neutro del tema. No cambian el archivo ni el `src` (el logo y las imágenes no cambian).
- En C, el elemento activo del menú del Admin usa el tinte ámbar (`#FFF6D6` con texto `#8A5A00`); la pestaña activa de la tienda es grafito.
- `color-scheme: light` no cambia: un tema propio oscuro se puede guardar si cumple el contraste bloqueante, pero los controles nativos del navegador siguen claros.

## Tipografía

- Una sola familia, acordada en las sesiones: **Source Sans 3 Variable**, servida localmente con `@fontsource-variable`. Se eliminó la carga de Noto Sans desde Google Fonts que tenía el Admin.
- Pesos de 400 a 600. La jerarquía se construye con tamaño, peso y color; no se usan 700–900.
- El nombre de la familia configurado desde el CMS se aplica entre comillas. Sin comillas, "Source Sans 3" es CSS inválido y el navegador caía a Times New Roman.
- Hero: `clamp(36px, 4vw, 52px)`, peso 600, interletrado −0.03em. Secciones: `clamp(1.5rem, 2.2vw, 2rem)`. Títulos del Admin: 30 px.
- Precios y cantidades usan números tabulares.
- No hay etiquetas en mayúsculas sobre los títulos ("eyebrows"). Se quitaron las del Admin y la del 404. La etiqueta de campaña del CMS se muestra junto al botón.
- Excepción: el rol del botón del menú de usuario del Admin va en mayúsculas (`uppercase`, solo de presentación). No es una etiqueta sobre un título, sino la segunda línea del botón, bajo el nombre; en el panel del menú y en Perfil, el rol se escribe tal cual.

## Forma, ritmo y estados

- Contenido hasta 1280 px con márgenes de 32 px (16 px en móvil); el hero comparte ese ancho.
- Radios: 10 px en botones, 14 px en tarjetas, 20 px en el hero.
- Profundidad: bordes `line` y sombras mínimas; las tarjetas no flotan.
- Foco: contorno sólido de 2 px con `--ws-focus-ring` (en B, el color principal).
- Hover: cambio de borde o color y un desplazamiento máximo de 2 px, solo en dispositivos con cursor.
- `prefers-reduced-motion` desactiva animaciones y el autoplay del carrusel.

### Camino de compra

Feature 004, entregada con el [PR #26](https://github.com/sebastianaviladev01-xyz/WebStore/pull/26):

- **Diálogo «Producto agregado».** Dos botones, en este orden: «Seguir comprando» (`mat-button`, cierra el diálogo) y «Ver carrito» (`mat-flat-button`, el principal, relleno). El botón relleno toma `--mat-button-filled-container-color: var(--ws-primary)` y `--mat-button-filled-label-text-color: var(--ws-on-primary)` en `tokens.css`: Material lo pintaría con `--mat-sys-primary` (`--ws-link`) y `--mat-sys-on-primary`, que con C valen los dos `#1F2328`. Contraste de «Ver carrito»: 10.23, 6.70 y 8.69:1 con A, B y C. Desde la feature 005, `--mat-sys-on-primary` es `--ws-on-link`, así que el botón suma `--mat-button-filled-state-layer-color: var(--ws-on-primary)`. Con eso, el velo del 8 % al pasar el puntero o enfocar sigue en el color del texto sobre el principal: grafito sobre el ámbar con C. Con el velo, la etiqueta se lee a 8.29, 5.71 y 7.55:1 con A, B y C. Desde el lote 05 (PBI-0039, confirmado por Daniel el 2026-11-20), bajo el texto y separado por un borde `line`, «También te puede interesar» (`text-sm`, peso 600, `ink`) lista hasta tres productos: miniatura de 64 × 48 px sobre `soft`, nombre (`text-sm`, peso 600, `body`) y precio (`muted`, números tabulares); cada fila es un enlace a la ficha que cierra el diálogo, con `soft` al pasar el puntero.
- **Página 404 y favicon** (lote 05: PBI-0020 y PBI-0046, confirmados por Daniel el 2026-11-20). La 404 conserva su lienzo, su «404» en `link` y su título, que ahora dice «Página no encontrada», con una frase y dos botones: «Ir al inicio» (`ws-btn-primary`) y «Ver productos» (`ws-btn-secondary`). El favicon es `assets/brand/favicon.svg`: la «W» blanca sobre el azul de B (`#1D4ED8`), con la forma de la marca de la cabecera; es un archivo fijo, no sigue el tema activo.
- **Textos.** El enlace principal del resumen del carrito dice «Confirmar pedido». El checkout se titula «Finalizar compra» (también en la pestaña: «WebStore | Finalizar compra») y su botón dice «Finalizar compra» («Procesando…» al enviar).
- **Panel del checkout** (`ws-checkout-panel`). Los tres pasos van en un solo panel con el aspecto del resumen del pedido: superficie, borde `line`, radio de 14 px y relleno de 28 px (22 px hasta 600 px), sin el `sticky` del resumen. En escritorio va a la izquierda del resumen; en móvil, encima.
- **Campos con contorno.** Los campos del checkout usan `appearance="outline"`, como los filtros del catálogo. Desde el lote 05 (PBI-0047), también los de ingresar, registro, verificar, recuperar, perfil, detalle del pedido y libro de reclamaciones, con los mismos tokens: su formulario lleva la clase `ws-outline-fields`, que comparte la regla de `ws-checkout-panel`. Los filtros del catálogo siguen con los valores de Material (radio de 4 px y foco en `--ws-link`). El panel fija los tokens `--mat-form-field-outlined-*`: en reposo, contorno de 1 px en `--ws-border-strong`, sin relleno; con el foco, 2 px en `--ws-focus-ring`; con error, `--ws-danger`, también con el ratón encima; radio `--ws-radius`. Con el ratón encima, el contorno en reposo pasa a `--ws-ink` (valor de Material). La etiqueta sube al borde en 150 ms; con `prefers-reduced-motion`, sin transición. Sin `::ng-deep` ni clases internas de Material (STD-04). Contraste sobre la superficie, con A, B y C: contorno en reposo 3.43, 3.07 y 3.16:1; contorno y etiqueta con el foco 10.23, 6.70 y 15.80:1; error 6.57:1. Con C, el foco es grafito (`#1F2328`), el `--ws-focus-ring` de C.

### Admin: funciones nuevas (lote 07b)

Daniel confirmó el menú y la campana el 2026-11-18. El 2026-11-20 pidió quitar «Personas en línea» (PBI-0172) y no pidió cambios en la actividad reciente ([decisiones pendientes](../../docs/planning/PENDING-DECISIONS.md)):

- **Menú lateral** (PBI-0044). Cada enlace lleva un ícono SVG de 20 px, de trazo (1.8) y en el color del texto del enlace, a la izquierda de su nombre. Reducido, el menú mide 76 px, sin títulos de grupo: los íconos van centrados, un grupo tras otro separados por una línea `line`, y la marca queda solo con la «W». La hamburguesa va a la izquierda de «Backoffice de la tienda». En el celular, el panel mide hasta 300 px (85 % del ancho), sobre el velo `scrim`, con los grupos como etiquetas `muted`.
- **Campana** (PBI-0033). Botón de 40 px con la campana de trazo en `muted`, junto al menú de usuario; el número va en un círculo `primary` con texto `on-primary` (10 px, «9+» desde 10). El menú usa el panel del menú de usuario, con 288 px de ancho mínimo.
- **Resumen** (PBI-0027 y PBI-0028). Una fila nueva al final: «Actividad reciente» (dos tercios, plegable como los demás bloques, una línea por evento con la fecha en `muted`) y «Personas en línea» (un tercio, la cifra con el tamaño de las tarjetas).
- **Perfil** (PBI-0034). Dos tarjetas: «Datos de la cuenta» (Nombre, Correo, el rol de solo lectura y «Guardar datos») y «Cambiar contraseña» (actual, nueva con su ayuda y repetición), con los campos rellenos del Admin y los avisos de éxito en `primary-soft`.
- **Imagen de la categoría** (PBI-0052). En el registro, una vista previa de 64 px; en la tienda, 22 px con radio de 6 px junto al nombre en el menú de categorías y 28 px en el panel del celular. Desde el lote 11 ([ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0162), también 40 px con radio de 8 px y borde `line` sobre `subtle` en la lista de Categorías del Admin, 22 px con radio de 6 px en las opciones del filtro «Categoría» del catálogo (`ws-category-option-image`) y 44 px con radio de 10 px en las tarjetas «Compra por categoría» del inicio (a la izquierda del texto) y de `/inicio-anterior` (encima del nombre; `ws-category-access-image`); hasta 600 px, 36 px con radio de 8 px y siempre encima del nombre, para no estrechar el texto de las dos columnas. Se muestra siempre con `object-fit: contain` y `alt` vacío (el nombre ya lo dice). El pie y las pestañas de Destacados del inicio siguen solo con el nombre. Sin imagen, nada cambia.

### Fondos de Material con el tema

Lote 03 (PBI-0060 y PBI-0053). El tema base de Material (`azure-blue.css`) fijaba el relleno de los campos (`#E0E2EC`), el panel de las listas desplegables (`#EFEDF0`) y la opción seleccionada (`#DAE2F9` con `#3E4759`): con un tema propio oscuro, lo escrito en un campo quedaba a 1.20:1. `tokens.css` los toma del tema, con tokens que ya existían:

| Token de Material | Token del tema | A, B y C | Qué cambia a la vista |
|---|---|---|---|
| `--mat-sys-surface-variant` (relleno de los campos) | `--ws-border` | `#DFDEDF`, `#DDE3EC`, `#E0E0E1` | B casi igual; A y C pierden el tinte azulado |
| `--mat-sys-surface-container` (panel de las listas y de autocompletar) | `--ws-bg` | `#F4F4F6`, `#F3F5F8`, `#F2F3F5` | Algo más claro (de 3 a 8 unidades por canal) |
| `--mat-sys-secondary-container` y `--mat-sys-on-secondary-container` (opción seleccionada y su marca) | `--ws-primary-soft` y `--ws-on-primary-soft` | 10.95, 8.69 y 5.48:1 | Toma el tinte del principal (cambio pedido) |
| `--mat-sys-on-error-container` (error de un campo relleno con el puntero encima) | `--ws-danger` | 6.57:1 sobre la superficie | Antes `#93000A` |

El panel usa el fondo principal y no la superficie suave, que está algo más cerca de `#EFEDF0` pero dejaría la opción seleccionada casi igual que el panel. Material pinta los colores de la opción seleccionada solo cuando no es la activa (al abrir la lista, la seleccionada es la activa y lleva el velo de foco). Con el relleno nuevo, el texto, la etiqueta y la etiqueta enfocada se leen como antes: con B, 13.83, 4.95 y 5.19:1 (antes 13.82, 4.94 y 5.19:1).

### Material y enlaces de la tienda

Feature 005, entregada con el [PR #35](https://github.com/sebastianaviladev01-xyz/WebStore/pull/35):

- **`on-primary` de Material.** `tokens.css` mapea `--mat-sys-primary` a `--ws-link` y `--mat-sys-on-primary` a `--ws-on-link`: lo que Material pinta sobre su `primary` usa el par medido del enlace. La casilla marcada del Admin tiene el relleno del enlace y la marca de `--ws-on-link`: blanca sobre el principal con A y B (10.23 y 6.70:1, como antes) y blanca sobre el grafito con C (15.80:1; antes, grafito sobre grafito, 1:1). La casilla sin marcar conserva su borde `--ws-muted` (`--mat-sys-on-surface-variant`). Sin `::ng-deep` ni clases internas de Material (STD-04).
- **Regla `a` de la tienda en la capa base.** `a { color: inherit; text-decoration: none; }` va dentro de `@layer base` en `src/styles.css`, como la de márgenes. Fuera de capa anulaba las utilidades de Tailwind, y ahora los enlaces muestran su color y su subrayado:
  - «Ver todos los productos» del cajón móvil, con `--ws-on-primary` sobre el principal: 10.23, 6.70 y 8.69:1 con A, B y C; antes, 1.77 y 2.18:1 con A y B;
  - «Ver toda la categoría», las subcategorías del cajón, «Crear cuenta» y «Mis pedidos» del detalle del pedido, con su color en reposo;
  - el nombre del producto del carrito y el correo del pie, con su color al pasar el puntero;
  - «Inicia sesión» de `/pedidos`, subrayado siempre;
  - «Ayuda» y «Seguimiento de pedidos» de la franja superior, subrayados al pasar el puntero.

  Los enlaces sin utilidades, como «Olvidé mi contraseña», siguen heredando el color y sin subrayado. Las clases `ws-*` y el foco (`a:focus-visible`) siguen fuera de capa y no cambian.

### Controles del carrusel sobre fotos

Con «Tono de la foto: Oscura» en el banner (Admin, solo en escritorio), los controles del carrusel del inicio (contador «1 / N», barra de progreso y flechas) pasan a una cápsula de vidrio: `--ws-ink` al **62 %** sobre la foto, con el texto y los íconos en `--ws-surface`. Desde el lote 10 (PBI-0167) la opacidad es el 62 % y no el 50 %: es lo justo para que el contador, de 14 px, llegue a 4,5:1 (WCAG 1.4.3) sobre una foto blanca, el peor caso, con el `--ws-ink` más claro de los temas predefinidos (el de C: 3,16:1 con el 50 % y 4,52:1 con el 62 %; A pasa de 3,43:1 a 5,06:1 y B de 3,41:1 a 5,02:1). Lo comprueba `src/styles/controles-sobre-fotos.spec.mjs`, que lee la opacidad de `home.css` y el `--ws-ink` y el `--ws-surface` de los tres temas, y falla si el vidrio se aclara. Un tema propio con `--ws-ink` más claro que el de C no está cubierto por esa prueba.

## Movimiento

**Criterio del equipo (reunión, notas del 2026-11-11):** la rapidez va antes que el efecto. Daniel advirtió que las animaciones y cargas lentas frustran al cliente, que "quiere comprar rápido", aunque se vean bonitas. Las animaciones deben ser cortas y limpias, y en el camino de compra (agregar al carrito, carrito y checkout) no deben hacer esperar.

- Hero: transición cruzada de 480 ms y texto escalonado. Como en la propuesta B, lleva dos botones (principal y "Ver todos los productos" en blanco) y debajo los puntos: la píldora activa se llena en 8 s y los inactivos son puntos de 6 px, con área táctil de 44 px. Junto a ellos va el botón de pausa (necesario por el avance automático). El número de diapositiva se anuncia solo a lectores de pantalla.
- Mega-menú, drawer y filtros: entradas cortas (180–260 ms) sin animar el resto de la página.
- Plegables del Admin (grupos del menú lateral y bloques del Resumen): la región se pliega y el indicador gira en 200 ms; con `prefers-reduced-motion`, sin transición.
- Aparición al hacer scroll (`RevealDirective`, `[wsReveal]`): categorías, destacados, colecciones, campañas y beneficios entran con un desplazamiento de 24 px hacia arriba (40 px en horizontal) y opacidad, en 560–680 ms, escalonados 80 ms por elemento (máximo 320 ms).
  - Lo que ya está en pantalla al cargar no se anima.
  - Sin JavaScript, con `prefers-reduced-motion` o sin `IntersectionObserver`, el contenido se ve directamente.
  - Lo que queda arriba por un salto (scroll rápido, ancla, volver atrás) se revela igual.
- Colecciones alternadas: la primera muestra el texto a la izquierda y los productos a la derecha; la siguiente invierte el orden y usa el fondo `subtle`. El texto entra desde su lado y los productos desde el contrario. En móvil (≤900 px) siempre va primero el texto.

## Alineación con la propuesta B

Se tomaron de la propuesta: los dos botones y los puntos del hero, el buscador plano sobre plomo, la línea "Marca · SKU" en las fichas y un ritmo de secciones más compacto (48–72 px).

En Destacados se volvió a las pestañas subrayadas del inicio anterior: la pestaña activa va en negrita con una línea azul de 2 px sobre una línea fina a todo el ancho. Cada pestaña mide 48 px de alto, en celular se deslizan en horizontal y reservan el ancho de la negrita para no moverse al elegir una. El subtítulo es "Tecnología elegida por su diseño y desempeño, con precios que ya incluyen IGV."

Se mantuvieron de la tienda actual, por ser mejores para el comprador: la cantidad de productos en cada categoría, la descripción corta en la ficha, las etiquetas de texto en las acciones de la cabecera, las colecciones alternadas y la aparición al hacer scroll.

La versión anterior a esta alineación sigue disponible en `/inicio-anterior` para compararlas. Desde el lote 03 (PBI-0084), su texto no usa el principal: el contador del carrusel («1 / 3») y la categoría del menú con el puntero encima o activa van en `--ws-link`. Con C, el contador pasa de 2.14:1 (ámbar) a 15.01:1 (grafito); con A y B pasa del principal fuerte al color de los enlaces (9.80:1 y 6.42:1 sobre el lienzo).

## Admin

- La barra lateral es clara (superficie blanca y borde) y está agrupada en General, Catálogo, Ventas, Tienda y Accesos. Solo muestra los módulos que el rol puede abrir.
- En escritorio, cada título de grupo es un botón plegable con un indicador: un chevron de 14 px, en el `muted` del título, que apunta abajo plegado y arriba desplegado. Al entrar solo está desplegado el grupo de la página actual, y navegar sin recargar conserva lo plegado. En móvil (por debajo de `lg:`) el menú sigue siendo la tira horizontal, con todos los enlaces y sin títulos de grupo.
- Los cinco bloques del Resumen con título (no la fila de tarjetas) se pliegan con un botón en el propio título y un chevron de 16 px en `muted`, junto al texto y no en el borde derecho. Un bloque plegado conserva su encabezado y no se estira al alto de la fila. El estado del menú y de los bloques no se guarda en el navegador: al recargar o volver a iniciar sesión, vuelve al inicial.
- Los indicadores usan el `muted` del tema activo, como los títulos de grupo, en A, B y C.
- Los plegables usan las clases `ws-plegable`, `ws-plegable-lg`, `ws-plegable-contenido` y `ws-plegable-indicador` del `styles.css` del Admin: la región pasa de `1fr` a `0fr` y, plegada, queda con `visibility: hidden`, fuera del orden de tabulación.
- La cabecera muestra el menú de usuario (`ws-admin-menu-usuario`); desde el lote 07 (PBI-0140) «Actualizar» ya no está en la cabecera: el Resumen lleva el suyo a la derecha del título, con el mismo estilo (borde `border-line`, 40 px de alto). El botón lleva un círculo de 32 px con las iniciales (`bg-primary`), el nombre recortado con puntos suspensivos y el rol en mayúsculas debajo, y un chevron. A 375 px solo se ven las iniciales y el chevron; el nombre y el rol quedan para lectores de pantalla.
- El panel del menú de usuario (`ws-menu-usuario-panel`) es un `MatMenu` con los tokens del tema: superficie, borde, radio de 14 px y `shadow-lg`. Muestra el nombre, el correo y el rol, un separador, «Perfil» y «Cerrar sesión», y cabe en la pantalla a 375 px.
- Perfil (`/perfil`) es una tarjeta de solo lectura con el nombre, el correo y el rol con su descripción, en dos columnas desde `sm:` y en una en móvil.
- Tablas con encabezado `subtle`, filas con borde `line` y la fila seleccionada en `primary-soft`.
- La lista de productos (`/productos`) por debajo de 768 px va en dos líneas por producto y sin la cabecera de columnas: el nombre y la línea «SKU · características · fotos» a todo el ancho; debajo y a la derecha, el precio, «Stock N» y las acciones «Editar» y «Eliminar». La etiqueta «Stock» va en `text-muted`, con peso normal, solo en móvil (`md:hidden`); el número sigue en `text-danger` cuando el stock es 0. Desde 768 px es la tabla de cuatro columnas de siempre.
- Los listados de Productos, Categorías y Marcas (feature [008](../../docs/specs/features/008-filtros-y-registro-del-catalogo/specification.md), entregada con el [PR #48](https://github.com/sebastianaviladev01-xyz/WebStore/pull/48)) tienen la misma disposición, de arriba abajo: el título; el panel de filtros, con «Agregar» (lote 11, PBI-0171; antes «Nuevo producto», «Nueva categoría» o «Nueva marca», a la derecha del título); la lista a todo el ancho, sin formulario al lado; y, dentro de la lista, la paginación.
- El panel de filtros (`ws-filter-panel`) es una `admin-card` (`p-5`) con los campos en una rejilla de una columna, dos desde `sm:` y tres desde `xl:`, y debajo, alineados a la derecha y en este orden (lote 11, [ADR-0021](../../docs/adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md), PBI-0171; Daniel, 2026-11-20), «Buscar» (relleno, `bg-primary`; «Buscando…» y deshabilitado mientras consulta), «Limpiar» (con borde `line`; nombre accesible «Limpiar filtros») y, en los listados con alta, «Agregar» (relleno, `bg-primary`; nombre accesible «Agregar producto», «Agregar cliente», etc.). Cada uno lleva a la izquierda su ícono de trazo de 18 px (1.8, en el color del texto), como los del menú lateral: lupa, borrador y más. «Agregar» abre la interfaz de registro en Productos, Categorías y Marcas, y en Clientes, Usuarios, Banners y Tarifas de envío sale de la edición y lleva el foco al formulario de alta; Inventario, Reclamaciones y Pedidos no tienen alta y no lo llevan. Si la búsqueda falla, el aviso sale debajo del panel, encima de la lista, en la caja de peligro (`bg-danger-soft`, borde `danger-line`).
- La paginación compartida (`ws-pagination`) es la barra de Tarifas de envío: «Anterior», «Página N de M» en `muted` y «Siguiente», con borde superior `line`, al pie de la lista. Solo aparece con más de 25 resultados.
- Las interfaces de registro (`/productos/nuevo`, `/productos/:id` y sus pares de categorías y marcas) muestran «← Volver a …» encima del título de la página (`h1`: «Nuevo producto», «Editar producto» y sus pares), y debajo el formulario de siempre en una `admin-card` de `max-w-2xl`, con «Cancelar» (enlace con borde) junto a «Guardar». Mientras traen los datos, «Cargando…»; si el registro ya no existe, una tarjeta «Este producto ya no existe» (o categoría, marca); si la consulta falla, un aviso en `bg-warning-soft`; y si el guardado falla, el motivo junto al botón. En el menú lateral sigue marcado el módulo de su listado.
- Para cambiar solo el móvil se añaden clases `max-md:` (y `md:hidden` para lo que solo se ve en móvil) a las de escritorio, sin cambiar ni quitar ninguna, de modo que el escritorio queda igual.
- Los mensajes de error del BFF (por ejemplo, "Debe quedar al menos un superadministrador activo") se muestran tal cual en el aviso del panel.

## Recursos

Las fotografías de producto y del hero son imágenes propias generadas para un catálogo ficticio, sin marcas ni textos (prompts en `frontend/docs/IMAGE-PROMPTS.md`). No se usan activos, campañas ni textos de LG.

## Verificación

- `npm run build:all`, `npm run validate:contract` (estructura, pruebas unitarias y smoke del BFF) y `npm run format:check` en verde.
- Revisado en el navegador: inicio, catálogo, carrito, checkout y Admin en escritorio, y la tienda a 375 px, sin desbordes horizontales.
- Compra completa como invitado sobre una copia de los datos: pedido, consulta con token y cancelación.
