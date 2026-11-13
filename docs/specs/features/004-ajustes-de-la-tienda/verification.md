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
| TASK-01 | (se rellena al cerrar la fase) | Ejecución | — | Claude Code, `claude-sonnet-5-5`, esfuerzo `medium`; sesión de bloque, sin delegar |
| TASK-01 | | `npm run verify` sobre la base `4677972` | Pasa (exit 0): sintaxis de 68 archivos, formato, lint, Sheriff y build de las dos apps; 29 pruebas de arquitectura, 83 del frontend, 110 del BFF, contrato «Smoke test BFF: OK» y estructura contractual OK | — |
| TASK-01 | | `npm run test:e2e` completo (línea base de caracterización) | Pasa (exit 0): 89 pruebas en 3.3 min, sin fallos ni pruebas inestables, sobre la base `4677972` y sin mis servidores levantados | — |
| TASK-01 | | Capturas «antes» con A, B y C | 19 por tema (tienda: diálogo sobre la ficha, inicio, catálogo, ficha, carrito y checkout a 1440 y 375 px, y cajón móvil a 375 px; Admin: `/login`, `/` y `/temas` a 1440 y 375 px); un producto en el carrito (`soundbar-cinema-500`); `superadmin` en el Admin; B activo al terminar. Método: Playwright con Chrome, páginas completas; guiones en `frontend/output/visual-qa/004-ajustes-de-la-tienda/guiones/`; capturas en `.../antes/{a,b,c}` con su `LEEME.md` | — |
| TASK-01 | | Ruido de rasterizado | Dos tomas del mismo árbol con B: 15 de 19 archivos idénticos; difieren 4 de la tienda a 375 px (`inicio` y `cajon-movil`: 3 a 6 px cerca de (173, 834); `ficha` y `dialogo-ficha`: unos 3 600 px en la caja (115, 562)–(188, 610)). Se tratan como ruido en las comparaciones | — |
| TASK-01 | | Consola de la base | Ver [Consola de la base](#consola-de-la-base) | — |
| TASK-01 | | Datos | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`); B activo en la copia (`activeThemeId: "b"`, `customThemes: []`); servidores detenidos (puertos 3400, 4400 y 4500 libres) | — |
| ⚠ TASK-02 | (se rellena al cerrar la fase) | Ejecución | Aprobada por Sebastián Avila el 2026-11-13 («Sí, apruébala», desde su sesión principal), anotando que el Admin no cambia con B | Claude Code, `claude-opus-5-5`, sin delegar (el esfuerzo de la sesión no se pudo leer desde dentro; el catálogo pide `high`) |
| ⚠ TASK-02 | | Rojo, antes del código (`node --test <archivo>` desde `backend/` o `frontend/`, y `node tests/integration/contrato.smoke.mjs`) | Todos por aserción, ninguno por sintaxis ni importación. TEST-01 y TEST-03 (`tema.rules.test.mjs`): 11 de 22 fallan (30 ≠ 31 tokens, 15 ≠ 20 pares, sin `--ws-store-bg`, casos de tokens, pares y `revisarContraste`). TEST-02 (`temas-predefinidos.test.mjs`): 4 de 13 (sin lienzo en A, B y C, `#8a96a8` ≠ `#8894a6`, predefinidos ≠ casos). TEST-04 (`temas.queries.test.mjs`): 1 de 12 (30 ≠ 31 declaraciones). TEST-05 (smoke): «/bff/appearance debe traer tokens["--ws-store-bg"] igual a #f9fafc con B». TEST-06 (`tema.rules.spec.mjs` del Admin): 8 de 28 (30 ≠ 31, 15 ≠ 20, casos) | — |
| ⚠ TASK-02 | | Verde | TEST-01 y TEST-03 22/22, TEST-02 13/13, TEST-04 12/12, TEST-05 «Smoke test BFF: OK», TEST-06 28/28; `npm test --prefix backend` 118/118 y `npm test --prefix frontend` 83/83. `casos-tema.json` con B 17.09, 6.11 y 3.07, A 3.43 y C 3.16 en `borderStrong/surface`, y el caso con la base de B con `'--ws-store-bg': '#F3F5F8'` | — |
| ⚠ TASK-02 | | `theme.css` servido con B | 31 declaraciones, `--ws-store-bg: #f9fafc` (línea 15) justo antes de `--ws-bg: #f3f5f8` (línea 16) y `--ws-border-strong: #8894a6`. `--ws-bg` y `colors.background` de A, B y C sin cambios; `INSUFFICIENT_THEME_CONTRAST` sigue con `contrast/background` y `contrast/surface`; diff sin cambios en `infrastructure/`, `customThemes` ni `schemaVersion` | — |
| ⚠ TASK-02 | | `npm run verify` | Pasa (exit 0): agentes, sintaxis, formato, lint, Sheriff, build de las dos apps (TEST-08), 29 pruebas de arquitectura, estructura con «TEST-18 (a): el tema B del BFF es igual a tokens.css» y «(b)» (TEST-07), suites y smoke | — |
| ⚠ TASK-02 | | `npm run test:e2e` completo (cierra la fase 1) | Pasa (exit 0): 89 pruebas en 3.7 min, sin fallos ni pruebas inestables; puertos 3400, 4400 y 4500 libres antes y después | — |
| ⚠ TASK-02 | | Capturas con B frente a TASK-01 (`despues-task02/b` y `comparar.mjs`) | Iguales (7): las seis del Admin y la ficha a 375 px. Solo bordes de `--ws-border-strong` (9): «Seguir comprando» (`ws-btn-secondary`) en carrito y checkout a 1440 y 375 px, botón secundario en la ficha y en el diálogo a 1440 px, contornos de los filtros del catálogo a 1440 px, punto de «sin stock» del catálogo a 375 px y 327 px de la sombra sobre el diálogo a 375 px (un nivel en un canal). Ruido (3): inicio y cajón a 375 px en la caja conocida y la barra del carrusel del inicio a 1440 px. **Control** (`control-task02/b`, la misma toma con `--ws-border-strong: #8a96a8 !important` inyectado): iguales salvo las cajas de ruido, así que todo cambio sale de ese token y el lienzo no cambia | — |
| ⚠ TASK-02 | | Hallazgo: el Admin no cambia con B | La fila del Admin de [capturas antes y después](planning.md#capturas-antes-y-después) del plan no se cumple: en el Admin, `--ws-border-strong` solo llega por `--mat-sys-outline`, y ninguna pantalla capturada (`/login`, `/` y `/temas`) tiene un control que lo use; ningún campo del Admin usa `appearance="outline"` ni `line-strong` (comprobado en el código por la sesión principal). ⚠ TASK-08 espera «Iguales» en el Admin con B, salvo el fondo de la vista previa de Temas, que cambia ⚠ TASK-03 | — |
| ⚠ TASK-02 | | Ruido nuevo | `tienda-inicio-1440`: 3 a 6 px en torno a (1231, 632), la barra de progreso animada del carrusel; su ancho depende del instante de la toma y difiere también en el control. No cuenta como cambio | — |
| ⚠ TASK-02 | | Consola, datos y Prettier | Consola igual que la base (`NG0913`, `NG02955` y el `404` de `/favicon.ico`, una vez por ejecución). Hash de `backend/data.json` del checkout principal igual (`f4480a1c…ae34e`); copia con B activo, sin temas propios y en la revisión 8; servidores detenidos (dos `ng serve` sobrevivieron y se cerraron por PID). Prettier sobre los 12 archivos de código tocados | — |

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

Pendiente de TASK-08 y `sdd-verify`. Las tomas «antes» están en `frontend/output/visual-qa/004-ajustes-de-la-tienda/antes/` (no se versionan). ⚠ TASK-02 comparó B en `despues-task02/` y `control-task02/`, con su `LEEME.md` y los recortes ampliados.

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
