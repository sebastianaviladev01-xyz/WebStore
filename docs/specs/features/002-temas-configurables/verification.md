# 002. Temas configurables — Verificación

- Feature: `002-temas-configurables`
- Tareas: [tasks.md](tasks.md)

<!-- Durante la implementación solo se rellena «Ejecución por tarea». sdd-verify completa el resto. Nunca registres como ejecutado algo que no se ejecutó. -->

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/002-temas-configurables`, desde `origin/dev` (`dec89f3`) |
| Fecha | 2026-11-11 |
| Entorno | Windows 10 Pro 10.0.19045, Node v24.20.0, npm 11.19.0; Google Chrome instalado (headless, con Playwright `channel: 'chrome'`) para las capturas |
| Datos | Capturas: copia `backend/data-capturas.json` (semilla) y `backend/data-migracion-v2.json` (estado v2 con colores propios, usado solo a través de copias de trabajo). Pruebas del BFF: archivos temporales. Nunca `backend/data.json` |

## Ejecución por tarea

Cada tarea añade aquí una fila breve en su mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Una línea por control. La primera línea de cada tarea dice con qué se ejecutó. El SHA se rellena en un commit `docs` al cerrar la fase.

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | | Ejecución | Capturas y FCP tomados por un agente delegado; el agente principal revisó la carpeta, la consola, las capturas y los puertos | Claude Code, Sonnet 5.5 (`claude-sonnet-5-5`), esfuerzo medio, delegada; revisión: Opus 5.5, esfuerzo alto |
| TASK-01 | | Capturas «antes» de B (TEST-23, toma «antes») | 20 capturas en `frontend/output/visual-qa/002-temas-configurables/antes/`, sobre `dec89f3` (solo documentación desde `0dcc4e2`). Tienda: `/`, `/catalogo`, `/catalogo/oled-vision-55-4k`, `/carrito` (1 unidad de `p-001`), `/checkout`. Admin: `/login` y, con la sesión del `superadmin` sembrado, `/`, `/productos`, `/pedidos` y `/contenido`. 1440×1200 y 390×844, página completa. BFF 3400, tienda 4400 y Admin 4500 con `proxy.e2e.conf.json`, sobre `backend/data-capturas.json`. Método reproducible: `capturar.mjs` (Playwright con el Chrome instalado), en la misma carpeta, con su `LEEME.md` | ídem |
| TASK-01 | | Copia v2 (AC-23, toma «antes») | `backend/data-migracion-v2.json`: semilla con `PUT /bff/admin/snapshot` de `primaryColor` `#0F766E` y `secondaryColor` `#7C2D12` (`schemaVersion` 2; sha256 `8dd280d2…57ea5ee`). Captura de `/` de la tienda a 1440 y 390 px con una copia de trabajo, en `.../antes-migracion-v2/`; la tienda se ve con el principal `#0F766E`. La copia de trabajo se borró al terminar | ídem |
| TASK-01 | | FCP de `/` en frío (TEST-24 (b), toma «antes») | 5 cargas, cada una en un contexto nuevo, 1440×1200, servidor de desarrollo: 928, 532, 552, 504 y 500 ms; **mediana 532 ms** (`medir-fcp.mjs`, `antes/fcp-antes.json`). La primera carga incluye el calentamiento del servidor | ídem |
| TASK-01 | | Consola | Sin `pageerror`. Mensajes previos a la feature, que la toma «después» debe repetir igual: un 404 de recurso, previsiblemente `/favicon.ico` (los `index.html` no declaran icono y `public/` está vacía), en la tienda y en el acceso al Admin a 1440; `NG0913` (imagen sobredimensionada) en la ficha; `NG02955` (LCP sin `priority`) en `/carrito` a 390. Detalle en `antes/consola.json` | ídem |
| TASK-01 | | Datos y servidores | sha256 de `backend/data.json` del checkout principal igual antes y después (`4095284…e9345f`); el worktree no tiene `backend/data.json`. Puertos 3400, 4400 y 4500 libres al terminar. La demo del equipo (3000, 4200 y 4300) no se tocó | ídem |
