# 001. Reorganizar el Resumen del Admin — Verificación

- Feature: `001-reorganizar-resumen-del-admin`
- Tareas: [tasks.md](tasks.md)

<!-- Durante la implementación solo se llena «Ejecución por tarea». El resto del documento lo completa sdd-verify a partir de estas filas. -->

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/001-reorganizar-resumen-del-admin` (pendiente de `sdd-verify`) |
| Fecha | Pendiente de `sdd-verify` |
| Entorno | Windows 10 Pro, Node v24.20.0, npm 11.19.0 (bloque 1, sin navegador ni e2e hasta TASK-07) |
| Datos | El bloque 1 no usa archivo de estado: las reglas puras de `domain/` no leen el BFF |

## Ejecución por tarea

Cada tarea añade aquí una fila breve en su mismo commit ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Una línea por control; la primera dice con qué se ejecutó. El SHA se rellena en un commit `docs` al cerrar la fase.

| Tarea | Commit | Control | Resultado | Ejecutado con |
|---|---|---|---|---|
| TASK-01 | (se rellena al cerrar la fase) | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-01 | | Rojo de TEST-01 | `node --test …/resumen.rules.spec.mjs`: falla con `AssertionError` (la función aún devolvía `{anio: 0, mes: 0, dia: 0}`; se esperaba 31/10/2026) | |
| TASK-01 | | Verde de TEST-01 | Mismo comando: `pass 1`, `fail 0`. `2026-11-01T03:00:00Z` → 31/10/2026; `05:00:00Z` → 01/11/2026; `2027-01-01T04:59:59Z` → 31/12/2026. También en verde con `TZ=Asia/Tokyo` | |
| TASK-01 | | `npm run verify` | Código de salida 0: `check:agents`, sintaxis, formato, lint, arquitectura (22 pass), build de Storefront y Admin, unitarias (frontend 9 pass, backend 3 pass), estructura y smoke del contrato | |
| TASK-01 | | Prettier | `prettier --write` sobre `resumen.model.ts`, `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-02 | (se rellena al cerrar la fase) | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-02 | | Rojo de TEST-02 | `node --test …/resumen.rules.spec.mjs`: `pass 1`, `fail 1`; falla con `AssertionError` (el stub devolvía tramos en 0; se esperaba 1–15/11 contra 1–15/10) | |
| TASK-02 | | Verde de TEST-02 | Mismo comando: `pass 2`, `fail 0`. Cinco casos: 15/11 contra 1–15/10; 31/03/2026 contra 1–28/02; 31/03/2028 contra 1–29/02; 15/01 contra 1–15/12 del año anterior; día 1 contra solo el día 1 | |
| TASK-02 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 10 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-02 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-03 | (se rellena al cerrar la fase) | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-03 | | Rojo de TEST-05 (clientes nuevos) | `node --test …/resumen.rules.spec.mjs`: `pass 2`, `fail 1`; falla con `AssertionError` (el stub devolvía un mapa vacío; se esperaban ana, luis y rosa) | |
| TASK-03 | | Verde de TEST-05 (clientes nuevos) | Mismo comando: `pass 3`, `fail 0`. Primer pedido por correo con mayúsculas y espacios (ana, con el arreglo desordenado), pedidos siguientes sin contar, 23:30 de Lima (luis: 9/11 y no 10/11), primer pedido cancelado que cuenta (rosa) y cliente sin pedidos ausente. La prueba ordena las entradas por correo para no depender del orden del mapa | |
| TASK-03 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 11 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-03 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
