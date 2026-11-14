# 005. Contraste de controles con los temas — Plan

- Feature: `005-contraste-de-controles-con-los-temas`
- Especificación: [specification.md](specification.md) (aprobada el 2026-11-13; 6 REQ, 7 AC, decisiones D1 y D2)
- Estado: aprobado
- Fecha: 2026-11-13
- Hito de arquitectura: aprobado por Sebastián Avila el 2026-11-13. Respondió las [cuatro preguntas](#hito-de-arquitectura) con la alternativa A en las cuatro, sin ajustes ([respuestas](#respuestas-del-hito)), desde su sesión principal

## Enfoque

Dos cambios pequeños, cada uno en su sitio:

1. **Tienda: la regla `a` pasa a la capa base (D1).** `a { color: inherit; text-decoration: none; }` de [`frontend/src/styles.css`](../../../../frontend/src/styles.css) se mueve dentro de `@layer base`, como ya se hizo con los márgenes de títulos y párrafos en ese mismo archivo. Las utilidades de Tailwind (capa `utilities`) vuelven a aplicarse a los enlaces. Las clases propias (`ws-*`) de `styles.css`, `storefront.css` y `home.css` no están en ninguna capa, así que siguen ganando igual que hoy. El Admin no tiene esa regla ni carga ese archivo: no cambia.
   - Al revisar el código hay **diez** enlaces de la tienda con utilidades que hoy no se aplican, no seis: los seis de AC-01 y AC-02 y cuatro más ([enlaces afectados](#enlaces-afectados-por-d1)). Por la [pregunta 1](#pregunta-1-qué-se-hace-con-los-cuatro-enlaces-que-d1-cambia-y-ac-02-no-lista), esos cuatro forman parte de D1: los diez muestran lo que declaran y ninguna plantilla cambia.
2. **Tema: un token nuevo, `--ws-on-link` (D2).** El texto más legible sobre `--ws-link`, calculado por el BFF en `tokensDeMarca` ([`tema.rules.mjs`](../../../../backend/src/domain/temas/tema.rules.mjs)) y replicado en el Admin. `TOKENS_DEL_TEMA` pasa de 31 a 32, con el token justo después de `--ws-link`. `PARES_DE_CONTRASTE` pasa de 20 a 21 con `onLink/link`, que solo avisa. [`tokens.css`](../../../../frontend/src/styles/tokens.css) lo declara con el valor de B (`#ffffff`) y cambia `--mat-sys-on-primary: var(--ws-on-primary)` por `var(--ws-on-link)`. Así Material pinta su `on-primary` sobre su `primary` con un par que sí se lee: hoy pinta el texto del principal sobre el color del enlace.
   - Con A y B no cambia nada: el enlace es el principal y el texto sobre él ya es blanco (10.23:1 y 6.70:1).
   - Con C, la casilla marcada pasa de un cuadrado grafito sin marca (1:1) a grafito con la marca blanca (15.80:1, y 15.80:1 contra la tarjeta).
   - El contrato solo crece: una clave más en `tokens` y una línea más en `theme.css`. No hay migración: los tokens se calculan al leer.

El cambio de `--mat-sys-on-primary` también afecta a la capa de estado del botón relleno (`--mat-button-filled-state-layer-color`), que Material pinta con `on-primary` al pasar el puntero o enfocar «Ver carrito». Por la [pregunta 4](#pregunta-4-qué-se-hace-con-los-tokens-del-botón-relleno-de-la-feature-004), `tokens.css` la fija en `--ws-on-primary`, junto a los dos tokens del botón relleno de la feature 004, que se mantienen: el botón se ve igual con los tres temas.

Alternativas descartadas en el hito de alcance: corregir solo «Ver todos los productos» con una regla más específica (D1 B), tokens propios de la casilla con el principal (D2 B, 1.82:1 contra la tarjeta con C) y un relleno grafito solo con C (D2 C).

## Responsabilidades por capa

Nombres según [`frontend/architecture.md` §4](../../../../frontend/architecture.md#4-componentes-y-convenciones) y [`backend/architecture.md` §2](../../../../backend/architecture.md#2-convenciones).

| Capa | Elemento | Responsabilidad | REQ |
|---|---|---|---|
| BFF: `domain/temas/` | `tema.rules.mjs` | `TOKENS_DEL_TEMA` con `--ws-on-link` justo después de `--ws-link` (32). `tokensDeMarca` lo calcula con `textoMasLegible(enlace, [BLANCO, C, Sf])` sobre el enlace ya calculado ([pregunta 2](#pregunta-2-entre-qué-colores-elige-el-bff-el-texto-sobre-el-enlace)). Es un token de marca: no entra en `ESCALA_NEUTRA` y no se hereda de un predefinido. `PARES_DE_CONTRASTE` con `onLink/link` al final (21), con mínimo 4.5 ([pregunta 3](#pregunta-3-qué-mínimo-pide-el-par-nuevo)) y sin bloquear | REQ-03, REQ-04, REQ-05 |
| BFF: `domain/temas/` | `temas-predefinidos.mjs` | B, que es un mapa literal, gana `'--ws-on-link': '#ffffff'`, en minúsculas como el resto de su mapa. A y C lo toman de `tokensDelTema` (sale `#FFFFFF` en los dos) y no necesitan literal: C fija `--ws-link` con el mismo grafito que ya deriva | REQ-03 |
| BFF: `domain/temas/` | `tema-propio.rules.mjs` | Sin cambios: solo bloquean `contrast/background` y `contrast/surface` | REQ-04 |
| BFF: `application/temas/` | `temas.queries.mjs` | Sin cambios de código: `theme.css` y los `tokens` de cada `Tema` recorren `TOKENS_DEL_TEMA` y ganan la línea nueva solos. El `ETag` cambia con el cuerpo | REQ-03 |
| BFF: `api/` e `infrastructure/` | Rutas, persistencia y migración | Sin cambios. `schemaVersion` sigue igual | — |
| Admin: `features/temas/domain/` | `tema.model.ts` | `NombreToken` con `'--ws-on-link'`; `ParContraste['par']` con `'onLink/link'` | REQ-03, REQ-04 |
| Admin: `features/temas/domain/` | `tema.rules.ts` | Réplica del BFF: `TOKENS_DEL_TEMA`, `tokensDeMarca` y `PARES_DE_CONTRASTE`. Su `ESCALA_NEUTRA` (un `slice` desde `--ws-bg`) sigue excluyendo el token, porque va antes | REQ-03, REQ-04 |
| Admin: `features/temas/presentation/` | `TemaDialog` (`tema.dialog.ts`) | `NOMBRE_DEL_PAR` con `'onLink/link': 'Texto y marcas sobre el color de los enlaces'`. Aparece como aviso, igual que los demás pares que no bloquean | REQ-04 |
| Admin: `features/temas/presentation/` | `VistaPreviaTemaComponent` | Sin cambios: escribe en su elemento todos los tokens que recibe y no tiene controles de Material | — |
| Admin: páginas con casillas | `banners`, `contenido`, `marcas`, `productos` y `usuarios` | Sin cambios de código: la casilla toma `--mat-sys-on-primary` de `tokens.css` | REQ-03 |
| Compartido | `frontend/src/styles/tokens.css` | `--ws-on-link: #ffffff` en `:root`, justo después de `--ws-link`, igual al mapa de B (TEST-18 (a) de `validate-structure`). `--mat-sys-on-primary: var(--ws-on-link)`. Se mantienen `--mat-button-filled-container-color` y `--mat-button-filled-label-text-color`, y se suma `--mat-button-filled-state-layer-color: var(--ws-on-primary)`, con el comentario actualizado ([pregunta 4](#pregunta-4-qué-se-hace-con-los-tokens-del-botón-relleno-de-la-feature-004)). Sin clase de Tailwind nueva: ninguna plantilla la necesita | REQ-03, REQ-05 |
| Storefront: `features/temas/domain/` | `tema.model.ts` | `NombreToken` con `'--ws-on-link'`. Solo un tipo: ninguna regla cambia | REQ-03 |
| Storefront: `features/temas/application/` | `TemasFacade` | Sin cambios: ya escribe en `:root` todos los tokens que llegan | — |
| Storefront: estilos | `src/styles.css` | La regla `a` dentro de `@layer base`, junto a la de márgenes, con un comentario que diga por qué. Sin otros cambios | REQ-01, REQ-02 |
| Storefront: plantillas | `app.layout.ts`, `login.page.ts`, `detalle-pedido.page.ts`, `carrito.page.ts` y `pedidos.page.ts` | Sin cambios: los diez enlaces conservan sus utilidades ([pregunta 1](#pregunta-1-qué-se-hace-con-los-cuatro-enlaces-que-d1-cambia-y-ac-02-no-lista)) | REQ-02, REQ-06 |

### Dependencias entre features

Ninguna. Cada cambio queda dentro de su feature o en los estilos ([`sheriff.config.ts`](../../../../frontend/sheriff.config.ts)).

### Enlaces afectados por D1

Recuento con todas las etiquetas `<a>` de `frontend/src/app` y sus clases. Los demás enlaces no llevan utilidades de color ni de subrayado, o llevan una clase `ws-*` que ya gana fuera de capa: no cambian.

Los cuatro que AC-02 no lista (7 a 10) forman parte de D1 desde el hito de arquitectura ([pregunta 1](#pregunta-1-qué-se-hace-con-los-cuatro-enlaces-que-d1-cambia-y-ac-02-no-lista)): cambian como dice la tabla, TEST-09 los mide y la especificación recibe una nota fechada en AC-02 y AC-07 (T6).

| # | Enlace | Archivo | Utilidades que hoy no se aplican | Cambio con D1 | En AC-02 |
|---|---|---|---|---|---|
| 1 | «Ver todos los productos» del cajón móvil | [`app.layout.ts:248`](../../../../frontend/src/app/layout/app.layout.ts) | `text-on-primary` | Texto `--ws-on-primary` sobre el principal (AC-01) | AC-01 |
| 2 | «Ver toda la categoría» del cajón | [`app.layout.ts:266`](../../../../frontend/src/app/layout/app.layout.ts) | `text-link` | Color del enlace | Sí |
| 3 | Subcategorías del cajón | [`app.layout.ts:275`](../../../../frontend/src/app/layout/app.layout.ts) | `text-muted` | Texto secundario | Sí |
| 4 | «Crear cuenta» | [`login.page.ts:36`](../../../../frontend/src/app/features/cuenta/presentation/login.page.ts) | `text-link` | Color del enlace | Sí |
| 5 | «Mis pedidos», vuelta del detalle | [`detalle-pedido.page.ts:25`](../../../../frontend/src/app/features/pedidos/presentation/detalle-pedido.page.ts) | `text-muted hover:text-ink` | Secundario; tinta al pasar el puntero | Sí |
| 6 | Nombre del producto en el carrito | [`carrito.page.ts:37`](../../../../frontend/src/app/features/carrito/presentation/carrito.page.ts) | `hover:text-link` | Color del enlace al pasar el puntero | Sí |
| 7 | Correo de contacto del pie | [`app.layout.ts:345`](../../../../frontend/src/app/layout/app.layout.ts) | `hover:text-footer-heading` | Color de los títulos del pie al pasar el puntero (blanco con B) | **No** |
| 8 | «Inicia sesión» de `/pedidos` sin sesión | [`pedidos.page.ts:20`](../../../../frontend/src/app/features/pedidos/presentation/pedidos.page.ts) | `underline underline-offset-4` | Subrayado siempre visible | **No** |
| 9 | «Ayuda» de la franja superior (desde 640 px) | [`app.layout.ts:33`](../../../../frontend/src/app/layout/app.layout.ts) | `hover:underline` | Subrayado al pasar el puntero | **No** |
| 10 | «Seguimiento de pedidos» de la franja superior (solo `/inicio-anterior`) | [`app.layout.ts:30`](../../../../frontend/src/app/layout/app.layout.ts) | `hover:underline` | Subrayado al pasar el puntero | **No** |

Lo que no cambia, comprobado en el código:

- Los enlaces con clases `ws-*` (`ws-text-link`, `ws-btn-*`, `ws-header-action`, `ws-footer-links a`, `ws-shortcuts a`, `ws-mega-*`, etc.): sus reglas no están en capa y siguen ganando a la capa base y a las utilidades, como hoy. Ninguno lleva además una utilidad de color.
- Los enlaces sin utilidades, como «Olvidé mi contraseña» o los del pie: siguen heredando el color, ahora desde la capa base. Tailwind ya declara `a { color: inherit; text-decoration: inherit; }` en su capa base. La regla movida va después en esa misma capa y conserva `text-decoration: none`.
- Ninguna regla de `storefront.css` o `home.css` cambia de comportamiento: ninguna está en capa y ninguna depende de que la regla `a` gane a una utilidad.
- No hay contenido con HTML del CMS (`innerHTML`) ni botones de Material sobre `<a>` en la tienda.
- `a:focus-visible` de `styles.css` sigue fuera de capa: el contorno de foco no cambia.

### Componentes de Material y lo que pintan sobre el principal

Medido en Angular Material 22.2.4 (`fesm2022`). El tema base es `azure-blue.css`, que declara los `--mat-sys-*` en `html`. `tokens.css` los redefine en `:root`, que gana por especificidad.

| Componente (dónde se usa) | Qué pinta | Tokens de sistema | ¿Cambia con D2? |
|---|---|---|---|
| Casilla (Admin: `banners`, `contenido`, `marcas`, `productos` y `usuarios`) | Marca sobre el relleno | `selected-checkmark-color` = `on-primary`; `selected-icon-color` = `primary` | Sí: la marca pasa a `--ws-on-link` |
| Botón de opción (checkout) | Anillo y punto sobre la superficie | `primary` | No: no usa `on-primary` |
| Botón relleno (diálogo «Producto agregado») | Etiqueta sobre el contenedor; capa de estado al pasar el puntero o enfocar | Contenedor y etiqueta fijados por la 004 a `--ws-primary` y `--ws-on-primary`; `state-layer-color` = `on-primary` | No: la capa de estado se fija en `--ws-on-primary` ([pregunta 4](#pregunta-4-qué-se-hace-con-los-tokens-del-botón-relleno-de-la-feature-004)) |
| Etiqueta enfocada de un campo (los dos) | Texto sobre la superficie | `primary` | No |
| Opción seleccionada de una lista desplegable (los dos) | Texto sobre el fondo de la opción; la marca mínima en `primary` | `on-secondary-container` sobre `secondary-container` | No. Esos dos tokens no están en `tokens.css` y salen de `azure-blue.css` con todos los temas ([hallazgo](#hallazgos-fuera-de-alcance)) |
| Menú (Admin: menú de usuario; tienda: selector de tema y menú de la tarjeta) | Texto sobre el panel | `--mat-menu-*` fijados a `--ws-surface` y `--ws-ink` en los estilos de cada aplicación | No |

Usan `on-primary` también el paso del `stepper`, el interruptor, el deslizador, el selector de fecha y la casilla de las listas y de la selección múltiple. Ninguno se usa hoy: quedan cubiertos por el token, sin medir, como dice la especificación.

## Contrato del BFF afectado

Las rutas, los códigos de error y los permisos no cambian. El contenido crece, sin cambios incompatibles ([contrato](../../../../backend/docs/BFF-CONTRACT.md)):

| Método | Ruta | Petición | Respuestas | Errores (`code`) | Roles |
|---|---|---|---|---|---|
| `GET` | `/bff/appearance` | Sin cambios | Cada `Tema` trae `tokens['--ws-on-link']`, justo después de `'--ws-link'`: `#FFFFFF` en A y C, `#ffffff` en B y el valor calculado en un tema propio | Sin cambios | Público |
| `GET` | `/bff/appearance/theme.css` | Sin cambios | El bloque `:root:root` tiene 32 declaraciones, con `--ws-on-link` justo después de `--ws-link`. El `ETag` cambia porque cambia el cuerpo | Sin cambios | Público |
| `GET` | `/bff/admin/themes` | Sin cambios | Igual que `/bff/appearance`: un token más en cada `Tema` | Sin cambios | `themes.manage` |
| `POST` y `PUT` | `/bff/admin/themes`, `/bff/admin/themes/:id` | Sin cambios: siguen los cinco colores | `INSUFFICIENT_THEME_CONTRAST` sigue listando solo `contrast/background` y `contrast/surface`. El par nuevo no bloquea | Sin cambios | `themes.manage` |

Compatibilidad: un cliente que ignore la clave nueva sigue funcionando. No es un [disparador de revisión adicional](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional).

## Estado del BFF

| Colección o campo | Regla | Migración (`schemaVersion`) | REQ/ADR |
|---|---|---|---|
| `appearance.customThemes` | No cambian: el token se calcula al leer, desde los cinco colores | No | REQ-04, ADR nuevo |
| `appearance.activeThemeId` y `revision` | No cambian | No | — |

## Tipos intermedios y nombres

Términos del [glosario](../../../architecture/glosario.md): «Tema», «Tema predefinido» y «Tema propio». El token nuevo no es un término de negocio: no entra en el glosario.

| Tipo o nombre | Definición | Tareas que lo usan |
|---|---|---|
| `--ws-on-link` | Token del texto y las marcas sobre el color de los enlaces. En `TOKENS_DEL_TEMA`, justo después de `--ws-link` y antes de `--ws-focus-ring`. Fuera de `ESCALA_NEUTRA` en las dos copias de las reglas | T1, T2, T3 |
| Cálculo de `--ws-on-link` | `textoMasLegible(enlace, [BLANCO, C, Sf])`, con el enlace ya calculado (`P` o `C`), el contraste y la superficie del tema ([pregunta 2](#pregunta-2-entre-qué-colores-elige-el-bff-el-texto-sobre-el-enlace)). Distinto de `--ws-on-primary`, que solo elige entre `BLANCO` y `C` | T1, T2 |
| Valores de `--ws-on-link` en A, B y C | A `#FFFFFF` (derivado), B `#ffffff` (literal) y C `#FFFFFF` (derivado) | T1, T3 |
| `onLink/link` | Par nuevo, el último de `PARES_DE_CONTRASTE` (21): primer plano `--ws-on-link`, fondo `--ws-link`, mínimo 4.5 (`TEXTO_MINIMO`, [pregunta 3](#pregunta-3-qué-mínimo-pide-el-par-nuevo)), `bloquea: false`. En A, B y C mide 10.23, 6.70 y 15.80 | T1, T2 |
| Nombre del par en `NOMBRE_DEL_PAR` | «Texto y marcas sobre el color de los enlaces» | T2 |
| [`casos-tema.json`](../../../../backend/tests/unit/domain/temas/casos-tema.json) | `predefinidos[].tokens` y `tokensDelTema[].tokens` con la clave nueva; `paresPredefinidos` y `tokensDelTema[].pares` con el par nuevo. El caso «base oscura sin predefinido» espera `'--ws-on-link': '#1B1E25'`, su superficie (4.54:1 sobre el enlace `#3B82F6`); los demás casos, `'#FFFFFF'` | T1, T2 |
| `relacionDeContraste` de las e2e | Ayuda nueva en `tests/e2e/apoyo/contraste.ts`: relación WCAG entre dos colores `rgb()` calculados por el navegador. Las e2e no importan código del BFF | T4, T5 |
| `COLORES_SOBRE_EL_ENLACE` | Constante de las e2e del Admin con lo esperado por tema: `{ a: { marca: 'rgb(255, 255, 255)', relleno: 'rgb(76, 42, 146)' }, b: { …, relleno: 'rgb(29, 78, 216)' }, c: { …, relleno: 'rgb(31, 35, 40)' } }` | T5 |

## Dependencias y riesgos

| Riesgo o dependencia | Impacto | Mitigación |
|---|---|---|
| D1 cambia cuatro enlaces más de los que lista AC-02 ([tabla](#enlaces-afectados-por-d1)) | Cambios visuales que AC-07 no preveía | **Resuelto en el hito** ([pregunta 1](#pregunta-1-qué-se-hace-con-los-cuatro-enlaces-que-d1-cambia-y-ac-02-no-lista)): forman parte de D1. La especificación recibe una nota fechada en AC-02 y AC-07 (T6), TEST-09 los mide y la tabla de capturas los lista |
| `--mat-sys-on-primary` lo usa también la capa de estado del botón relleno | Con C, al pasar el puntero o enfocar «Ver carrito», el velo de 8 % pasa de grafito a blanco sobre el ámbar | **Resuelto en el hito** ([pregunta 4](#pregunta-4-qué-se-hace-con-los-tokens-del-botón-relleno-de-la-feature-004)): `--mat-button-filled-state-layer-color: var(--ws-on-primary)`. TEST-12 mide la capa de estado y las capturas de T3 comprueban «Ver carrito» al pasar el puntero |
| Un tema propio oscuro: el enlace es claro y el blanco no se lee sobre él | Con `[BLANCO, C]`, la marca de la casilla queda a 3.68:1 en el caso «base oscura» de `casos-tema.json` y a 1.09:1 si el principal es oscuro (el enlace pasa al contraste, casi blanco): REQ-04 fallaría en temas oscuros | **Resuelto en el hito** ([pregunta 2](#pregunta-2-entre-qué-colores-elige-el-bff-el-texto-sobre-el-enlace)): la superficie es candidata. Con ella, 4.54:1 y 15.31:1, y A, B, C y los temas claros no cambian. El par `onLink/link` avisa si un tema no llega a 4.5:1 |
| La réplica del Admin calcula `ESCALA_NEUTRA` con un `slice` desde `--ws-bg` | Si el token fuera después de `--ws-bg`, un tema propio con la base de un predefinido heredaría su texto sobre el enlace, solo en el Admin | El token va justo después de `--ws-link`, en el grupo de marca. TEST-06 compara las dos copias con `casos-tema.json` |
| C fija `--ws-link` con un literal y deriva `--ws-on-link` | Si alguien cambia el literal del enlace de C, el texto sobre él no lo sigue | TEST-02 mide `onLink/link` en A, B y C con el mapa literal de cada uno, no con el derivado |
| Temas propios ya guardados | Ganan el token y el par al leer. En un tema claro, el valor es el blanco y el par llega. En uno oscuro, el diálogo de Temas puede mostrar un aviso nuevo, que no impide guardar ni activar | Sin migración (los tokens se calculan al leer). El caso «base oscura» de `casos-tema.json` lo fija. Se anota en el contrato y el sistema visual |
| Cambio visual en la tienda (D1) | Cambian el botón del cajón, los otros cinco enlaces de AC-02 y los cuatro que se sumaron en el hito | Capturas antes y después con A, B y C (TEST-13); e2e de cada enlace (TEST-08 y TEST-09) |
| El `ETag` de `theme.css` cambia para todos | La primera carga tras el despliegue descarga la hoja otra vez | Es el comportamiento previsto de la caché (ADR-0010) |
| Material dibuja la marca de la casilla con un `svg` interno | Medir la marca obliga a leer el DOM interno de Material | Las e2e solo leen (`getComputedStyle`), sin estilar internals (STD-04). Se localiza la casilla por su rol y su nombre; dentro, el recuadro y el trazo por su posición en el DOM (el hermano del `input` y su `svg path`), sin clases `mdc-*` (PBI-0050) |
| Las capturas del detalle del pedido necesitan un pedido | Sin él no se ve «Mis pedidos» | T0 crea un pedido de invitado con el checkout sobre la copia de los datos y usa el mismo en las dos tomas |

> Nota de la implementación (2026-11-14, [verificación](verification.md#ejecución-por-tarea)): el aviso nuevo de «Temas propios ya guardados» no llega a salir con las reglas actuales. `onLink/link` no baja de 4.5:1 en ningún tema válido:
> - si el enlace es el principal, es porque se lee sobre la superficie, que es candidata del cálculo;
> - si es el color de contraste, la superficie se lee sobre él por el par `contrast/surface`, que bloquea por debajo de 4.5:1.
>
> El par queda como red de seguridad por si cambian las reglas. TEST-03 lo comprueba con una rejilla de 32 temas válidos, en lugar de «un tema con `onLink/link` bajo el mínimo se guarda», que no se puede construir (desviación de ⚠ TASK-02, aprobada por Sebastián Avila el 2026-11-13). En la comparación final (⚠ TASK-05), el diálogo de Temas con el tema de la copia no muestra ningún aviso nuevo.

## Decisiones

- **Acordadas** (de la especificación y de las reglas vigentes):
  - D1 y D2 de la [especificación](specification.md#decisiones-del-hito-de-alcance).
  - Sin migración ni datos nuevos en el estado del BFF ni en el navegador.
  - `--ws-on-link` va justo después de `--ws-link`, en el grupo de marca, fuera de `ESCALA_NEUTRA`. Así el texto queda junto a su fondo en `theme.css` y la réplica del Admin no cambia su `slice`.
  - B lo fija con el literal `#ffffff`, como el resto de su mapa. A y C lo derivan: los dos dan `#FFFFFF` y C ya fija el enlace con el grafito que deriva.
  - El par `onLink/link` va al final de `PARES_DE_CONTRASTE`, no bloquea y aparece en el diálogo de Temas como aviso.
  - `--mat-sys-on-primary: var(--ws-on-link)` en `tokens.css`, que cargan las dos aplicaciones. Ninguna regla nueva en los estilos del Admin.
  - Sin clase de Tailwind para el token: ninguna plantilla lo usa.
  - Las cuatro preguntas del hito, respondidas por Sebastián Avila el 2026-11-13 con la alternativa A ([respuestas](#respuestas-del-hito)):
    - los cuatro enlaces que AC-02 no lista forman parte de D1;
    - `--ws-on-link` se elige entre el blanco, el contraste y la superficie;
    - el par `onLink/link` pide 4.5:1 y no bloquea;
    - se mantienen los dos tokens del botón relleno y se suma `--mat-button-filled-state-layer-color: var(--ws-on-primary)`.
- **Condicionadas** (qué trabajo bloquean):
  - Pregunta 1: respondida el 2026-11-13 con A; ya no bloquea T4 ni la tabla de capturas.
  - Pregunta 2: respondida el 2026-11-13 con A; ya no bloquea T1 ni T2.
  - Pregunta 3: respondida el 2026-11-13 con A; ya no bloquea T1 ni T2.
  - Pregunta 4: respondida el 2026-11-13 con A; ya no bloquea T3.
  - El ADR de `sdd-decide`: registrado como [ADR-0014](../../../adrs/0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md) y aceptado por Sebastián Avila el 2026-11-13; ya no bloquea T1.
- **ADR necesarios:** uno, que amplía [ADR-0011](../../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md) como [ADR-0013](../../../adrs/0013-dar-a-la-tienda-un-token-propio-para-su-lienzo.md): el mapa del tema gana el token del texto sobre el enlace, calculado por el BFF, con su par de contraste, y Material pinta su `on-primary` con él. Propuesta de nombre: `0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md`. Lo redacta la etapa `sdd-decide` con las respuestas de las preguntas 2 a 4: el cálculo con la superficie como candidata (y por qué se aparta del de `--ws-on-primary`), el par a 4.5:1 que solo avisa y la capa de estado del botón relleno, que sigue en el principal. Bloquea T1. D1 no necesita ADR: aplica a la regla `a` la convención que `styles.css` ya sigue con los márgenes.

## Estrategia de pruebas

TDD obligatorio según [STD-18](../../../architecture/standards.md): en esta feature, las reglas del BFF (`domain/temas/`), `theme.css` (`application/temas/`), el contrato y la réplica de las reglas en el `domain/` del Admin. El `domain/` del Storefront solo gana un nombre en un tipo, sin reglas. La regla `a`, `tokens.css` y las casillas se prueban con e2e derivadas de los AC, que pueden escribirse junto al código: no hay entorno de pruebas de componentes de Angular ([§6](../../../../frontend/architecture.md#6-pruebas)).

| ID | Nivel | Qué verifica | AC | TDD obligatorio | Comando |
|---|---|---|---|---|---|
| TEST-01 | BFF `domain/` | `TOKENS_DEL_TEMA` tiene 32 nombres, con `--ws-on-link` justo después de `--ws-link` y fuera de la escala neutra. `tokensDelTema` da el texto sobre el enlace: blanco con un principal legible sobre los fondos; blanco cuando el enlace pasa al contraste; con la base de un predefinido, calculado y no heredado; en un tema oscuro, la superficie: `#1B1E25` en el caso «base oscura» (4.54:1) y la superficie también si el enlace pasa a un contraste claro. Los casos `tokensDelTema` de `casos-tema.json` | AC-03, AC-05 | Sí | `npm test --prefix backend` |
| TEST-02 | BFF `domain/` | A, B y C: `--ws-on-link` con `#FFFFFF`, `#ffffff` y `#FFFFFF`; mapa completo y en orden; iguales a `casos-tema.json`. `onLink/link` alcanza su mínimo en los tres, medido sobre el mapa literal de cada uno (10.23, 6.70 y 15.80). Los demás tokens de A, B y C, sin cambios | AC-03, AC-04 | Sí | `npm test --prefix backend` |
| TEST-03 | BFF `domain/` | `PARES_DE_CONTRASTE` tiene 21 pares; `onLink/link` el último, con mínimo 4.5 y sin bloquear. `revisarContraste` devuelve 21. Con el tema propio de AC-05 (principal `#F2B705`, contraste `#1F2328`), el par llega. `validarTemaPropio` sigue bloqueando solo por los dos pares de siempre: un tema con `onLink/link` bajo el mínimo se guarda | AC-05 | Sí | `npm test --prefix backend` |
| TEST-04 | BFF `application/` | `theme.css` de B y de un tema propio tiene 32 líneas, con `--ws-on-link` justo después de `--ws-link` y con su valor | AC-03 | Sí | `npm test --prefix backend` |
| TEST-05 | Contrato del BFF | `/bff/appearance` trae `tokens['--ws-on-link']` igual a `#ffffff` con B; `theme.css` tiene 32 declaraciones y la declara justo después de `--ws-link`; el resto del smoke de temas, igual | AC-03 | Sí | `npm run test:contract --prefix backend` |
| TEST-06 | Frontend `domain/` (Admin) | La réplica de `tema.rules.ts` da los mismos tokens y pares que el BFF con `casos-tema.json`: 32 tokens, 21 pares, el caso oscuro y los casos con la base de B | AC-03, AC-05 | Sí | `npm test --prefix frontend` |
| TEST-07 | Estructura, lint y build | TEST-18 (a) de `validate-structure`: `tokens.css` igual al mapa de B, con `--ws-on-link: #ffffff`; (b): ningún color fijo fuera de `tokens.css`. Tipado de `NombreToken` y `ParContraste` en las dos aplicaciones, Sheriff y `templateAccessibility` | AC-03, AC-07 | No | `npm run verify` (desde la raíz) |
| TEST-08 | E2E, `storefront-enlaces.spec.ts` (nuevo) | A 375 px, con A, B y C, se abre el cajón y, al terminar su animación, «Ver todos los productos» tiene el color de `--ws-on-primary` sobre el de `--ws-primary` y la relación es de al menos 4.5:1 (con B, `rgb(255, 255, 255)` sobre `rgb(29, 78, 216)`) | AC-01 | No | `npm run test:e2e` (desde `frontend/`) |
| TEST-09 | E2E, `storefront-enlaces.spec.ts` | Con B, el color de cada enlace de AC-02 con `getComputedStyle`, en reposo y al pasar el puntero: «Crear cuenta» en `/cuenta/login`, «Ver toda la categoría» y las subcategorías del cajón, «Mis pedidos» del detalle y el nombre del producto del carrito. Y los cuatro del hito: el correo del pie con `--ws-footer-heading` al pasar el puntero; «Inicia sesión» de `/pedidos` sin sesión, subrayado en reposo; «Ayuda» a 1440 px y «Seguimiento de pedidos» en `/inicio-anterior`, subrayados solo al pasar el puntero. «Olvidé mi contraseña» sigue con el color del texto que lo rodea y sin subrayado | AC-02, AC-07 | No | `npm run test:e2e` |
| TEST-10 | E2E, `admin-casillas.spec.ts` (nuevo) | En `/contenido`, con A, B y C activos por la API del Admin: la casilla marcada «Página Contacto» tiene la marca y el relleno de `COLORES_SOBRE_EL_ENLACE`; la marca contrasta al menos 3:1 con el relleno y el relleno al menos 3:1 con la tarjeta. Con A y B, igual que antes (10.23:1 y 6.70:1). La casilla sin marcar conserva el borde de `--ws-border-strong` | AC-03, AC-04, AC-07 | No | `npm run test:e2e` |
| TEST-11 | E2E, `admin-casillas.spec.ts` | Se crea y activa el tema propio de AC-05 (principal `#F2B705`, secundario `#C2410C`, fondo `#F2F3F5`, superficie `#FFFFFF` y contraste `#1F2328`: hereda la escala neutra de C); la casilla cumple lo de TEST-10. Al terminar se reactiva B, como en `admin-temas.spec.ts` | AC-05 | No | `npm run test:e2e` |
| TEST-12 | E2E, `storefront-material-contraste.spec.ts` y `admin-material-contraste.spec.ts` (nuevos) | Con A, B y C, la relación de cada componente de la [tabla](#componentes-de-material-y-lo-que-pintan-sobre-el-principal): casilla (Admin), botón de opción del checkout (punto sobre la superficie, 3:1), etiqueta del botón relleno del diálogo (4.5:1) y su capa de estado, que debe tener el color de `--ws-on-primary` con los tres temas, etiqueta enfocada de un campo (4.5:1), opción seleccionada de una lista desplegable (texto 4.5:1 y marca 3:1) y menú (menú de usuario del Admin y selector de tema de la tienda, 4.5:1). Cada medida se registra en `test.info().annotations` para que la verificación la liste | AC-06 | No | `npm run test:e2e` |
| TEST-13 | Comparación de capturas | Antes y después con A, B y C ([capturas](#capturas-antes-y-después)): solo cambia lo de AC-01 a AC-05 y los cuatro enlaces del hito | AC-01 a AC-05, AC-07 | No | Panel del navegador o [`tools/qa/`](../../../../frontend/tools/qa/), con el BFF sobre una copia de los datos (`WEBSTORE_DATA_FILE`), nunca `backend/data.json` |

> Nota de la implementación (2026-11-14, [verificación](verification.md#ejecución-por-tarea)): en TEST-10, el borde de la casilla sin marcar no es `--ws-border-strong`. Material 22.2.4 lo pinta con `--mat-checkbox-unselected-icon-color`, que por defecto es `--mat-sys-on-surface-variant` y que `tokens.css` lleva a `--ws-muted`, también antes de la feature. TEST-10 comprueba ese token y el relleno transparente: lo que AC-07 protege es que no cambie. En reposo, A 6.92:1, B 6.39:1 y C 6.84:1 (desviación de ⚠ TASK-03, aprobada por Sebastián Avila el 2026-11-14).

Caracterización: el código que cambia ya tiene pruebas. Las reglas de temas están en `tema.rules.test.mjs`, `temas-predefinidos.test.mjs`, `temas.queries.test.mjs`, el smoke del contrato y `tema.rules.spec.mjs`. La regla `a` y las casillas no tienen pruebas de color: las capturas «antes» de T0 y las medidas «antes» de TEST-08 a TEST-10, tomadas en `dev` (que deben fallar en los enlaces y en la casilla con C), son su caracterización. T0 ejecuta `npm run verify` y el e2e completo en `dev` antes de tocar código, como línea base.

### Pruebas existentes afectadas

| Prueba | Qué puede cambiar: aserciones o solo valores esperados | Cómo se conserva la cobertura |
|---|---|---|
| [`tema.rules.test.mjs`](../../../../backend/tests/unit/domain/temas/tema.rules.test.mjs) | Valores: 31 → 32 tokens y 20 → 21 pares en las aserciones de cantidad y en sus títulos. Se añaden las de TEST-01 y TEST-03 | Los casos de hoy siguen; solo crecen |
| [`temas-predefinidos.test.mjs`](../../../../backend/tests/unit/domain/temas/temas-predefinidos.test.mjs) | Aserciones nuevas: el valor de `--ws-on-link` en A, B y C. Las de hoy, igual | Recorre `TOKENS_DEL_TEMA` y `PARES_DE_CONTRASTE`, así que cubre el token y el par nuevos sin más cambios |
| [`casos-tema.json`](../../../../backend/tests/unit/domain/temas/casos-tema.json) | Solo valores esperados: la clave nueva en los mapas y el par nuevo en las medidas | Lo leen las dos copias de las reglas |
| [`temas.queries.test.mjs`](../../../../backend/tests/unit/application/temas/temas.queries.test.mjs) | Ninguna: cuenta con `TOKENS_DEL_TEMA.length`. Se añade la posición del token (TEST-04) | — |
| [`contrato.smoke.mjs`](../../../../backend/tests/integration/contrato.smoke.mjs) | Valores: 31 → 32 declaraciones en la comprobación y su mensaje. Aserciones nuevas de TEST-05 | Las de hoy siguen |
| [`tema.rules.spec.mjs`](../../../../frontend/projects/admin/src/app/features/temas/domain/tema.rules.spec.mjs) | Valores: 31 → 32 y 20 → 21 en las cantidades y en los títulos | Los casos nuevos de `casos-tema.json` entran solos |
| [`validate-structure.mjs`](../../../../tools/validate-structure.mjs) | Ninguna: recorre `TOKENS_DEL_TEMA` | Exige que `tokens.css` declare el token con el valor de B |
| [`storefront-temas.spec.ts`](../../../../frontend/tests/e2e/storefront-temas.spec.ts) | Ninguna. TEST-20 de la 002 (con C, ningún color de B) recorre los elementos visibles; con D1, los enlaces del cajón toman colores de C, no de B | Si fallara, es un hallazgo, no un valor que ajustar |
| [`admin-contenido.spec.ts`](../../../../frontend/tests/e2e/admin-contenido.spec.ts) | Ninguna: marca y desmarca casillas por rol y nombre | — |
| [`storefront-navegacion.spec.ts`](../../../../frontend/tests/e2e/storefront-navegacion.spec.ts) y [`storefront-cuenta.spec.ts`](../../../../frontend/tests/e2e/storefront-cuenta.spec.ts) | Ninguna: localizan por rol y texto, no por color | — |

### Capturas antes y después

Con el mismo método, las mismas rutas y los mismos anchos en las dos tomas ([comparar capturas](../../../development/agent-execution.md#comparar-capturas)), con el BFF sobre una copia de los datos, un producto en el carrito y un pedido de invitado. Cada pantalla con los temas A, B y C, activados por la API del Admin como en `storefront-temas.spec.ts`. En el Admin, con `superadmin`. Se guardan en `frontend/output/visual-qa/005-contraste-de-controles-con-los-temas/{antes,despues}/`.

| Pantalla o ruta | Anchos | Cambio visual esperado |
|---|---|---|
| Cajón móvil abierto, con una categoría desplegada | 375 px | «Ver todos los productos» con el texto de `--ws-on-primary` (blanco con A y B, grafito sobre ámbar con C); «Ver toda la categoría» con el color del enlace; las subcategorías con el texto secundario |
| Ingresar (`/cuenta/login`) | 1440 y 375 px | «Crear cuenta» con el color del enlace |
| Detalle del pedido (`/pedidos/:orderId`) | 1440 y 375 px | «Mis pedidos» con el texto secundario |
| Carrito (`/carrito`) | 1440 y 375 px | Ninguno en reposo (el nombre cambia solo al pasar el puntero: TEST-09) |
| Mis pedidos sin sesión (`/pedidos`) | 1440 y 375 px | «Inicia sesión» subrayado |
| Inicio (`/`), con la franja superior y el pie | 1440 y 375 px | Ninguno en reposo (el correo del pie y «Ayuda» cambian solo al pasar el puntero: TEST-09) |
| Catálogo, ficha, diálogo «Producto agregado» y checkout | 1440 y 375 px | Ninguno |
| Admin: `/contenido`, `/banners`, `/marcas`, `/productos` y `/usuarios`, con una casilla marcada a la vista | 1440 y 375 px | Con C, la casilla marcada: grafito con la marca blanca. Con A y B, ninguno |
| Admin: login (`/login`), Resumen (`/`) y Temas (`/temas`), con el diálogo de un tema propio abierto | 1440 y 375 px | Ninguno. El diálogo puede listar el aviso nuevo solo si el tema no lo cumple |
| Admin: menú de usuario abierto y una lista desplegable abierta con una opción seleccionada | 1440 px | Ninguno |

### Ejecución prevista

Orden por dependencias. Ninguna tarea arranca antes del [hito de arquitectura](#hito-de-arquitectura), y T1 tampoco antes del ADR de `sdd-decide`. Las ⚠ no se delegan ([reglas de escalado](../../../development/agent-execution.md#reglas-de-escalado)).

| Paso o tarea | Nivel y esfuerzo sugeridos | E2E | Criterios de aprobación (si es ⚠) |
|---|---|---|---|
| T0. Copia de los datos con un pedido de invitado; capturas «antes» de la tienda y del Admin con A, B y C; medidas «antes» de los enlaces y de la casilla; `verify` y e2e completo como línea base | ligero · medio | Sí | — |
| T1. ⚠ Token y par en el BFF con TDD (TEST-01 a TEST-05), `casos-tema.json` y el contrato | avanzado · alto | No | TEST-01 a TEST-05 en verde, con el rojo de cada uno registrado antes del código. A, B y C: `--ws-on-link` con su valor y el resto de su mapa sin cambios. Candidatos `[BLANCO, C, Sf]` y `#1B1E25` en el caso «base oscura». `onLink/link` a 4.5:1, en verde con A, B y C y sin bloquear. `theme.css` de B con 32 líneas. Ninguna migración ni cambio en `customThemes`. `BFF-CONTRACT.md` con 32 tokens y 21 pares |
| T2. Réplica del Admin (`tema.model.ts`, `tema.rules.ts` y `NOMBRE_DEL_PAR`) y `NombreToken` del Storefront, con TDD (TEST-06) | estándar · alto | No | — |
| T3. ⚠ `tokens.css`: `--ws-on-link`, `--mat-sys-on-primary` y `--mat-button-filled-state-layer-color`; TEST-07, TEST-10 a TEST-12 | avanzado · alto | Sí | TEST-07 y TEST-10 a TEST-12 en verde, con las medidas de cada componente en las anotaciones. Con C, la casilla marcada con la marca legible; con A y B, igual que en la base. Capturas del Admin con A, B y C: solo cambian las casillas marcadas con C. Diálogo de la tienda igual con los tres temas, también al pasar el puntero sobre «Ver carrito». Sin estilos sobre internals de Material ni `::ng-deep` |
| T4. ⚠ Regla `a` en `@layer base`, sin tocar las plantillas; TEST-08 y TEST-09 | estándar · alto | Sí | TEST-08 y TEST-09 en verde, con los diez enlaces. Capturas de la tienda con A, B y C a 1440 y 375 px: solo cambian los enlaces de la [tabla](#enlaces-afectados-por-d1). Ningún enlace con clase `ws-*` cambia. Sin desborde horizontal |
| T5. ⚠ Capturas «después» y comparación (TEST-13), `verify` y e2e completo | avanzado · alto | Sí | Sebastián aprueba las capturas: solo cambia lo de la [tabla](#capturas-antes-y-después). `verify` y el e2e completo en verde. Sin errores de consola nuevos |
| T6. Documentos afectados | estándar · medio | No | — |

Bloques sugeridos para `sdd-implement`:

1. Base y BFF: T0 y T1.
2. Admin y Material: T2 y T3.
3. Enlaces de la tienda: T4.
4. Cierre: T5 y T6.

## Documentos afectados

- [ADR-0014](../../../adrs/0014-dar-al-tema-un-token-para-el-texto-sobre-el-enlace.md), que amplía [ADR-0011](../../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md), en `sdd-decide`. [`docs/architecture/README.md`](../../../architecture/README.md), [`backend/architecture.md`](../../../../backend/architecture.md) y [`frontend/architecture.md`](../../../../frontend/architecture.md) lo anotan como decidido y pendiente de implementar; T6 lo pasa al estado real (32 tokens y 21 pares).
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md): `Tema.tokens` con 32 claves y `--ws-on-link` (su regla y sus valores en A, B y C), los 21 pares de `INSUFFICIENT_THEME_CONTRAST` y las 32 declaraciones de `theme.css`.
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md): 32 tokens y 21 pares; `--ws-on-link` y su uso en Material; la regla `a` en la capa base y los enlaces que muestran su utilidad.
- [`frontend/architecture.md`](../../../../frontend/architecture.md): §6, las e2e nuevas `storefront-enlaces`, `admin-casillas`, `storefront-material-contraste` y `admin-material-contraste`, y la ayuda `apoyo/contraste.ts`.
- [Especificación](specification.md): una nota fechada del hito de arquitectura en AC-02, AC-07 y los hechos, con los cuatro enlaces que se suman a D1, la ruta real de ingresar (`/cuenta/login`) y, en «Datos y contrato», la superficie como candidata del cálculo. No se reescriben las decisiones del hito de alcance.
- [Trazabilidad](../../../planning/TRACEABILITY.md): filas para el contraste de los enlaces de la tienda y de los controles de Material.
- [Backlog](../../../planning/backlog.md): PBI-0048 y PBI-0049 a `hecha` al entregar, con el PR. PBI-0053, anotado en esta etapa ([hallazgos](#hallazgos-fuera-de-alcance)).
- [Glosario](../../../architecture/glosario.md): sin cambios.

## Hallazgos fuera de alcance

- **La opción seleccionada de las listas desplegables no usa el tema.** Material la pinta con `--mat-sys-secondary-container` (`#dae2f9`) y `--mat-sys-on-secondary-container` (`#3e4759`), que `tokens.css` no redefine: salen de `azure-blue.css` con A, B y C. Se lee (7.21:1), y la marca mínima en el enlace también (5.18:1 con B, 7.90:1 con A y 12.21:1 con C), así que no rompe REQ-05, pero es un azul grisáceo ajeno a A y C. Anotado como [PBI-0053](../../../planning/backlog.md). TEST-12 lo mide sin cambiarlo.
- **El texto sobre el principal (`--ws-on-primary`) tiene el mismo límite en los temas oscuros** que la pregunta 2 resuelve para el enlace: elige solo entre el blanco y el contraste. Ya lo cubre el caso «base oscura» de `tema.rules.test.mjs`, que espera el aviso. No se anota aparte: con la respuesta a la pregunta 2, la diferencia entre los dos cálculos queda escrita en el ADR.

## Contradicciones con la especificación

- **AC-02 y los hechos dicen «seis enlaces» con utilidades de color**; hay siete (el correo del pie lleva `hover:text-footer-heading`) y tres más con utilidades de subrayado. Todos cambian con D1. AC-07 dice que solo cambian los elementos de AC-01 a AC-05. Resuelto en el hito con la [pregunta 1](#pregunta-1-qué-se-hace-con-los-cuatro-enlaces-que-d1-cambia-y-ac-02-no-lista): los cuatro forman parte de D1, con una nota fechada en AC-02 y AC-07 (T6).
- **AC-02 cita «Crear cuenta» en `/cuenta/ingresar`**; la ruta es `/cuenta/login` ([`cuenta.routes.ts`](../../../../frontend/src/app/features/cuenta/cuenta.routes.ts)). Se corrige con una nota fechada en T6; las pruebas usan `/cuenta/login`.
- **«Calculado igual que `--ws-on-primary`»** (Datos y contrato) deja REQ-04 sin cumplir en un tema propio oscuro ([riesgo](#dependencias-y-riesgos)). Resuelto en el hito con la [pregunta 2](#pregunta-2-entre-qué-colores-elige-el-bff-el-texto-sobre-el-enlace): la superficie es candidata, con una nota fechada en «Datos y contrato» (T6).
- **AC-06 incluye la opción seleccionada de la lista y el menú entre los componentes que «pintan un color sobre el principal»**; ninguno de los dos lo hace ([tabla](#componentes-de-material-y-lo-que-pintan-sobre-el-principal)). Se miden igual (TEST-12), como pide AC-06; no cambia el alcance.

## Hito de arquitectura

Se pide aprobar:

- las responsabilidades por capa, con el token nuevo en el BFF, su réplica en el Admin y el mapeo de Material en `tokens.css`, y la regla `a` en la capa base de la tienda;
- que el contrato solo crece (una clave en `tokens` y una línea en `theme.css`), sin migración ni datos nuevos;
- las decisiones acordadas, el ADR que amplía ADR-0011 y la estrategia de pruebas, con TDD en las reglas, `theme.css` y el contrato del BFF y en la réplica del Admin;
- y estas cuatro preguntas, que se presentan de una en una.

### Pregunta 1. ¿Qué se hace con los cuatro enlaces que D1 cambia y AC-02 no lista?

| Alternativa | Qué significa |
|---|---|
| **A. Aceptarlos como parte de D1 (recomendada)** | Los diez enlaces muestran lo que declaran. Cambian también el correo del pie (blanco al pasar el puntero, como los demás enlaces del pie), «Inicia sesión» de `/pedidos` (subrayado siempre, como se escribió) y «Ayuda» y «Seguimiento de pedidos» de la franja superior (subrayado al pasar el puntero). La especificación recibe una nota fechada en AC-02 y AC-07, TEST-09 los mide y la tabla de capturas los lista. Es lo que dice D1: «los enlaces que declaran una utilidad la muestran». El subrayado de «Inicia sesión», dentro de un párrafo y con el mismo color que él, es además lo que lo distingue como enlace (WCAG 1.4.1) |
| B. Quitar las utilidades de esos cuatro enlaces | Se ven igual que hoy y AC-07 queda como está. Se borra código que expresa un diseño que nunca se vio, y «Inicia sesión» sigue sin distinguirse del texto más que por el peso |
| C. Mover solo `color` a la capa base y dejar `text-decoration: none` fuera de capa | Solo cambian los siete enlaces con utilidades de color (incluido el correo del pie). Las utilidades de subrayado siguen sin aplicarse en toda la tienda, y la próxima que alguien escriba vuelve a fallar sin aviso: el mismo defecto que D1 quiere cerrar |

Evidencia: [tabla de enlaces](#enlaces-afectados-por-d1), con todas las etiquetas `<a>` de `frontend/src/app`. La regla está en [`styles.css`](../../../../frontend/src/styles.css), fuera de capa, y Tailwind declara las utilidades en la capa `utilities`. Los enlaces del pie con `ws-footer-links` ya se subrayan y se aclaran al pasar el puntero (`storefront.css`).

### Pregunta 2. ¿Entre qué colores elige el BFF el texto sobre el enlace?

| Alternativa | Qué significa |
|---|---|
| **A. Entre el blanco, el contraste y la superficie (recomendada)** | `textoMasLegible(enlace, [BLANCO, C, Sf])`. En A, B, C, los casos de `casos-tema.json` y cualquier tema claro, la superficie es blanca o el blanco ya gana: el valor no cambia (`#FFFFFF`). En un tema oscuro, la superficie oscura se lee sobre un enlace claro: el caso «base oscura» pasa de 3.68:1 a 4.54:1, y un tema oscuro con principal oscuro (el enlace pasa al contraste, casi blanco) de 1.09:1 a 15.31:1. Cumple REQ-04 también en temas oscuros. Se aparta del cálculo de `--ws-on-primary`, y el ADR lo dice |
| B. Entre el blanco y el contraste, como `--ws-on-primary` | Lo que dice la especificación al pie de la letra. Igual en A, B, C y los temas claros. En un tema oscuro, la marca de la casilla puede quedar ilegible (1.09:1): solo lo avisa el par nuevo |

Evidencia: [`tokensDeMarca`](../../../../backend/src/domain/temas/tema.rules.mjs) da a `--ws-link` el principal si se lee sobre los dos fondos y, si no, el contraste. [`textoMasLegible`](../../../../backend/src/domain/temas/contraste.rules.mjs) elige el candidato con más contraste. Los temas propios oscuros están permitidos: el caso «base oscura sin predefinido» de `casos-tema.json` lo prueba. Medido con las reglas del BFF (script de la sesión, sin código de la aplicación): los valores de esta tabla.

### Pregunta 3. ¿Qué mínimo pide el par nuevo?

| Alternativa | Qué significa |
|---|---|
| **A. 4.5:1, como texto (recomendada)** | `--mat-sys-on-primary` lo usa Material también para texto: la etiqueta del botón relleno por defecto, la del deslizador, el día elegido del selector de fecha y el número del paso. Igual que los demás pares `on*` del tema. En A, B y C llega (10.23, 6.70 y 15.80); con la A de la pregunta 2, también en el caso oscuro (4.54) |
| B. 3:1, como marca de un control (WCAG 1.4.11) | Basta para la casilla, que es lo único que hoy lo usa. Menos avisos en temas propios, pero si mañana se usa un componente que pinta texto con `on-primary`, el aviso no saltaría con 3.5:1 |

Evidencia: los componentes que leen `--mat-sys-on-primary` en Material 22.2.4 ([tabla](#componentes-de-material-y-lo-que-pintan-sobre-el-principal)); REQ-05 pide 4.5:1 para texto y 3:1 para marcas.

### Pregunta 4. ¿Qué se hace con los tokens del botón relleno de la feature 004?

| Alternativa | Qué significa |
|---|---|
| **A. Mantenerlos y fijar también la capa de estado (recomendada)** | Siguen `--mat-button-filled-container-color: var(--ws-primary)` y `--mat-button-filled-label-text-color: var(--ws-on-primary)`, y se suma `--mat-button-filled-state-layer-color: var(--ws-on-primary)`. El botón relleno es el principal, no el enlace. «Ver carrito» se ve igual con los tres temas, también al pasar el puntero y con el foco. Se actualiza el comentario de `tokens.css` |
| B. Mantener solo los dos de hoy | El botón se ve igual en reposo, pero con C el velo de 8 % al pasar el puntero o enfocar pasa de grafito a blanco sobre el ámbar: un cambio que nadie pidió (AC-07) |
| C. Quitarlos | El botón relleno toma el enlace y su texto: con C, «Ver carrito» pasa de ámbar con texto grafito a grafito con texto blanco. Simplifica `tokens.css`, pero es un cambio visual que la especificación no pide (STD-12) |

Evidencia: [`tokens.css`](../../../../frontend/src/styles/tokens.css) líneas 68 y 77-80; en Material 22.2.4, `--mat-button-filled-state-layer-color` y `--mat-button-filled-progress-active-indicator-color` usan `--mat-sys-on-primary` (el indicador de progreso no se usa). La tienda tiene un solo botón relleno, el del diálogo «Producto agregado»; el Admin, ninguno.

### Respuestas del hito

Las preguntas se presentaron de una en una el 2026-11-13, en la sesión principal, con sus alternativas y la recomendación. Sebastián Avila las respondió allí y eligió la alternativa A en las cuatro, sin ajustes. La sesión principal revisó antes el plan contra el código (los diez enlaces, los tokens de Material 22.2.4 y las cifras de la pregunta 2, reproducidas con las reglas del BFF) y recomendó aprobarlo.

| Pregunta | Decisión | Alternativas descartadas | Ajustes pedidos y dónde quedan |
|---|---|---|---|
| 1. Los cuatro enlaces que D1 cambia y AC-02 no lista | **A. Aceptarlos como parte de D1**: el correo del pie, «Inicia sesión» de `/pedidos` y «Ayuda» y «Seguimiento de pedidos» de la franja superior muestran sus utilidades, como los otros seis. Elegida por Sebastián Avila el 2026-11-13 («A: aceptarlos») | B. Quitar sus utilidades (se borra un diseño escrito y «Inicia sesión» sigue sin distinguirse del párrafo); C. llevar solo el color a la capa base (las utilidades de subrayado siguen sin aplicarse en toda la tienda) | Ninguno. Queda en el [enfoque](#enfoque), la [tabla de enlaces](#enlaces-afectados-por-d1), TEST-09, las [capturas](#capturas-antes-y-después), T4 y la nota de T6 en la especificación |
| 2. Candidatos del texto sobre el enlace | **A. Entre el blanco, el contraste y la superficie**: `textoMasLegible(enlace, [BLANCO, C, Sf])`. Igual en A, B, C y los temas claros (`#FFFFFF`); en un tema oscuro, la superficie (`#1B1E25` en el caso «base oscura», 4.54:1). Elegida por Sebastián Avila el 2026-11-13 («A: con superficie») | B. Entre el blanco y el contraste, como `--ws-on-primary` (en un tema oscuro, la marca de la casilla podía quedar a 1.09:1) | Ninguno. Queda en las [responsabilidades](#responsabilidades-por-capa), los [tipos y nombres](#tipos-intermedios-y-nombres), los [riesgos](#dependencias-y-riesgos), TEST-01, T1 y el ADR |
| 3. Mínimo del par nuevo | **A. 4.5:1, como texto**: `onLink/link` con `TEXTO_MINIMO` y `bloquea: false`. Elegida por Sebastián Avila el 2026-11-13 («A: 4.5:1») | B. 3:1, como marca de un control (no avisaría si un componente pinta texto con `on-primary` a 3.5:1) | Ninguno. Queda en los [tipos y nombres](#tipos-intermedios-y-nombres), TEST-03 y T1 |
| 4. Tokens del botón relleno de la 004 | **A. Mantenerlos y fijar también la capa de estado**: siguen `--mat-button-filled-container-color` y `--mat-button-filled-label-text-color`, y se suma `--mat-button-filled-state-layer-color: var(--ws-on-primary)`. Elegida por Sebastián Avila el 2026-11-13 («A: fijar capa») | B. Mantener solo los dos de hoy (con C, el velo de «Ver carrito» pasaría de grafito a blanco); C. quitarlos (con C, «Ver carrito» pasaría a grafito con texto blanco, un cambio visual sin pedir) | Ninguno. Queda en el [enfoque](#enfoque), las [responsabilidades](#responsabilidades-por-capa), los [riesgos](#dependencias-y-riesgos), TEST-12 y T3 |
