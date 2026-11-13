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

Pendiente de TASK-08 y `sdd-verify`. Las tomas «antes» están en `frontend/output/visual-qa/004-ajustes-de-la-tienda/antes/` (no se versionan).

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
