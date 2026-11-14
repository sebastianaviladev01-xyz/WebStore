# 0014. Dar al tema un token para el texto sobre el enlace

- Estado: Aceptada
- Fecha: 2026-11-13

## Contexto

### Por qué había que decidir

Con el tema C, la casilla marcada del Admin es un cuadrado grafito sin marca visible (1:1, PBI-0049). [`tokens.css`](../../frontend/src/styles/tokens.css) da a Material el enlace como `--mat-sys-primary` (porque Material también pinta texto con él) y el texto sobre el principal como `--mat-sys-on-primary`: la marca se pinta con el texto de un color sobre otro color. Con C, `--ws-link` y `--ws-on-primary` valen el mismo `#1F2328`. Corregirlo en todos los temas, también en los propios, cambia el mapa de tokens que calcula el BFF y que leen los dos frontends ([ADR-0011](0011-guardar-los-temas-como-recurso-propio-del-bff.md)), como ya lo amplió [ADR-0013](0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md).

### Opciones

Cómo se corrige la marca de las casillas (D2 de la [especificación](../specs/features/005-contraste-de-controles-con-los-temas/specification.md#decisiones-del-hito-de-alcance)):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Un token del tema con el texto sobre el enlace, calculado por el BFF (elegida)** | `--ws-on-link` en el mapa de cada tema y `--mat-sys-on-primary: var(--ws-on-link)` | Material pinta su `on-primary` sobre su `primary` con un par medido. Cubre los temas propios y cualquier componente de Material que pinte sobre el principal. Con A y B no cambia nada | El mapa crece a 32 tokens y las dos copias de las reglas cambian |
| Tokens propios de la casilla con el principal | `--mat-checkbox-selected-*` con el principal y su texto, como el botón relleno de la feature 004 | No toca el BFF | Con C, el relleno amarillo contra la tarjeta blanca da 1.82:1, por debajo del 3:1 de REQ-03. Cada componente nuevo de Material necesitaría su propio arreglo |
| Relleno grafito solo con C | Lo mismo, con una excepción para C | Arregla C | Es un caso especial: no cubre los temas propios |

Entre qué colores elige el BFF el texto sobre el enlace ([pregunta 2 del plan](../specs/features/005-contraste-de-controles-con-los-temas/planning.md#pregunta-2-entre-qué-colores-elige-el-bff-el-texto-sobre-el-enlace)):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Entre el blanco, el contraste y la superficie (elegida)** | `textoMasLegible(enlace, [BLANCO, C, Sf])`, con el enlace ya calculado | En A, B, C y todo tema claro da el blanco, como el texto sobre el principal. En un tema oscuro, la superficie oscura se lee sobre un enlace claro: el caso «base oscura» de `casos-tema.json` pasa de 3.68:1 a 4.54:1 (`#1B1E25`), y un tema oscuro de principal oscuro, de 1.09:1 a 15.31:1 | Se aparta del cálculo de `--ws-on-primary`: dos tokens hermanos con reglas distintas |
| Entre el blanco y el contraste, como `--ws-on-primary` | Lo que decía la especificación al pie de la letra | Una sola regla para los dos textos sobre la marca | En un tema oscuro, el contraste también es claro: la marca puede quedar a 1.09:1 y REQ-04 no se cumple. Solo lo avisaría el par nuevo |

Qué mínimo pide el par nuevo ([pregunta 3 del plan](../specs/features/005-contraste-de-controles-con-los-temas/planning.md#pregunta-3-qué-mínimo-pide-el-par-nuevo)):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **4.5:1, como texto (elegida)** | `onLink/link` con el mínimo de texto, como los demás pares `on*` | Material pinta texto con `on-primary` (etiqueta del botón relleno por defecto, deslizador, selector de fecha, pasos): el aviso salta también para ellos | Más avisos posibles en temas propios |
| 3:1, como marca de un control (WCAG 1.4.11) | El mínimo justo para la casilla, lo único que hoy lo usa | Menos avisos | Un componente que pinte texto con `on-primary` a 3.5:1 no avisaría |

Qué pasa con el botón relleno de la feature 004 ([pregunta 4 del plan](../specs/features/005-contraste-de-controles-con-los-temas/planning.md#pregunta-4-qué-se-hace-con-los-tokens-del-botón-relleno-de-la-feature-004)), que Material pinta también con `on-primary` en su capa de estado:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Mantener sus dos tokens y fijar también la capa de estado (elegida)** | Siguen el contenedor en `--ws-primary` y la etiqueta en `--ws-on-primary`, y se suma `--mat-button-filled-state-layer-color: var(--ws-on-primary)` | El botón relleno es el principal, no el enlace: «Ver carrito» se ve igual con los tres temas, también al pasar el puntero y con el foco | Un token más que mantener en `tokens.css` |
| Mantener solo los dos de hoy | Sin tocar el botón | Nada que añadir | Con C, el velo del 8 % al pasar el puntero o enfocar pasa de grafito a blanco sobre el ámbar: un cambio que nadie pidió (AC-07) |
| Quitarlos | El botón relleno toma el enlace y su texto | `tokens.css` más simple | Con C, «Ver carrito» pasa de ámbar a grafito: cambio visual no pedido (STD-12) |

Dónde va el token y cómo lo fijan A, B y C (decisiones acordadas del [plan](../specs/features/005-contraste-de-controles-con-los-temas/planning.md#decisiones)):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Justo después de `--ws-link`, literal en B y derivado en A y C (elegida)** | El token va en el grupo de marca, junto a su fondo. B, que es un mapa literal, lo escribe como `#ffffff`; A y C lo toman de `tokensDelTema` | Queda fuera de la escala neutra en las dos copias de las reglas sin tocar el `slice` de la réplica del Admin. A y C dan `#FFFFFF` sin literal: C ya fija el enlace con el mismo grafito que deriva | Si alguien cambia el literal del enlace de C, el texto derivado no lo sigue (lo cubre TEST-02, que mide el par con el mapa literal) |
| Al final de `TOKENS_DEL_TEMA` | El token nuevo cierra el mapa | Agrupa lo nuevo | La réplica del Admin toma la escala neutra con un `slice` desde `--ws-bg`: un tema propio con la base de un predefinido heredaría su texto sobre el enlace en la vista previa |

## Decisión

Añadiremos al mapa del tema un token para el texto y las marcas sobre el color de los enlaces, `--ws-on-link`, que calcula el BFF, y Material pintará su `on-primary` con él. Amplía el cálculo de tokens de ADR-0011, que sigue vigente, como ya hizo ADR-0013:

- `TOKENS_DEL_TEMA` pasa de 31 a 32 nombres, con `--ws-on-link` justo después de `--ws-link` y antes de `--ws-focus-ring`. Es un token de marca: no entra en la escala neutra y no se hereda de un predefinido.
- `tokensDeMarca` lo calcula con `textoMasLegible(enlace, [BLANCO, C, Sf])`, sobre el enlace ya calculado (`P` si se lee sobre los dos fondos; si no, `C`). Se aparta a propósito del cálculo de `--ws-on-primary`, que solo elige entre el blanco y el contraste: en un tema propio oscuro el contraste también es claro, y solo la superficie se lee sobre un enlace claro. En A, B, C y los temas claros da lo mismo que esa regla: el blanco.
- A y C lo derivan (`#FFFFFF`); B, que es un mapa literal, lo fija con `#ffffff`, en minúsculas como el resto de su mapa.
- `PARES_DE_CONTRASTE` pasa de 20 a 21 con `onLink/link` al final: primer plano `--ws-on-link`, fondo `--ws-link`, mínimo 4.5:1 y `bloquea: false`. Mide 10.23, 6.70 y 15.80 en A, B y C. `INSUFFICIENT_THEME_CONTRAST` sigue bloqueando solo por `contrast/background` y `contrast/surface`; el diálogo de Temas lo muestra como aviso.
- `tokens.css`, el respaldo que cargan las dos aplicaciones, declara `--ws-on-link: #ffffff` (el valor de B) y cambia `--mat-sys-on-primary: var(--ws-on-primary)` por `var(--ws-on-link)`. Se mantienen `--mat-button-filled-container-color: var(--ws-primary)` y `--mat-button-filled-label-text-color: var(--ws-on-primary)` de la feature 004, y se suma `--mat-button-filled-state-layer-color: var(--ws-on-primary)`.
- El contrato solo crece: una clave más en `Tema.tokens` y una declaración más en `theme.css`. No hay migración ni datos nuevos ni cambio de `schemaVersion`, porque los tokens se calculan al leer.

*Motivo:* es la única opción que hace legible la marca de la casilla en A, B, C y en los temas propios, también los oscuros, con el contraste medido por el BFF, que sigue siendo la autoridad de ADR-0011, y sin cambiar nada de lo que hoy se ve bien.

Las elecciones son las de Sebastián Avila del 2026-11-13: D2 en el [hito de alcance](../specs/features/005-contraste-de-controles-con-los-temas/specification.md#decisiones-del-hito-de-alcance) y las preguntas 2 a 4 en el [hito de arquitectura](../specs/features/005-contraste-de-controles-con-los-temas/planning.md#respuestas-del-hito), todas con la alternativa A. La posición del token y los valores de A, B y C son decisiones acordadas del mismo plan.

## Consecuencias

**Lo que se vuelve más fácil:**

- Cualquier componente de Material que pinte sobre su `primary` (casilla, interruptor, deslizador, selector de fecha, pasos) usa un par medido en cada tema, sin un arreglo por componente.
- El par `onLink/link` avisa en el diálogo de Temas si un tema propio no llega a 4.5:1.
- Un cliente del contrato que ignore la clave nueva sigue funcionando: no es un cambio incompatible.

**Lo que se vuelve más difícil:**

- Hay dos textos sobre la marca con reglas distintas: `--ws-on-primary` elige entre el blanco y el contraste, y `--ws-on-link` también considera la superficie. Quien toque una no debe copiarla en la otra sin leer este ADR.
- `--mat-sys-on-primary` ya no es el texto sobre el principal. Los componentes de Material que sí pintan sobre el principal (el botón relleno) necesitan sus tokens propios en `tokens.css`, como hace hoy el botón relleno, con su capa de estado.
- El token y el par existen dos veces, en el BFF y en la réplica del Admin. Los comprueba el mismo archivo de casos (`casos-tema.json`); si discrepan, manda el BFF. La posición importa por el `slice` de la réplica, como con ADR-0013.
- Los temas propios ya guardados ganan el token y el par al leer. En uno oscuro, el diálogo de Temas puede mostrar un aviso nuevo, que no impide guardar ni activar.
- El `ETag` de `theme.css` cambia para todos con el despliegue: la primera carga descarga la hoja otra vez ([ADR-0010](0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md)).

> Nota de la implementación (2026-11-14, feature 005, [verificación](../specs/features/005-contraste-de-controles-con-los-temas/verification.md#ejecución-por-tarea)): con las reglas actuales, el aviso de `onLink/link` no llega a salir. El par no baja de 4.5:1 en ningún tema válido:
> - si el enlace es el principal, es porque se lee sobre la superficie, que es candidata del cálculo;
> - si es el color de contraste, la superficie se lee sobre él por el par `contrast/surface`, que bloquea por debajo de 4.5:1.
>
> Por eso, un tema propio oscuro ya guardado no muestra un aviso nuevo. El par es una red de seguridad: avisaría si un cambio futuro en el cálculo o en los pares que bloquean lo dejara por debajo del mínimo. La rejilla de 32 temas válidos de TEST-03 lo comprueba.

**Fuera de alcance:**

- Cambiar el cálculo de `--ws-on-primary`, que tiene el mismo límite en los temas oscuros y ya lo avisa el par `onPrimary/primary`. Hacerlo cambiaría el aspecto de temas propios oscuros sin que nadie lo pida (REQ-06); necesitaría su propia decisión.
- La opción seleccionada de las listas desplegables, que Material pinta con `secondary-container` sin los colores del tema ([PBI-0053](../planning/backlog.md)).
- La regla `a` de la tienda en `@layer base` (D1 de la feature 005): aplica la convención que `styles.css` ya sigue con los márgenes y no necesita ADR.

## Referencias

- [Especificación de la feature 005: D2, REQ-03 a REQ-06 y AC-03 a AC-07](../specs/features/005-contraste-de-controles-con-los-temas/specification.md)
- [Plan de la feature 005: enfoque, componentes de Material, tipos y nombres, riesgos y respuestas del hito](../specs/features/005-contraste-de-controles-con-los-temas/planning.md)
- [ADR-0011](0011-guardar-los-temas-como-recurso-propio-del-bff.md) y [ADR-0013](0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md)
- [WCAG 2.1 — Non-text Contrast (1.4.11)](https://www.w3.org/TR/WCAG21/#non-text-contrast) y [Contrast (Minimum) (1.4.3)](https://www.w3.org/TR/WCAG21/#contrast-minimum)
