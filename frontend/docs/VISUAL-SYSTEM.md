# Sistema visual WebStore

## Dirección

Hay **tres temas predefinidos**, las tres propuestas del 05/11: **A · Violeta tienda**, **B · Azul cobalto** y **C · Grafito y ámbar**. Todos sus pares de texto cumplen WCAG AA (tablas en «Paleta y tokens»). B es el tema por defecto, en la demo y en toda instalación nueva, y es el que describe el resto de este documento; A y C solo cambian los colores, nunca la estructura, la tipografía ni el espaciado. El tema activo lo elige el `superadmin` en Admin → Temas ([ADR-0010](../../docs/adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md) y [ADR-0011](../../docs/adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md)).

La paleta **B · Azul cobalto** se eligió entre las tres propuestas por ser la única que no choca con ninguna versión de lo acordado: no usa beige, verde ni violeta, se aleja del rojo y los neutros cálidos de LG y todos sus pares de texto cumplen WCAG AA.

La tienda es un retail de tecnología y electrohogar en Lima. El azul cobalto transmite confianza para comprar; el naranja quemado se reserva para lo que exige atención comercial (ofertas, contador del carrito). Todo lo demás es estructura neutra sobre un lienzo plomo.

Por pedido de Sebastián (06/11), el inicio actual toma la **estructura** de la portada de LG Perú (banner amplio con el texto sobre la imagen, beneficios en el banner, controles abajo a la derecha y una fila de accesos con ícono). El **estilo** es propio: paleta cobalto, Source Sans 3, radios redondeados, velo azul en lugar de texto sobre la foto cruda y fotos y textos propios. No se usan marca, campañas, contador de ofertas ni recursos de LG. La versión con estructura totalmente propia sigue en `/inicio-anterior`.

| Zona            | Patrón típico de LG                                | WebStore                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero            | Carrusel a sangre completa con texto sobre la foto | Banner pegado a la cabecera y de borde a borde hasta 1920 px (el alto acompaña al ancho con la proporción del banner original, 1520 × 520, mínimo 520 px); en pantallas más grandes deja de crecer y queda centrado, como en LG. La foto y el velo son los del banner original; el texto se alinea con el logo y los controles van en la esquina inferior derecha en la esquina inferior derecha con el mismo aire a la derecha y abajo (40 px; 16 px en móvil), igual para cualquier banner, como en LG, en una cápsula de vidrio transparente sin borde, como en LG (blanco al 50 %, desenfoque mínimo, 40 px de alto, con el hover de cada botón al ras de la cápsula y en azul de la marca); en las fotos de estudio el producto va centrado en la mitad derecha del contenido; sobre fotos de ambiente, los beneficios van en el color de texto principal y la descripción y los beneficios llevan un halo suave del azul del velo; si el banner tiene "Tono de la foto: Oscura", en escritorio la cápsula pasa a vidrio oscuro con íconos blancos; en tablet y móvil vuelve a ser una tarjeta redondeada. La foto llena el banner y un velo azul suave asegura el contraste del texto; las fotos de estudio se funden con el azul. Etiqueta del banner, dos botones y dos beneficios del CMS; controles en una píldora abajo a la derecha: contador "1 / N", una barra de progreso única (escala a cualquier cantidad de banners), anterior, pausa y siguiente. En móvil la imagen va arriba y el texto debajo |
| Cabecera        | Una fila: logo, categorías, buscador e íconos      | Dos filas ordenadas: franja azul (mensaje del CMS y Ayuda); logo con su sombra, buscador de hasta 560 px centrado entre WebStore e Ingresar, Ingresar, Pedidos (ícono de caja) y Carrito; categorías con Envíos (ícono de camión, mismo color que las categorías) alineado con Carrito, y la flecha de las categorías con submenú tenue en reposo, sin línea divisoria. Cada destino aparece una sola vez                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Accesos rápidos | Fila de íconos circulares de campañas              | Fila de íconos de servicios: Tienda online, Destacados, Mis pedidos, Envíos, Mi cuenta, Libro de reclamaciones y Contáctanos (Envíos y Contacto según su interruptor del CMS). No son categorías, que siguen sin íconos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Categorías      | Íconos o fotos circulares de producto              | Tarjetas de texto a todo el ancho: nombre, cantidad real de productos, subcategorías, precio "Desde" calculado del catálogo y flecha; sin íconos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Beneficios      | Franja oscura con íconos de línea                  | Tarjetas claras con ícono en recuadro azul suave                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Footer          | Gris claro multinivel                              | Azul marino `#0F1B33` con texto `#C5CEDD`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Admin           | —                                                  | Barra lateral clara agrupada por área (Catálogo, Ventas, Tienda, Accesos)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Paleta y tokens

`src/styles/tokens.css`, importado por la tienda y por el Admin, es la paleta B y el respaldo: lo que se ve si el BFF no responde. El tema activo llega del BFF en `/bff/appearance/theme.css`, una hoja que redefine los tokens del tema en un bloque `:root:root` y bloquea el primer pintado, así que no hay parpadeo. La tabla siguiente son los valores de B. Las plantillas usan nombres semánticos de Tailwind (`bg-primary`, `text-muted`, `border-line`…); no hay grises, índigos ni hex sueltos en los templates.

| Token CSS                              | Clase Tailwind   |                 Valor | Uso                                                   |                                   Contraste |
| -------------------------------------- | ---------------- | --------------------: | ----------------------------------------------------- | ------------------------------------------: |
| `--ws-primary`                         | `primary`        |             `#1D4ED8` | Acciones, enlaces, foco, navegación activa            |                          6.7:1 sobre blanco |
| `--ws-primary-strong`                  | `primary-strong` |    mezcla ≈ `#183996` | Hover, texto sobre azul suave (franja superior: `--ws-topbar`)        | 10.2:1 sobre blanco, 8.7:1 sobre azul suave |
| `--ws-primary-soft`                    | `primary-soft`   |    mezcla ≈ `#E8EDFB` | Hero, ítem activo, fondos de confirmación             |                                           — |
| `--ws-accent`                          | `accent`         |             `#C2410C` | Ofertas y contador del carrito (texto blanco)         |                            5.2:1 con blanco |
| `--ws-bg`                              | `canvas`         |             `#F3F5F8` | Lienzo plomo de la página                             |                                           — |
| `--ws-surface`                         | `surface`        |             `#FFFFFF` | Tarjetas, formularios, cabecera                       |                                           — |
| `--ws-surface-subtle`                  | `subtle`         |             `#F6F8FA` | Fondo de imagen de producto, filas al pasar el cursor |                                           — |
| `--ws-surface-soft`                    | `soft`           |             `#E9EDF3` | Botones neutros, chips                                |                                           — |
| `--ws-ink`                             | `ink`            |             `#0F172A` | Titulares                                             |                                      17.9:1 |
| `--ws-text`                            | `body`           |             `#1E293B` | Texto principal                                       |                                      14.6:1 |
| `--ws-muted`                           | `muted`          |             `#526075` | Texto secundario                                      |       6.4:1 sobre blanco, 5.9:1 sobre plomo |
| `--ws-border`                          | `line`           |             `#DDE3EC` | Separadores y contornos                               |                                           — |
| `--ws-disabled` / `--ws-disabled-text` | —                | `#E6E9EE` / `#5A6577` | Botones deshabilitados                                |                                       4.8:1 |
| `--ws-footer`                          | `footer`         |             `#0F1B33` | Pie de página                                         |                                           — |
| `--ws-footer-text`                     | `footer-text`    |             `#C5CEDD` | Texto del pie                                         |                         10.8:1 sobre el pie |
| `--ws-danger`                          | `danger`         |             `#B42318` | Errores, eliminar, cancelado                          |          6.6:1 (6.1:1 sobre su fondo suave) |
| `--ws-warning`                         | `warning`        |             `#8A4B08` | Stock bajo                                            |          6.8:1 (6.3:1 sobre su fondo suave) |
| `--ws-dot`                             | —                |             `#B9C8F2` | Indicadores inactivos del carrusel                    |                                           — |

No hay verde: los estados positivos usan el azul (`primary-soft` + `primary-strong`).

### Temas y tokens del tema

Un tema es un nombre y cinco colores: principal, secundario (el acento), fondo principal, fondo secundario (la superficie) y contraste (el texto). El BFF calcula de ellos el mapa completo de **30 tokens** (`TOKENS_DEL_TEMA`); la tienda y el Admin solo lo aplican. Son nuevos respecto a la paleta B original (antes eran un color fijo o reutilizaban `--ws-primary` o `--ws-primary-strong`):

| Token | Uso |
|---|---|
| `--ws-on-primary` | Texto e íconos sobre el principal y el principal fuerte |
| `--ws-on-primary-soft` | Texto sobre el tinte del principal |
| `--ws-on-accent` | Texto sobre el acento |
| `--ws-link` | Enlaces y texto en el color de marca |
| `--ws-focus-ring` | Contorno del foco |
| `--ws-topbar` | Franja superior de la tienda |
| `--ws-on-topbar` | Texto de la franja superior |
| `--ws-footer-heading` | Títulos y enlaces al pasar el cursor en el pie |

La franja superior (`--ws-topbar` y `--ws-on-topbar`) es: en B, `--ws-primary-strong` con `#ffffff`; en A, `#2E1A5C` con `#FFFFFF`; en C, grafito `#1F2328` con `#FFFFFF`; en un tema propio, su `primary-strong` con el más legible entre blanco y el color de contraste.

Quedan **fijos en `tokens.css`**, fuera del mapa, porque no dependen de la paleta: `--ws-danger*`, `--ws-warning*`, `--ws-on-media` (texto y botones sobre fotos y velos) y `--ws-scrim` (velo del cajón de navegación).

**Derivación de un tema propio.** Cada token que no es uno de los cinco colores se calcula con `color-mix(in srgb, <hex> N%, <hex>)` sobre colores literales (P, S, F, Sf y C son el principal, el secundario, el fondo principal, el secundario y el contraste):

- Con texto blanco sobre el principal, `primary-strong` es `color-mix(P 62%, C)`; con el texto en el color de contraste, `color-mix(P 88%, C)`. Si el texto sobre P no llega a 4.5:1 sobre el resultado, `primary-strong` es P.
- `primary-soft` es `color-mix(P 10%, Sf)`; `accent-strong`, `color-mix(S 78%, C)`; `accent-soft`, `color-mix(S 9%, Sf)`.
- `on-primary` y `on-accent` son blanco o C, el que más contraste dé sobre P y sobre S. `on-primary-soft` es `primary-strong` si llega a 4.5:1 sobre el tinte; si no, C.
- `link` y `focus-ring` son P si llega a 4.5:1 y 3:1 sobre F y sobre Sf; si no, C.
- Neutros: `muted` `color-mix(C 68%, Sf)`, `muted-strong` `color-mix(C 82%, Sf)`, `surface-subtle` `color-mix(C 3%, Sf)`, `surface-soft` `color-mix(C 9%, Sf)`, `border` `color-mix(C 14%, Sf)`, `border-strong` `color-mix(C 50%, Sf)`, `disabled` `color-mix(C 10%, Sf)`, `disabled-text` `color-mix(C 68%, Sf)` y `dot` `color-mix(P 30%, Sf)`.
- Pie: `footer` es C, `footer-text` `color-mix(Sf 78%, C)`, `footer-rule` `color-mix(Sf 15%, C)` y `footer-heading` Sf.

**Base neutra.** Si el fondo principal, el fondo secundario y el contraste de un tema propio coinciden con los de un predefinido, sin distinguir mayúsculas, el tema hereda la escala neutra de ese predefinido: `bg`, superficies, `ink`, `text`, `muted` y `muted-strong`, bordes, deshabilitados, `dot` y los cuatro tokens del pie. Así, un tema que solo cambia el principal y el secundario sobre la base de B se ve como antes con esos dos colores. Los tokens de marca (principal, acento y los que se calculan con ellos) se derivan siempre.

**Contraste al guardar.** Hay 15 pares medidos (`PARES_DE_CONTRASTE`). Solo el contraste sobre el fondo principal y sobre el secundario bloquean el guardado de un tema propio; el foco pide 3:1 y el resto 4.5:1, y esos solo avisan.

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
| Foco sobre el fondo / la superficie (mínimo 3) | 6.14 / 6.70 |
| Pie | 10.81 |
| Texto deshabilitado | 4.84 |
| Barra superior (texto sobre la barra) | 10.17 |

**A · Violeta tienda**: principal `#4C2A92`, secundario `#F5A524`, fondo `#F4F4F6`, superficie `#FFFFFF`, contraste `#17151C`.

| Par | Contraste |
|---|---:|
| Texto sobre el fondo / la superficie | 16.47 / 18.10 |
| Texto secundario sobre el fondo / la superficie | 6.30 / 6.92 |
| Texto sobre el principal / el principal fuerte | 10.23 / 14.80 |
| Texto sobre el tinte | 10.95 |
| Texto sobre el acento | 8.40 |
| Enlace sobre el fondo / la superficie | 9.31 / 10.23 |
| Foco sobre el fondo / la superficie (mínimo 3) | 9.31 / 10.23 |
| Pie | 10.78 |
| Texto deshabilitado | 5.09 |
| Barra superior (texto sobre la barra) | 14.80 |

**C · Grafito y ámbar**: principal `#F2B705`, secundario `#1F2328`, fondo `#F2F3F5`, superficie `#FFFFFF`, contraste `#1F2328`. Sobre el principal claro, el texto, el enlace y el foco van en grafito, no en blanco (REQ-17).

| Par | Contraste |
|---|---:|
| Texto sobre el fondo / la superficie | 14.23 / 15.80 |
| Texto secundario sobre el fondo / la superficie | 6.16 / 6.84 |
| Texto sobre el principal / el principal fuerte | 8.69 / 7.02 |
| Texto sobre el tinte | 5.48 |
| Texto sobre el acento | 8.69 |
| Enlace sobre el fondo / la superficie | 14.23 / 15.80 |
| Foco sobre el fondo / la superficie (mínimo 3) | 14.23 / 15.80 |
| Pie | 11.14 |
| Texto deshabilitado | 4.53 |
| Barra superior (texto sobre la barra) | 15.80 |

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

## Forma, ritmo y estados

- Contenido hasta 1280 px con márgenes de 32 px (16 px en móvil); el hero comparte ese ancho.
- Radios: 10 px en botones, 14 px en tarjetas, 20 px en el hero.
- Profundidad: bordes `line` y sombras mínimas; las tarjetas no flotan.
- Foco: contorno sólido de 2 px con `--ws-focus-ring` (en B, el color principal).
- Hover: cambio de borde o color y un desplazamiento máximo de 2 px, solo en dispositivos con cursor.
- `prefers-reduced-motion` desactiva animaciones y el autoplay del carrusel.

## Movimiento

**Criterio del equipo (reunión, notas del 2026-11-11):** la rapidez va antes que el efecto. Daniel advirtió que las animaciones y cargas lentas frustran al cliente, que "quiere comprar rápido", aunque se vean bonitas. Las animaciones deben ser cortas y limpias, y en el camino de compra (agregar al carrito, carrito y checkout) no deben hacer esperar.

- Hero: transición cruzada de 480 ms y texto escalonado. Como en la propuesta B, lleva dos botones (principal y "Ver todos los productos" en blanco) y debajo los puntos: la píldora activa se llena en 8 s y los inactivos son puntos de 6 px, con área táctil de 44 px. Junto a ellos va el botón de pausa (necesario por el avance automático). El número de diapositiva se anuncia solo a lectores de pantalla.
- Mega-menú, drawer y filtros: entradas cortas (180–260 ms) sin animar el resto de la página.
- Aparición al hacer scroll (`RevealDirective`, `[wsReveal]`): categorías, destacados, colecciones, campañas y beneficios entran con un desplazamiento de 24 px hacia arriba (40 px en horizontal) y opacidad, en 560–680 ms, escalonados 80 ms por elemento (máximo 320 ms).
  - Lo que ya está en pantalla al cargar no se anima.
  - Sin JavaScript, con `prefers-reduced-motion` o sin `IntersectionObserver`, el contenido se ve directamente.
  - Lo que queda arriba por un salto (scroll rápido, ancla, volver atrás) se revela igual.
- Colecciones alternadas: la primera muestra el texto a la izquierda y los productos a la derecha; la siguiente invierte el orden y usa el fondo `subtle`. El texto entra desde su lado y los productos desde el contrario. En móvil (≤900 px) siempre va primero el texto.

## Alineación con la propuesta B

Se tomaron de la propuesta: los dos botones y los puntos del hero, el buscador plano sobre plomo, la línea "Marca · SKU" en las fichas y un ritmo de secciones más compacto (48–72 px).

En Destacados se volvió a las pestañas subrayadas del inicio anterior: la pestaña activa va en negrita con una línea azul de 2 px sobre una línea fina a todo el ancho. Cada pestaña mide 48 px de alto, en celular se deslizan en horizontal y reservan el ancho de la negrita para no moverse al elegir una. El subtítulo es "Tecnología elegida por su diseño y desempeño, con precios que ya incluyen IGV."

Se mantuvieron de la tienda actual, por ser mejores para el comprador: la cantidad de productos en cada categoría, la descripción corta en la ficha, las etiquetas de texto en las acciones de la cabecera, las colecciones alternadas y la aparición al hacer scroll.

La versión anterior a esta alineación sigue disponible en `/inicio-anterior` para compararlas.

## Admin

- La barra lateral es clara (superficie blanca y borde) y está agrupada en General, Catálogo, Ventas, Tienda y Accesos. Solo muestra los módulos que el rol puede abrir.
- La cabecera muestra el nombre del usuario y el nombre del rol en español.
- Tablas con encabezado `subtle`, filas con borde `line` y la fila seleccionada en `primary-soft`.
- Los mensajes de error del BFF (por ejemplo, "Debe quedar al menos un superadministrador activo") se muestran tal cual en el aviso del panel.

## Recursos

Las fotografías de producto y del hero son imágenes propias generadas para un catálogo ficticio, sin marcas ni textos (prompts en `frontend/docs/IMAGE-PROMPTS.md`). No se usan activos, campañas ni textos de LG.

## Verificación

- `npm run build:all`, `npm run validate:contract` (estructura, pruebas unitarias y smoke del BFF) y `npm run format:check` en verde.
- Revisado en el navegador: inicio, catálogo, carrito, checkout y Admin en escritorio, y la tienda a 375 px, sin desbordes horizontales.
- Compra completa como invitado sobre una copia de los datos: pedido, consulta con token y cancelación.
