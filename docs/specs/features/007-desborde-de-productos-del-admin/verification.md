# 007. Desborde de productos del Admin — Verificación

- Feature: `007-desborde-de-productos-del-admin`
- Tareas: [tasks.md](tasks.md)

Documento creado por TASK-01 desde la [plantilla](../../templates/verification-template.md). Cada tarea rellena su fila de ejecución; `sdd-verify` completa las demás secciones.

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/007-desborde-de-productos-del-admin`, local y sin push, en el worktree `.worktrees/007-desborde-de-productos-del-admin`. Base de la implementación: `616d473` («docs: aprobar las tareas del desborde de productos del Admin») |
| Fecha | 2026-11-14 |
| Entorno | Windows 10 Pro 10.0.19045, Node v24.20.0, npm 11.19.0 (leídas con `node --version` y `npm --version`); Google Chrome instalado (headless, con Playwright `channel: 'chrome'`) para las capturas y el e2e |
| Datos | Capturas: copia `backend/data-capturas.json` del worktree (creada por el BFF desde el seed, ignorada por git), con el BFF del worktree en 3400 sin modo demo. E2E: archivo temporal de Playwright. Nunca `backend/data.json`: su sha256 en el checkout principal es `f4480a1c…ae34e` antes y después de cada tarea con servidores; el worktree no tiene `backend/data.json` |

## Ejecución por tarea

Durante la implementación, cada tarea añade aquí una fila breve en su mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Una línea por control. La primera línea de cada tarea dice con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada. El SHA se rellena en un commit `docs` al cerrar la fase. `sdd-verify` completa el resto del documento a partir de estas filas.

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | | Ejecución | — | Claude Code, `claude-opus-5-5`, sin delegar (el catálogo pide estándar · medio, `claude-sonnet-5-5`, `medium`; lo hizo el agente principal del bloque, que trabaja en avanzado: la tarea es sobre todo entorno, servidores y el guion, y se revisa en la misma sesión). El esfuerzo de la sesión no se puede leer desde dentro; el tope es `high` |
| TASK-01 | | Worktree | Con el árbol limpio, el checkout principal pasó de la rama de la feature a `dev` (`ffc2d57`, al día con `origin/dev`); `git worktree add .worktrees/007-desborde-de-productos-del-admin feature/007-desborde-de-productos-del-admin` sobre `616d473`, y `npm run setup` en él (exit 0; npm avisa de que no ejecuta los scripts de instalación de `esbuild`, `lmdb` y `msgpackr-extract` sin aprobarlos, sin efecto en el build ni en el e2e). El worktree `.worktrees/avisar-coautoria` no se tocó | — |
| TASK-01 | | Capturas «antes» con A, B y C | 4 por tema, 12 en total, en `frontend/output/visual-qa/007-desborde-de-productos-del-admin/antes/{a,b,c}/`: `/productos` al entrar («Nuevo producto») y editando «OLED Vision 55” 4K» sin guardar, a 1440 × 900 y 375 × 812 px, página completa. Método: guion `capturas.mjs` (Playwright con el Chrome instalado, `reducedMotion: 'reduce'`, sesión de `superadmin`, temas por la API en el orden A, B y C y B al terminar), con el BFF en 3400 sin modo demo sobre `backend/data-capturas.json` y el Admin en 4500 con `proxy.e2e.conf.json`. `LEEME.md` con el SHA base, las rutas, los estados, los anchos, los temas, el método, los datos y la fecha. A 375 px las capturas miden 376 px de ancho y muestran el defecto: la columna «Producto» sin ancho, el SKU partido sobre el precio y la galería fuera de la tarjeta | — |
| TASK-01 | | Ruido de rasterizado | Segunda toma con A, B y C (`control-ruido/`) y `comparar.mjs antes control-ruido`: 9 de 12 iguales. Difieren, en 1 a 5 niveles por canal, solo en la miniatura de la foto de la galería: `productos-editar-1440.png` con A, B y C (caja x 1031–1133, y 857–925) y `productos-editar-375.png` con A (x 63–147, y 2363–2419). Se tratan como ruido al comparar | — |
| TASK-01 | | Consola de la base | `antes/consola-abc.json`: solo mensajes de desarrollo (`[vite] connecting…`, `[vite] connected.`, «Angular is running in development mode.») y un `404` de `/favicon.ico` en la primera carga de la ejecución (A, 1440 px). Ningún error de la aplicación | — |
| TASK-01 | | `npm run verify` sobre la base `616d473`, con los servidores detenidos | Pasa (exit 0, 78 s): agentes, sintaxis de 68 archivos, formato, lint y Sheriff, 29 pruebas de arquitectura, TEST-18 (a), (b) y (c), 84 del frontend, 131 del BFF, build de las dos apps y «Smoke test BFF: OK» | — |
| TASK-01 | | `npm run test:e2e` completo (línea base de caracterización) | Pasa (exit 0): 121 pruebas en 4.7 min, sin fallos ni pruebas inestables, con los puertos 3400, 4400 y 4500 libres antes | — |
| TASK-01 | | Datos y servidores | Hash de `backend/data.json` del checkout principal igual antes y después (`f4480a1c…ae34e`). Copia con B activo (`appearance.activeThemeId: "b"`, revisión 10), sin temas propios y `schemaVersion` 3; ningún producto guardado ni borrado. Servidores detenidos antes de `verify` y del e2e; puertos 3000, 3400, 4200, 4300, 4400 y 4500 libres al terminar | — |

## Estado de los controles

Lo completa `sdd-verify`.

## Resultados de las pruebas

Lo completa `sdd-verify`.

## Capturas antes y después

Lo completa `sdd-verify`.

## Cumplimiento TDD

Lo completa `sdd-verify`.

## Trazabilidad

Lo completa `sdd-verify`.

## Definition of Done

Lo completa `sdd-verify`.

## Riesgos remanentes y excepciones

Lo completa `sdd-verify`.

## Hito de entrega

pendiente
