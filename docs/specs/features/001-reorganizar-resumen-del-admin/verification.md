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
| TASK-04 | (se rellena al cerrar la fase) | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-04 | | Rojo de TEST-03, TEST-04 y TEST-05 (variación) | `node --test …/resumen.rules.spec.mjs`: `pass 3`, `fail 4`; las cuatro pruebas nuevas fallan con `AssertionError` (stubs: variación 999 y totales en 0) | |
| TASK-04 | | Verde de TEST-03, TEST-04 y TEST-05 (variación) | Mismo comando: `pass 7`, `fail 0`. Totales: 4 pedidos con el cancelado, ventas 170.35 sin cancelados y redondeadas, 4 clientes con uno sin pedidos. Variación: subida (+50), bajada (−75), igual (0), −100, `null` con anterior 0 (nunca Infinity ni NaN), `0` y no `-0`; ventas del tramo sin cancelados (+150); clientes nuevos −50 con luis contra ana y bea; estado vacío con todo en 0 y `null` | |
| TASK-04 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 15 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-04 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs`; refactor con las pruebas en verde (`sumarVentas` compartida) | |
| TASK-05 | (se rellena al cerrar la fase) | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-05 | | Rojo de TEST-06 | `node --test …/resumen.rules.spec.mjs`: `pass 7`, `fail 2`; las dos pruebas nuevas fallan con `AssertionError` (el stub devolvía `[]`). Un primer rojo por `ReferenceError` (import del spec sin actualizar) se descartó y se repitió con el stub | |
| TASK-05 | | Verde de TEST-06 | Mismo comando: `pass 9`, `fail 0`. 30 días en noviembre de 2026, 28 en febrero de 2026, 29 en febrero de 2028 y 31 en diciembre de 2026; pedidos y clientes nuevos por día de Lima (00:00 y 23:30 de Lima, 03:00 Z del 01/11 cuenta como 31/10); pedidos de otros meses ignorados; sin pedidos, todo en 0 | |
| TASK-05 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 17 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-05 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-06 | (se rellena al cerrar la fase) | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-06 | | Rojo de TEST-07 y TEST-08 | `node --test …/resumen.rules.spec.mjs`: `pass 9`, `fail 2`; las dos pruebas nuevas fallan con `AssertionError` (stubs que devolvían `[]`) | |
| TASK-06 | | Verde de TEST-07 y TEST-08 | Mismo comando: `pass 11`, `fail 0`. TEST-07: top 5 de mayor a menor con cancelados, empate por nombre (Miraflores antes que Surco; Barranco antes que San Isidro), «miraflores» = «Miraflores» (se muestra la primera forma), menos de 5 y vacío. TEST-08: 5 más recientes con el arreglo desordenado, sin reordenar la entrada, con menos de 5 y vacío | |
| TASK-06 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 19 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-06 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
