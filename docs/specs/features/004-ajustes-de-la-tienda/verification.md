# 004. Ajustes de la tienda — Verificación

- Feature: `004-ajustes-de-la-tienda`
- Tareas: [tasks.md](tasks.md)

Documento creado por TASK-01 desde la [plantilla](../../templates/verification-template.md). Hasta `sdd-verify` solo se rellenan la revisión y la ejecución por tarea; las demás secciones siguen pendientes.

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/004-ajustes-de-la-tienda`; base `4677972` (`dev`) |
| Fecha | 2026-11-13 |
| Entorno | Windows 10 Pro 10.0.19045, Node v24.20.0, npm 11.19.0; Google Chrome instalado (Playwright `channel: 'chrome'`) |
| Datos | `backend/data-capturas.json` (creada desde la semilla, ignorada por git) para las capturas; el e2e usa su archivo temporal. Nunca `backend/data.json` |

## Ejecución por tarea

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | `38fb856` | Ejecución | — | Claude Code, `claude-sonnet-5-5`, esfuerzo `medium`; sesión de bloque, sin delegar |
| TASK-01 | | `npm run verify` sobre la base `4677972` | Pasa (exit 0): sintaxis de 68 archivos, formato, lint, Sheriff y build de las dos apps; 29 pruebas de arquitectura, 83 del frontend, 110 del BFF, contrato «Smoke test BFF: OK» y estructura contractual OK | — |
| TASK-01 | | `npm run test:e2e` completo (línea base de caracterización) | Pasa (exit 0): 89 pruebas en 3.3 min, sin fallos ni pruebas inestables, sobre la base `4677972` y sin mis servidores levantados | — |
| TASK-01 | | Capturas «antes» con A, B y C | 19 por tema (tienda: diálogo sobre la ficha, inicio, catálogo, ficha, carrito y checkout a 1440 y 375 px, y cajón móvil a 375 px; Admin: `/login`, `/` y `/temas` a 1440 y 375 px); un producto en el carrito (`soundbar-cinema-500`); `superadmin` en el Admin; B activo al terminar. Método: Playwright con Chrome, páginas completas; guiones en `frontend/output/visual-qa/004-ajustes-de-la-tienda/guiones/`; capturas en `.../antes/{a,b,c}` con su `LEEME.md` | — |
| TASK-01 | | Ruido de rasterizado | Dos tomas del mismo árbol con B: 15 de 19 archivos idénticos; difieren 4 de la tienda a 375 px (`inicio` y `cajon-movil`: 3 a 6 px cerca de (173, 834); `ficha` y `dialogo-ficha`: unos 3 600 px en la caja (115, 562)–(188, 610)). Se tratan como ruido en las comparaciones | — |
| TASK-01 | | Consola de la base | Ver [Consola de la base](#consola-de-la-base) | — |
| TASK-01 | | Datos | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`); B activo en la copia (`activeThemeId: "b"`, `customThemes: []`); servidores detenidos (puertos 3400, 4400 y 4500 libres) | — |
| ⚠ TASK-02 | `b989b2b` | Ejecución | Aprobada por Sebastián Avila el 2026-11-13 («Sí, apruébala», desde su sesión principal), anotando que el Admin no cambia con B | Claude Code, `claude-opus-5-5`, sin delegar (el esfuerzo de la sesión no se pudo leer desde dentro; el catálogo pide `high`) |
| ⚠ TASK-02 | | Rojo, antes del código (`node --test <archivo>` desde `backend/` o `frontend/`, y `node tests/integration/contrato.smoke.mjs`) | Todos por aserción, ninguno por sintaxis ni importación. TEST-01 y TEST-03 (`tema.rules.test.mjs`): 11 de 22 fallan (30 ≠ 31 tokens, 15 ≠ 20 pares, sin `--ws-store-bg`, casos de tokens, pares y `revisarContraste`). TEST-02 (`temas-predefinidos.test.mjs`): 4 de 13 (sin lienzo en A, B y C, `#8a96a8` ≠ `#8894a6`, predefinidos ≠ casos). TEST-04 (`temas.queries.test.mjs`): 1 de 12 (30 ≠ 31 declaraciones). TEST-05 (smoke): «/bff/appearance debe traer tokens["--ws-store-bg"] igual a #f9fafc con B». TEST-06 (`tema.rules.spec.mjs` del Admin): 8 de 28 (30 ≠ 31, 15 ≠ 20, casos) | — |
| ⚠ TASK-02 | | Verde | TEST-01 y TEST-03 22/22, TEST-02 13/13, TEST-04 12/12, TEST-05 «Smoke test BFF: OK», TEST-06 28/28; `npm test --prefix backend` 118/118 y `npm test --prefix frontend` 83/83. `casos-tema.json` con B 17.09, 6.11 y 3.07, A 3.43 y C 3.16 en `borderStrong/surface`, y el caso con la base de B con `'--ws-store-bg': '#F3F5F8'` | — |
| ⚠ TASK-02 | | `theme.css` servido con B | 31 declaraciones, `--ws-store-bg: #f9fafc` (línea 15) justo antes de `--ws-bg: #f3f5f8` (línea 16) y `--ws-border-strong: #8894a6`. `--ws-bg` y `colors.background` de A, B y C sin cambios; `INSUFFICIENT_THEME_CONTRAST` sigue con `contrast/background` y `contrast/surface`; diff sin cambios en `infrastructure/`, `customThemes` ni `schemaVersion` | — |
| ⚠ TASK-02 | | `npm run verify` | Pasa (exit 0): agentes, sintaxis, formato, lint, Sheriff, build de las dos apps (TEST-08), 29 pruebas de arquitectura, estructura con «TEST-18 (a): el tema B del BFF es igual a tokens.css» y «(b)» (TEST-07), suites y smoke | — |
| ⚠ TASK-02 | | `npm run test:e2e` completo (cierra la fase 1) | Pasa (exit 0): 89 pruebas en 3.7 min, sin fallos ni pruebas inestables; puertos 3400, 4400 y 4500 libres antes y después | — |
| ⚠ TASK-02 | | Capturas con B frente a TASK-01 (`despues-task02/b` y `comparar.mjs`) | Iguales (7): las seis del Admin y la ficha a 375 px. Solo bordes de `--ws-border-strong` (9): «Seguir comprando» (`ws-btn-secondary`) en carrito y checkout a 1440 y 375 px, botón secundario en la ficha y en el diálogo a 1440 px, contornos de los filtros del catálogo a 1440 px, punto de «sin stock» del catálogo a 375 px y 327 px de la sombra sobre el diálogo a 375 px (un nivel en un canal). Ruido (3): inicio y cajón a 375 px en la caja conocida y la barra del carrusel del inicio a 1440 px. **Control** (`control-task02/b`, la misma toma con `--ws-border-strong: #8a96a8 !important` inyectado): iguales salvo las cajas de ruido, así que todo cambio sale de ese token y el lienzo no cambia | — |
| ⚠ TASK-02 | | Hallazgo: el Admin no cambia con B | La fila del Admin de [capturas antes y después](planning.md#capturas-antes-y-después) del plan no se cumple: en el Admin, `--ws-border-strong` solo llega por `--mat-sys-outline`, y ninguna pantalla capturada (`/login`, `/` y `/temas`) tiene un control que lo use; ningún campo del Admin usa `appearance="outline"` ni `line-strong` (comprobado en el código por la sesión principal). ⚠ TASK-08 espera «Iguales» en el Admin con B, salvo el fondo de la vista previa de Temas, que cambia ⚠ TASK-03 | — |
| ⚠ TASK-02 | | Ruido nuevo | `tienda-inicio-1440`: 3 a 6 px en torno a (1231, 632), la barra de progreso animada del carrusel; su ancho depende del instante de la toma y difiere también en el control. No cuenta como cambio | — |
| ⚠ TASK-02 | | Consola, datos y Prettier | Consola igual que la base (`NG0913`, `NG02955` y el `404` de `/favicon.ico`, una vez por ejecución). Hash de `backend/data.json` del checkout principal igual (`f4480a1c…ae34e`); copia con B activo, sin temas propios y en la revisión 8; servidores detenidos (dos `ng serve` sobrevivieron y se cerraron por PID). Prettier sobre los 12 archivos de código tocados | — |
| ⚠ TASK-03 | `831bf9a` | Ejecución | Aprobada por Sebastián Avila el 2026-11-13 («Sí, apruébala», desde su sesión principal), con la comprobación del botón del cajón móvil antes del commit | Claude Code, `claude-opus-5-5`, sin delegar (el esfuerzo de la sesión no se pudo leer desde dentro; el catálogo pide `high`) |
| ⚠ TASK-03 | | Diff | `--color-store-canvas: var(--ws-store-bg)` en `tokens.css`; `html` y `body` de la tienda con `var(--ws-store-bg)`; shell (`AppLayout`) y `PaginaNoEncontradaPage` con `bg-store-canvas`; `'--ws-store-bg'` en `NombreToken` del Storefront; `figure` de `VistaPreviaTemaComponent` con `bg-store-canvas`. En `frontend/src` solo quedan dos `bg-canvas`, los dos buscadores; `styles.css` del Admin y `LoginPage`, sin cambios | — |
| ⚠ TASK-03 | | Rojo de TEST-14 y TEST-15, con el código sin cambiar (`npx playwright test` de `storefront-temas.spec.ts` y `admin-temas.spec.ts`, desde `frontend/`) | 11 fallos, todos por aserción: el lienzo sale en `--ws-bg` (los cinco de TEST-20 con C, los dos de la primera carga y tres de TEST-14) y la vista previa no sigue a `--ws-store-bg` (TEST-15: `rgb(243, 245, 248)` en lugar de `rgb(18, 52, 86)`). Ya pasaban el lienzo del tema propio con la base de B (que el lienzo sea el fondo principal) y el aviso del texto secundario, que llegó con ⚠ TASK-02 | — |
| ⚠ TASK-03 | | Verde de las dos specs | 23 de 23 en 1.4 min, con TEST-20 y TEST-22 de la feature 002 (sin parpadeo; respaldo de B con `theme.css` caída) | — |
| ⚠ TASK-03 | | `npm run verify` | Pasa (exit 0): TEST-07 («TEST-18 (a): el tema B del BFF es igual a tokens.css», «(b): ningún color fijo fuera de tokens.css» y «(c)»), formato, lint, Sheriff, build de las dos apps, 29 pruebas de arquitectura, 83 del frontend, 118 del BFF y «Smoke test BFF: OK» | — |
| ⚠ TASK-03 | | `npm run test:e2e` completo (cierra la fase 2) | Pasa (exit 0): 95 pruebas en 3.7 min (las 89 de la base y las 6 nuevas), sin fallos ni pruebas inestables; puertos 3400, 4400 y 4500 libres antes y después | — |
| ⚠ TASK-03 | | Capturas con A, B y C (`despues-task03` frente a un «antes» fresco sobre `6f39f22`, `antes-task03`; `comparar.mjs` y `transiciones.mjs`) | Admin (`/login`, `/` y `/temas`, 1440 y 375 px, A, B y C): iguales (18 de 18); la vista previa solo está en el diálogo de un tema propio, donde `--ws-store-bg` es su fondo principal y se ve igual. Tienda (13 tomas por tema): solo el lienzo; con B, `#f3f5f8 → #f9fafc` (2,19 M de 2,33 M px en el inicio a 1440 px) y píxeles que lo mezclan: la cabecera translúcida al 96 % (`#feffff → #ffffff` con B y C), su sombra de 1 px y el antialiasing sobre el lienzo. Buscador (inicio, catálogo y checkout a 1440 px; inicio, cajón y carrito a 375 px; A, B y C): interior idéntico, solo 1 nivel en las esquinas fuera de la píldora (AC-06). Zonas `surface-subtle` visibles, una a una con B: idénticas por dentro; la colección alternada del inicio (`#f6f8fa`) queda algo más oscura que el lienzo, como prevé el caso límite de la especificación. **Control** (`control-task03`, con `--ws-store-bg: var(--ws-bg) !important`): igual que `antes-task03` en las 57 tomas salvo ruido. `antes-task03` frente a las referencias del Traspaso (`antes/a`, `antes/c` y `despues-task02/b`): iguales salvo ruido | — |
| ⚠ TASK-03 | | Ruido nuevo y método | Fotos de producto también a 1440 px (`ficha` y `dialogo-ficha` en (179, 816)–(252, 864); `catalogo` en (779, 497)–(926, 680)), a 375 px en `catalogo` y `carrito`, y un nivel por canal en el inicio a 375 px con C. Los 327 px de la sombra sobre el diálogo a 375 px ((40, 282)–(331, 304)) que ⚠ TASK-02 atribuyó a `--ws-border-strong` también difieren entre `despues-task02/b` y `antes-task03/b`, dos tomas del mismo código: son ruido. Las secciones del inicio con animación de aparición salen vacías en las capturas de página completa, en todas las tomas. Detalle en `despues-task03/LEEME.md` | — |
| ⚠ TASK-03 | | Botón «Ver todos los productos» del cajón móvil | Fallo anterior a la feature, registrado como [PBI-0048](../../planning/backlog.md): con B, a 375 px y con la animación terminada, el texto es `rgb(30, 41, 59)` sobre `rgb(29, 78, 216)`, 2.18:1. Lo pisa `a { color: inherit; }` de `frontend/src/styles.css`, sin capa, que gana a `.text-on-primary` (capa `utilities`). No se corrige en esta feature | — |
| ⚠ TASK-03 | | Consola, datos y Prettier | Consola igual que la base (`NG0913`, `NG02955` y el `404` de `/favicon.ico`). Hash de `backend/data.json` del checkout principal igual (`f4480a1c…ae34e`); copia con B activo, sin temas propios y en la revisión 20; servidores detenidos (los `ng serve` que sobrevivieron se cerraron por PID). Prettier sobre los 8 archivos tocados, sin cambios | — |
| ⚠ TASK-04 | | Ejecución | Aprobada por Sebastián Avila el 2026-11-13 («Sí, apruébala», desde su sesión principal), con la corrección del botón relleno con C («Sí, corrígelo») y PBI-0049 en el mismo commit | Claude Code, `claude-opus-5-5`, sin delegar (el esfuerzo de la sesión no se pudo leer desde dentro; el catálogo pide `high`) |
| ⚠ TASK-04 | | Diff | `AgregarAlCarritoDialog` con «Seguir comprando» (`mat-button`) y «Ver carrito» (`mat-flat-button`, a `/carrito`), y `go()` solo con `'/carrito'`; «Confirmar pedido» en el carrito; título de la ruta `checkout` «WebStore \| Finalizar compra»; `h1` y botón del checkout «Finalizar compra», sin la etiqueta oculta `ws-eyebrow` y sin el `mt-2` del `h1`, que esa etiqueta anulaba con `margin-top: 0 !important` (el título no se mueve). `tokens.css`: `--mat-button-filled-container-color: var(--ws-primary)` y `--mat-button-filled-label-text-color: var(--ws-on-primary)` (ver la fila del botón con C). Búsqueda en `frontend/src`: ni «Continuar al checkout» ni `h1` «Checkout» ni `\| Checkout` | — |
| ⚠ TASK-04 | | Rojo de TEST-09 a TEST-11 y TEST-16, con el código sin cambiar (`npx playwright test` de `storefront-carrito`, `storefront-checkout`, `storefront-modo-demo` y `storefront-navegacion`, desde `frontend/`) | 9 fallos, todos por aserción o por no encontrar el control con el texto nuevo (el diálogo con tres botones, el título «WebStore \| Checkout», «Confirmar pedido» que todavía era «Continuar al checkout»); 17 pasan | — |
| ⚠ TASK-04 | | Verde de las cuatro specs | 26 de 26 en 1.0 min. TEST-09 desde la tarjeta y la ficha, con «Seguir comprando», Escape y «Ver carrito», y a 375 px sin desborde; TEST-10; TEST-11 con la compra de AC-11 (S/ 711.00, «Procesando…» con la respuesta retenida por `page.route`, «Mis pedidos» y el Admin) y el checkout vacío; TEST-16 a 1440 y 390 px | — |
| ⚠ TASK-04 | | Botón relleno con C | Fallo anterior a la tarea: con C, el `mat-flat-button` del diálogo salía `#1F2328` sobre `#1F2328` (1:1), porque `--mat-sys-primary` es `--ws-link` y `--mat-sys-on-primary` es `--ws-on-primary`, y con C valen lo mismo. Con «Ver carrito» como principal no se cumplía AC-01. Caso de C en TEST-09 (vista previa del modo demo): rojo por el fondo `rgb(31, 35, 40)` en lugar de `rgb(242, 183, 5)`; verde con los dos tokens, la spec del carrito 6 de 6. Contraste medido con `getComputedStyle` en A, B y C, a 1440 y 375 px, de «Ver carrito» y de «Confirmar pedido» (un `<a>`, sin el fallo de PBI-0048): 10.23, 6.70 y 8.69:1. `mat-flat-button` no se usa en ningún otro sitio de las dos apps | — |
| ⚠ TASK-04 | | `npm run verify` | Pasa (exit 0): TEST-07 («TEST-18 (a)», «(b)» y «(c)»), formato, lint, Sheriff, build de las dos apps, 29 pruebas de arquitectura, 83 del frontend, 118 del BFF y «Smoke test BFF: OK». La primera vuelta tras la corrección falló solo por el formato de Prettier en `storefront-carrito.spec.ts`, ya formateado | — |
| ⚠ TASK-04 | | `npm run test:e2e` completo | Pasa (exit 0): 100 pruebas en 3.9 min (las 95 de la fase 2 y las 5 nuevas), sin fallos ni pruebas inestables; puertos 3400, 4400 y 4500 libres antes y después | — |
| ⚠ TASK-04 | | Capturas con A, B y C (`despues-task04` frente a un «antes» fresco sobre `d7b2c1c`, `antes-task04`; `comparar.mjs` y `fuera-de-cajas.mjs`) | Admin: iguales (18 de 18). Tienda: catálogo, ficha, inicio y cajón móvil iguales salvo ruido; cambian solo el diálogo, el enlace del carrito y el `h1` y el botón del checkout, con 0 píxeles distintos fuera de sus cajas en los tres temas. A 375 px el diálogo pasa de dos filas de botones a una y no desborda. La corrección, aislada frente a la toma sin los tokens (`despues-task04-sin-correccion`): A y B iguales salvo ruido; con C solo cambia la caja de «Ver carrito». `antes-task04` frente a `despues-task03`: igual salvo ruido (barra del carrusel, sombra del diálogo y una sección del inicio con animación de aparición) | — |
| ⚠ TASK-04 | | Casillas del Admin con C (fuera de alcance) | Con C, la casilla marcada de «Página Contacto» en `/contenido` tiene el fondo y la marca en `rgb(31, 35, 40)` (1:1); con A, 10.23:1, y con B, 6.70:1. Misma causa que el botón. Registrado como [PBI-0049](../../planning/backlog.md), que se arregla junto a PBI-0048 después de la feature; no se corrige aquí | — |
| ⚠ TASK-04 | | Consola, datos y Prettier | Consola igual que la base. Hash de `backend/data.json` del checkout principal igual (`f4480a1c…ae34e`); copia con B activo, sin temas propios y en la revisión 50; servidores detenidos (los `ng serve` que sobrevivieron se cerraron por PID). Prettier sobre los 10 archivos de `frontend/` tocados, sin cambios | — |

## Consola de la base

Mensajes de la consola de la base `4677972` (`consola.json` de cada tema, 1440 y 375 px), identificados con CDP el 2026-11-13. Las comparaciones de ⚠ TASK-02 a ⚠ TASK-08 deben tratarlos como base, no como regresiones.

| Mensaje | Dónde | Causa |
|---|---|---|
| `404 Not Found` de `/favicon.ico` ([PBI-0046](../../planning/backlog.md)): `http://localhost:4400/favicon.ico` y `http://localhost:4500/favicon.ico` (tipo `Other`) | Una vez por ejecución del navegador: Chrome pide el icono en la primera página que abre y recuerda el 404. En las capturas salió con A (primer tema) en el diálogo de la tienda y en `/login` del Admin; en la comprobación con CDP, también con A (primer contexto). No depende del tema ni del diálogo | Ninguna de las dos apps tiene `favicon.ico` ni `<link rel="icon">`. Es la causa de [PBI-0046](../../planning/backlog.md) (404 en `/login` del Admin) y se repite en la tienda |
| `NG0913` (imagen `living-room-v2.jpg` con dimensiones intrínsecas mucho mayores que el tamaño pintado) | Ficha, 1440 y 375 px, con A, B y C; el diálogo a 375 px con B | Aviso de `NgOptimizedImage` |
| `NG02955` (imagen `soundbar-studio-480.jpg` es el LCP y no lleva `priority`) | Carrito, 375 px, con A, B y C | Aviso de `NgOptimizedImage` |

Fallos conocidos de la base que no son de esta feature: [PBI-0045](../../planning/backlog.md) (desborde de `/productos` del Admin a 375 px; no está entre las rutas capturadas) y [PBI-0046](../../planning/backlog.md).

## Estado de los controles

Pendiente de `sdd-verify`.

## Resultados de las pruebas

Pendiente de `sdd-verify`.

## Capturas antes y después

Pendiente de TASK-08 y `sdd-verify`. Las tomas «antes» están en `frontend/output/visual-qa/004-ajustes-de-la-tienda/antes/` (no se versionan). ⚠ TASK-02 comparó B en `despues-task02/` y `control-task02/`, con su `LEEME.md` y los recortes ampliados. ⚠ TASK-03 comparó A, B y C en `antes-task03/`, `despues-task03/` y `control-task03/`, con su `LEEME.md` y los recortes. ⚠ TASK-04 comparó A, B y C en `antes-task04/` y `despues-task04/` (con la toma previa a la corrección del botón en `despues-task04-sin-correccion/`), con su `LEEME.md`, los recortes y los de las casillas del Admin.

## Cumplimiento TDD

Pendiente de `sdd-verify`.

## Trazabilidad

Pendiente de `sdd-verify`.

## Definition of Done

Pendiente de `sdd-verify`.

## Riesgos remanentes y excepciones

- Pendiente de `sdd-verify`.

## Hito de entrega

pendiente
