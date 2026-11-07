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
| TASK-01 | `9597b75` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-01 | | Rojo de TEST-01 | `node --test …/resumen.rules.spec.mjs`: falla con `AssertionError` (la función aún devolvía `{anio: 0, mes: 0, dia: 0}`; se esperaba 31/10/2026) | |
| TASK-01 | | Verde de TEST-01 | Mismo comando: `pass 1`, `fail 0`. `2026-11-01T03:00:00Z` → 31/10/2026; `05:00:00Z` → 01/11/2026; `2027-01-01T04:59:59Z` → 31/12/2026. También en verde con `TZ=Asia/Tokyo` | |
| TASK-01 | | `npm run verify` | Código de salida 0: `check:agents`, sintaxis, formato, lint, arquitectura (22 pass), build de Storefront y Admin, unitarias (frontend 9 pass, backend 3 pass), estructura y smoke del contrato | |
| TASK-01 | | Prettier | `prettier --write` sobre `resumen.model.ts`, `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-02 | `3a66a43` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-02 | | Rojo de TEST-02 | `node --test …/resumen.rules.spec.mjs`: `pass 1`, `fail 1`; falla con `AssertionError` (el stub devolvía tramos en 0; se esperaba 1–15/11 contra 1–15/10) | |
| TASK-02 | | Verde de TEST-02 | Mismo comando: `pass 2`, `fail 0`. Cinco casos: 15/11 contra 1–15/10; 31/03/2026 contra 1–28/02; 31/03/2028 contra 1–29/02; 15/01 contra 1–15/12 del año anterior; día 1 contra solo el día 1 | |
| TASK-02 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 10 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-02 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-03 | `0425f5b` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-03 | | Rojo de TEST-05 (clientes nuevos) | `node --test …/resumen.rules.spec.mjs`: `pass 2`, `fail 1`; falla con `AssertionError` (el stub devolvía un mapa vacío; se esperaban ana, luis y rosa) | |
| TASK-03 | | Verde de TEST-05 (clientes nuevos) | Mismo comando: `pass 3`, `fail 0`. Primer pedido por correo con mayúsculas y espacios (ana, con el arreglo desordenado), pedidos siguientes sin contar, 23:30 de Lima (luis: 9/11 y no 10/11), primer pedido cancelado que cuenta (rosa) y cliente sin pedidos ausente. La prueba ordena las entradas por correo para no depender del orden del mapa | |
| TASK-03 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 11 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-03 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-04 | `77a177f` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-04 | | Rojo de TEST-03, TEST-04 y TEST-05 (variación) | `node --test …/resumen.rules.spec.mjs`: `pass 3`, `fail 4`; las cuatro pruebas nuevas fallan con `AssertionError` (stubs: variación 999 y totales en 0) | |
| TASK-04 | | Verde de TEST-03, TEST-04 y TEST-05 (variación) | Mismo comando: `pass 7`, `fail 0`. Totales: 4 pedidos con el cancelado, ventas 170.35 sin cancelados y redondeadas, 4 clientes con uno sin pedidos. Variación: subida (+50), bajada (−75), igual (0), −100, `null` con anterior 0 (nunca Infinity ni NaN), `0` y no `-0`; ventas del tramo sin cancelados (+150); clientes nuevos −50 con luis contra ana y bea; estado vacío con todo en 0 y `null` | |
| TASK-04 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 15 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-04 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs`; refactor con las pruebas en verde (`sumarVentas` compartida) | |
| TASK-05 | `b0c6b0c` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-05 | | Rojo de TEST-06 | `node --test …/resumen.rules.spec.mjs`: `pass 7`, `fail 2`; las dos pruebas nuevas fallan con `AssertionError` (el stub devolvía `[]`). Un primer rojo por `ReferenceError` (import del spec sin actualizar) se descartó y se repitió con el stub | |
| TASK-05 | | Verde de TEST-06 | Mismo comando: `pass 9`, `fail 0`. 30 días en noviembre de 2026, 28 en febrero de 2026, 29 en febrero de 2028 y 31 en diciembre de 2026; pedidos y clientes nuevos por día de Lima (00:00 y 23:30 de Lima, 03:00 Z del 01/11 cuenta como 31/10); pedidos de otros meses ignorados; sin pedidos, todo en 0 | |
| TASK-05 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 17 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-05 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-06 | `da17596` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-06 | | Rojo de TEST-07 y TEST-08 | `node --test …/resumen.rules.spec.mjs`: `pass 9`, `fail 2`; las dos pruebas nuevas fallan con `AssertionError` (stubs que devolvían `[]`) | |
| TASK-06 | | Verde de TEST-07 y TEST-08 | Mismo comando: `pass 11`, `fail 0`. TEST-07: top 5 de mayor a menor con cancelados, empate por nombre (Miraflores antes que Surco; Barranco antes que San Isidro), «miraflores» = «Miraflores» (se muestra la primera forma), menos de 5 y vacío. TEST-08: 5 más recientes con el arreglo desordenado, sin reordenar la entrada, con menos de 5 y vacío | |
| TASK-06 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 19 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-06 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs` | |
| TASK-07 | `1af854d` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo alto (nivel estándar · alto del catálogo) |
| TASK-07 | | Rojo de TEST-09 | `node --test …/resumen.rules.spec.mjs`: `pass 11`, `fail 3`; las tres pruebas nuevas fallan con `AssertionError` (stub con −1). Un primer intento falló por `SyntaxError` (Prettier partió el `import type` de seis nombres y el spec borró solo la primera línea): se corrigió con `// prettier-ignore` y se repitió el rojo | |
| TASK-07 | | Verde de TEST-09 | Mismo comando: `pass 14`, `fail 0`. Agrupación D8 (20/60/20); 1/1/1 → 34/33/33 (redondear daría 99); 1/1/4 → 17/17/66 y 2/5/5 → 17/42/41 (redondear daría 101); 1/3/3 → 14/43/43 (el resto mayor está en los dos últimos); 0/0/100; sin pedidos → 0/0/0 | |
| TASK-07 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 22 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-07 | | E2E completo (cierre de fase 1) | `npm run test:e2e` desde `frontend/`, en segundo plano, con sus puertos (BFF 3400, Storefront 4400, Admin 4500): `31 passed (1.3m)`, código de salida 0. Chromium headless de Playwright; sin tocar `backend/data.json` ni los servidores del checkout principal | |
| TASK-07 | | Prettier | `prettier --write` sobre `resumen.rules.ts` y `resumen.rules.spec.mjs`; refactor con las pruebas en verde (`grupoDelEstado`) | |
| TASK-07 | | Traspaso e índice | Traspaso de `tasks.md` actualizado para el bloque 2 en este commit; fila de la feature en el índice en `en implementación`. Los SHA de la fase se rellenan en el commit `docs` de cierre | |
| TASK-08 | | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo medio (nivel estándar · medio del catálogo) |
| TASK-08 | | Permiso y servidores | La persona autorizó en esta sesión detener los servidores del checkout principal (BFF 3000, Storefront 4200, Admin 4300; comprobados por su línea de comandos antes de detenerlos). Los del worktree: BFF con `WEBSTORE_DATA_FILE` y Admin con `preview_start`. No se vuelven a levantar los del checkout principal | |
| TASK-08 | | Copias | `backend/data-vacio.json`: seed recién creado, 0 pedidos. `backend/data-capturas.json`: seed más 9 pedidos creados con `POST /bff/checkout/orders`, estados asignados con `PUT /bff/admin/snapshot` (lo que usa Pedidos) y `createdAt` repartidos con un script de un solo uso en el directorio temporal, con el BFF detenido. Ambas ignoradas por git; `backend/data.json` no existe en el worktree y no se tocó. Los scripts de creación y de captura están en la carpeta de notas de la sesión | |
| TASK-08 | | Datos de `data-capturas.json` | 9 pedidos, 7 clientes (6 con pedidos más `cliente@example.com` del seed, sin pedidos), 4 distritos. Hora de Lima: 03/10 (ana, Miraflores, entregado), 05/10 (eva, Lince, cancelado), 12/10 (frank, Miraflores, entregado), 28/10 (ana, Surco, cancelado), 02/11 (ana, Miraflores, entregado), 03/11 (bruno, Surco, entregado), 04/11 23:30 (carla, San Isidro, en preparación; es el 05/11 04:30 Z), 05/11 (`ANA@…` en mayúsculas, Miraflores, enviado), 06/11 (diego, Surco, confirmado). Totales: 699 + envío para el producto p-004 y 1,499 + envío para p-005 | |
| TASK-08 | | Valores esperados (hoy 07/11/2026, contados a mano) | Tramos: 1–7/11 contra 1–7/10. **Total de pedidos 9**, variación +150 % (5 contra 2). **Total de ventas S/ 7,385.00** (sin los dos cancelados), variación +626 % (5,163 contra 711; 4,452/711 = 6.26). **Total de clientes 7**, variación +50 % (nuevos: bruno, carla y diego = 3 contra ana y eva = 2). **Stock bajo 3** (Refrigeradora, Monitor, Microondas). **Estados 45 % / 33 % / 22 %** (4 entregados, 3 en proceso —confirmado, en preparación y enviado—, 2 cancelados; 44,4 / 33,3 / 22,2 con el mayor resto en completados). Distritos: Miraflores 4, Surco 3, San Isidro 1, Lince 1 (empate por nombre) | |
| TASK-08 | | Capturas de antes | 07/11/2026 ~18:27 (Lima), Chrome headless por CDP con perfil temporal y un script de un solo uso. Carpeta `frontend/output/visual-qa/001-reorganizar-resumen-del-admin/antes` (no versionada): `resumen-superadmin` y `resumen-vendedor` a 1440 y 375 px, `pedidos-superadmin` a 1440 y 375 px, `resumen-superadmin-vacio` a 1440 px. Sin desborde horizontal (`scrollWidth` = ancho) y consola sin errores en las siete | |
| TASK-08 | | Prettier y verify | No hay archivos versionados de código tocados; `npm run verify` se ejecuta en TASK-09 | |
| TASK-09 | | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo medio (nivel ligero · medio del catálogo) |
| TASK-09 | | Diff | Solo mueve la constante: `STATUS_LABELS` sale de `pedidos.page.ts` y entra en `tienda.model.ts` como `ETIQUETAS_ESTADO_PEDIDO` (`Readonly<Record<EstadoPedido, string>>`, mismas cinco etiquetas y mismo orden); `pedidos.page.ts` la importa en sus dos usos. Plantilla y estilos sin cambios (por eso sin capturas) | |
| TASK-09 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 22 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-09 | | Prettier | `prettier --write` sobre `tienda.model.ts` y `pedidos.page.ts`: sin cambios | |
