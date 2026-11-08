# 001. Reorganizar el Resumen del Admin — Verificación

- Feature: `001-reorganizar-resumen-del-admin`
- Tareas: [tasks.md](tasks.md)

<!-- Durante la implementación solo se llena «Ejecución por tarea». El resto del documento lo completa sdd-verify a partir de estas filas. -->

## Revisión

| Dato | Valor |
|---|---|
| Rama y commit | `feature/001-reorganizar-resumen-del-admin`, punta verificada `f9598f3` (ejecutada como `a26a7df`, con el mismo árbol; ver [Riesgos remanentes y excepciones](#riesgos-remanentes-y-excepciones)), base `origin/dev` `8cacac1`. Los commits de esta verificación solo tocan documentación |
| Fecha | 2026-11-07 (`sdd-verify`, ~19:15–19:45 de Lima) |
| Entorno | Windows 10 Pro 10.0.19045, Node v24.20.0, npm 11.19.0 (`node --version` y `npm --version`). E2E con Google Chrome (`channel: 'chrome'`, headless) de Playwright; capturas con Chrome 156 headless por CDP |
| Datos | E2E: archivo temporal propio de Playwright (`webstore-e2e-<marca>.json` en el directorio temporal). Capturas: copias `backend/data-capturas.json` y `backend/data-vacio.json` del worktree con `WEBSTORE_DATA_FILE` (ignoradas por git). `backend/data.json` no existe en el worktree y el del checkout principal no se tocó |
| Ejecutado con | `sdd-verify`: Claude Code (app de escritorio), `claude-opus-5-5`, agente principal (nivel avanzado), sin delegar. El esfuerzo de la sesión lo fija la persona y no se puede leer desde la sesión |

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
| TASK-08 | `7a3cf8b` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo medio (nivel estándar · medio del catálogo) |
| TASK-08 | | Permiso y servidores | La persona autorizó en esta sesión detener los servidores del checkout principal (BFF 3000, Storefront 4200, Admin 4300; comprobados por su línea de comandos antes de detenerlos). Los del worktree: BFF con `WEBSTORE_DATA_FILE` y Admin con `preview_start`. No se vuelven a levantar los del checkout principal | |
| TASK-08 | | Copias | `backend/data-vacio.json`: seed recién creado, 0 pedidos. `backend/data-capturas.json`: seed más 9 pedidos creados con `POST /bff/checkout/orders`, estados asignados con `PUT /bff/admin/snapshot` (lo que usa Pedidos) y `createdAt` repartidos con un script de un solo uso en el directorio temporal, con el BFF detenido. Ambas ignoradas por git; `backend/data.json` no existe en el worktree y no se tocó. Los scripts de creación y de captura están en la carpeta de notas de la sesión | |
| TASK-08 | | Datos de `data-capturas.json` | 9 pedidos, 7 clientes (6 con pedidos más `cliente@example.com` del seed, sin pedidos), 4 distritos. Hora de Lima: 03/10 (ana, Miraflores, entregado), 05/10 (eva, Lince, cancelado), 12/10 (frank, Miraflores, entregado), 28/10 (ana, Surco, cancelado), 02/11 (ana, Miraflores, entregado), 03/11 (bruno, Surco, entregado), 04/11 23:30 (carla, San Isidro, en preparación; es el 05/11 04:30 Z), 05/11 (`ANA@…` en mayúsculas, Miraflores, enviado), 06/11 (diego, Surco, confirmado). Totales: 699 + envío para el producto p-004 y 1,499 + envío para p-005 | |
| TASK-08 | | Valores esperados (hoy 07/11/2026, contados a mano) | Tramos: 1–7/11 contra 1–7/10. **Total de pedidos 9**, variación +150 % (5 contra 2). **Total de ventas S/ 7,385.00** (sin los dos cancelados), variación +626 % (5,163 contra 711; 4,452/711 = 6.26). **Total de clientes 7**, variación +50 % (nuevos: bruno, carla y diego = 3 contra ana y eva = 2). **Stock bajo 3** (Refrigeradora, Monitor, Microondas). **Estados 45 % / 33 % / 22 %** (4 entregados, 3 en proceso —confirmado, en preparación y enviado—, 2 cancelados; 44,4 / 33,3 / 22,2 con el mayor resto en completados). Distritos: Miraflores 4, Surco 3, San Isidro 1, Lince 1 (empate por nombre) | |
| TASK-08 | | Capturas de antes | 07/11/2026 ~18:27 (Lima), Chrome headless por CDP con perfil temporal y un script de un solo uso. Carpeta `frontend/output/visual-qa/001-reorganizar-resumen-del-admin/antes` (no versionada): `resumen-superadmin` y `resumen-vendedor` a 1440 y 375 px, `pedidos-superadmin` a 1440 y 375 px, `resumen-superadmin-vacio` a 1440 px. Sin desborde horizontal (`scrollWidth` = ancho) y consola sin errores en las siete | |
| TASK-08 | | Prettier y verify | No hay archivos versionados de código tocados; `npm run verify` se ejecuta en TASK-09 | |
| TASK-09 | `85408f4` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo medio (nivel ligero · medio del catálogo) |
| TASK-09 | | Diff | Solo mueve la constante: `STATUS_LABELS` sale de `pedidos.page.ts` y entra en `tienda.model.ts` como `ETIQUETAS_ESTADO_PEDIDO` (`Readonly<Record<EstadoPedido, string>>`, mismas cinco etiquetas y mismo orden); `pedidos.page.ts` la importa en sus dos usos. Plantilla y estilos sin cambios (por eso sin capturas) | |
| TASK-09 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 22 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-09 | | Prettier | `prettier --write` sobre `tienda.model.ts` y `pedidos.page.ts`: sin cambios | |
| TASK-10 | `33f8060` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo medio (nivel estándar · medio del catálogo) |
| TASK-10 | | Diff | Solo añade pasos en `storefront-checkout.spec.ts`, tras la comprobación de Pedidos: sin parámetro, el detalle (`h2` del `main`) es el pedido recién creado y el panel muestra su correo. No cambia ni quita aserciones. Un primer intento falló por un selector ambiguo (`complementary` resolvía a dos elementos: la barra lateral y el detalle); se acotó a `main` | |
| TASK-10 | | TEST-10 en verde antes de TASK-11 | `npm run test:e2e -- storefront-checkout` desde `frontend/`: `1 passed (28.1s)`, código de salida 0, sobre la página de Pedidos sin tocar (todavía sin `?pedido=`) | |
| TASK-10 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 22 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-10 | | Prettier | `prettier --write` sobre `storefront-checkout.spec.ts`: sin cambios | |
| TASK-11 | `be409f5` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo medio (nivel estándar · medio del catálogo) |
| TASK-11 | | Rojo de TEST-11 (Pedidos) | `npm run test:e2e -- storefront-checkout`: `1 failed` en la aserción `?pedido=<id>` (el detalle seguía siendo el pedido más reciente porque la página ignoraba el parámetro); el paso anterior (TEST-10) pasaba | |
| TASK-11 | | Verde de TEST-10 y TEST-11 (Pedidos) | Mismo comando tras el código: `1 passed (28.8s)`. Con un segundo pedido creado por `POST /bff/checkout/orders`: `/pedidos?pedido=<primero>` muestra el primero y no el segundo; `/pedidos?pedido=NO-EXISTE` muestra el más reciente, como sin parámetro | |
| TASK-11 | | Código | `pedidos.page.ts`: `pedido = input<string>()` y `selectedId = linkedSignal(() => this.pedido() ?? null)`; plantilla y estilos sin cambios. `withComponentInputBinding()` ya estaba en `app.config.ts` | |
| TASK-11 | | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 22 pass y backend 3 pass, builds y smoke del contrato) | |
| TASK-11 | | E2E completo (cierre de fase 2) | `npm run test:e2e` desde `frontend/`: `31 passed (1.0m)`, código de salida 0, con sus puertos (3400, 4400 y 4500) | |
| TASK-11 | | Capturas de después | 07/11/2026, mismo script, rutas, anchos, roles y copia (`data-capturas.json`, sin cambios) que las de antes; Admin servido desde el worktree. Carpeta `…/001-reorganizar-resumen-del-admin/despues`. `/pedidos` a 1440 y 375 px: **Iguales** (PNG idénticos byte a byte a los de antes). `/pedidos?pedido=WS-93457695` (el más antiguo) a 1440 px: fila resaltada y detalle de ese pedido, con los estilos de hoy. Consola sin errores y sin desborde horizontal en todas | |
| TASK-11 | | Nota sobre las capturas de antes | Se tomaron con el Admin del checkout principal (`dev`, `8cacac1`) servido por `preview_start`, no con el del worktree: el bloque 1 solo añadió `domain/` sin conectarlo a ninguna página, así que su interfaz es la misma. Lo confirma que `/` (superadmin 1440 y vendedor 375) sale idéntica byte a byte con el Admin del worktree. Para las capturas de TASK-12 el Admin se levanta con `npm run start:admin` desde el worktree, no con `preview_start` | |
| TASK-11 | | Prettier | `prettier --write` sobre `pedidos.page.ts` y `storefront-checkout.spec.ts`: sin cambios | |
| TASK-11 | | Traspaso e índice | Traspaso de `tasks.md` actualizado para el bloque 3; fila de la feature en el índice actualizada. Los SHA de la fase 2 se rellenan en el commit `docs` de cierre | |
| ⚠ TASK-12 | `006aff7` | Ejecución | Hecha por el agente principal, sin delegar (tarea ⚠). Se detiene con el paquete de revisión: sin commit hasta la aprobación de la persona | Claude Code (app de escritorio), `claude-opus-5-5`, esfuerzo alto (nivel avanzado · alto del catálogo) |
| ⚠ TASK-12 | `006aff7` | Código | `tarjeta-indicador.component.ts` (`ws-admin-tarjeta-indicador`: título, cifra, variación con marca ▲/▼ y lectura `sr-only`, «—» si es `null`, nota opcional y «Ver más») y `grafico-pedidos.component.ts` (`ws-admin-grafico-pedidos`: barras con `bg-primary` y `bg-accent`, leyenda, eje 0/mitad/tope, `role="img"` con texto alternativo y tabla `sr-only` por día). `resumen.page.ts` conserva `ws-admin-dashboard`, el `h1` «Resumen» y el saludo; fija `ahora` al crearse, calcula con las reglas de `resumen.rules.ts` en `computed` y oculta bloques con `can('orders.manage')` y `can('customers.manage')`. Sin snapshot no muestra cifras (el aviso del panel no cambia). Solo Tailwind con tokens; en línea solo alturas y anchos en %, sin estilos de componente | |
| ⚠ TASK-12 | `006aff7` | Corrección en `domain/` | `serieDelMes` mutaba objetos `DiaDelMes` de solo lectura: el build del Admin falló con TS2540 al importar las reglas por primera vez (`node --test` no comprueba tipos). Ahora cuenta en arreglos locales y arma los días al final, sin cambio de comportamiento: `node --test …/resumen.rules.spec.mjs` `pass 14`, `fail 0` | |
| ⚠ TASK-12 | `006aff7` | Capturas de después | 07/11/2026 (~18:50 Lima), mismo script de CDP, roles, rutas, anchos y copias que TASK-08, con el Admin servido desde el worktree (`npm run start:admin`) y el BFF con `WEBSTORE_DATA_FILE`. Carpeta `frontend/output/visual-qa/001-reorganizar-resumen-del-admin/despues` (las de `/` que dejó TASK-11 se movieron a `despues-task-11`). Además, `resumen-superadmin-error-1440.png`: aviso de error con el BFF detenido | |
| ⚠ TASK-12 | `006aff7` | Diferencias de `/` (superadmin y vendedor, 1440 y 375) | Cuatro tarjetas en orden con «Ver más» en lugar de «Pedidos por atender», «Productos activos», «Stock bajo (5 o menos)» y «Clientes» (AC-01, AC-02, AC-03, AC-05); gráfico por día del mes nuevo (AC-06); «Pedidos por distrito» nuevo (AC-07); «Alertas de inventario» igual, ahora a un tercio de ancho (AC-08); «Pedidos recientes» pasa a la tabla «Últimos pedidos» con ID, Cliente, Estado, Fecha, Total y «Ver», ordenada por `createdAt` (AC-09, AC-10); «Pedidos por estado» nuevo (AC-11). El vendedor no ve «Total de clientes» ni la serie «Clientes nuevos» (AC-12). Ninguna diferencia fuera de estos AC | |
| ⚠ TASK-12 | `006aff7` | Cifras contra los valores esperados | Coinciden con TASK-08: pedidos 9 (+150 %), ventas S/ 7,385.00 (+626 %), clientes 7 (+50 %), stock bajo 3, estados 45 / 33 / 22 %, distritos Miraflores 4, Surco 3, Lince 1 y San Isidro 1. Gráfico: pedidos los días 2 a 6 y clientes nuevos los días 3, 4 (carla, 23:30 de Lima) y 6 | |
| ⚠ TASK-12 | `006aff7` | Tokens y OpenCart | Búsqueda en los tres archivos: sin hex, `rgb()` ni `hsl()`; sin «OpenCart», textos en inglés, íconos de fuente, `svg` ni imágenes. Tokens existentes (`primary`, `primary-strong`, `primary-soft`, `accent`, `warning`, `danger`, `soft`, `subtle`, `line`, `muted`, `ink`, `body`) y `admin-card` | |
| ⚠ TASK-12 | `006aff7` | 375 px | `scrollWidth` = 375 en los dos roles; el gráfico (`min-w-[600px]`) y la tabla (`min-w-[600px]`) se desplazan dentro de su tarjeta. Una primera toma dio 682 y 585: la tabla `sr-only` del gráfico se ensanchaba (una tabla ignora `width: 1px`) y los `sr-only` de la tabla de últimos pedidos tenían por bloque contenedor la tarjeta y no el contenedor desplazable. Se corrigió con un `div.sr-only` y `relative` en el contenedor | |
| ⚠ TASK-12 | `006aff7` | Datos vacíos (`data-vacio.json`, 1440) | Pedidos 0 y ventas S/ 0.00 con «—», clientes 1 (`c-1` del seed) con «—», stock bajo 2; gráfico del mes sin barras; «Todavía no hay pedidos.» en distritos y últimos pedidos; estados 0 / 0 / 0 % (AC-13) | |
| ⚠ TASK-12 | `006aff7` | Aviso de error | Con sesión iniciada y el BFF detenido, «Actualizar» muestra el aviso de siempre («No pudimos cargar la información del panel…») y el Resumen conserva el último snapshot confirmado. Recargar sin BFF lleva al acceso (la sesión no se restaura), así que el Resumen sin snapshot no es alcanzable desde la interfaz: la guarda queda como defensa. La consola registra solo el 502 de la petición fallida | |
| ⚠ TASK-12 | `006aff7` | Barra lateral, cabecera y `/pedidos` | **Iguales**: `/pedidos` a 1440 y 375 px idéntico byte a byte a TASK-08; barra lateral (0–248 × 0–1200) y cabecera (248–1440 × 0–65) a 1440, y franja superior (375 × 270) a 375, sin píxeles distintos en superadmin, vendedor y vacío | |
| ⚠ TASK-12 | `006aff7` | Consola | Sin errores ni avisos en las siete capturas de `/` y `/pedidos` | |
| ⚠ TASK-12 | `006aff7` | `npm run verify` | Código de salida 0 (arquitectura 22 pass, unitarias frontend 22 pass y backend 3 pass, builds de Storefront y Admin sin avisos de presupuesto, smoke del contrato) | |
| ⚠ TASK-12 | `006aff7` | E2E completo | `npm run test:e2e` desde `frontend/`, en segundo plano: `31 passed (1.0m)`, código de salida 0 (`admin-acceso.spec.ts` incluido: `h1` «Resumen» conservado) | |
| ⚠ TASK-12 | `006aff7` | Prettier | `prettier --write` sobre `resumen.page.ts`, `tarjeta-indicador.component.ts`, `grafico-pedidos.component.ts` y `resumen.rules.ts` | |
| ⚠ TASK-12 | `006aff7` | Revisión humana | Aprobada por Sebastián Avila el 2026-11-07 («Sí, apruebo»), con los 8 criterios del hito. La revisión independiente de la sesión principal confirmó las cifras recalculadas a mano con `data-capturas.json`, el typecheck del Admin (`tsc -p projects/admin/tsconfig.app.json --noEmit`) en verde, las 14 pruebas de `domain/`, el vendedor sin bloques de clientes y el estado vacío | |
| TASK-13 | `a94145b` | Ejecución | Hecha por el agente principal, sin delegar. Se escribieron las specs derivadas de los AC junto al código (e2e, sin rojo previo: el Resumen ya estaba implementado) | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo medio (nivel estándar · medio del catálogo) |
| TASK-13 | `a94145b` | Specs | `admin-resumen.spec.ts` (TEST-12): superadmin con los títulos de los bloques en orden, cada «Ver más (<tarjeta>)» con su destino, leyendas «Pedidos» y «Clientes nuevos», columnas de «Últimos pedidos» y las tres barras de estado; «Ver más» de clientes navega; vendedor sin «Total de clientes» ni «Clientes nuevos». Sin cifras. `storefront-checkout.spec.ts` (TEST-11, parte del Resumen): el pedido recién creado encabeza «Últimos pedidos» y su «Ver» abre `/pedidos?pedido=<id>` con ese pedido. `admin-acceso.spec.ts` sin cambios | |
| TASK-13 | `a94145b` | Specs concretas | `npm run test:e2e -- admin-resumen storefront-checkout`: `4 passed (30.0s)` | |
| TASK-13 | `a94145b` | E2E completo | `npm run test:e2e` desde `frontend/`, en segundo plano: `34 passed (1.1m)`, código de salida 0 (`admin-acceso.spec.ts` incluido) | |
| TASK-13 | `a94145b` | `npm run verify` | Código de salida 0 | |
| TASK-13 | `a94145b` | Prettier | `prettier --write` sobre `admin-resumen.spec.ts` y `storefront-checkout.spec.ts` | |
| TASK-14 | `c8b46f8` | Ejecución | Hecha por el agente principal, sin delegar | Claude Code (app de escritorio), `claude-sonnet-5-5`, esfuerzo bajo (nivel estándar · bajo del catálogo) |
| TASK-14 | `c8b46f8` | Documentos | Glosario: fila «Resumen» ampliada y filas nuevas «Total de ventas», «Cliente nuevo» y «Variación», con su nombre en el código. `TRACEABILITY.md`: filas del Resumen reorganizado y de `?pedido=`, con sus TEST. `frontend/architecture.md` §6: las unitarias de `domain/` incluyen los indicadores del Resumen. Índice de features actualizado | |
| TASK-14 | `c8b46f8` | Backlog | PBI-0029 (propuesta, `technical-debt`): que `verify` compruebe los tipos de todos los archivos de `domain/`; origen, el TS2540 de `serieDelMes` en TASK-12 | |
| TASK-14 | `c8b46f8` | Contrato (TEST-15) | `npm run validate:contract`: «Smoke test BFF: OK». `git diff --stat origin/dev -- backend/`: vacío | |
| TASK-14 | `c8b46f8` | `npm run verify` (TEST-14) | Código de salida 0 | |
| TASK-14 | `c8b46f8` | E2E | No se repite: TASK-14 no toca código y el e2e completo de TASK-13 dio `34 passed (1.1m)` | |

## Estado de los controles

Ejecuciones finales de `sdd-verify` sobre la punta `f9598f3`, el 2026-11-07. Las de cada tarea están en «Ejecución por tarea».

| Control | Documentado | Configurado | Ejecutado |
|---|---|---|---|
| Agentes (`check:agents`) | Sí ([ADR-0008](../../../adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)) | Sí (`tools/check-agents.mjs`, en `verify`) | Sí: «catálogo 1.0.0, 2 herramientas, 10 skills, 10 referencias a niveles y 3 CLAUDE.md revisados» |
| Sintaxis del BFF (`check:syntax`) | Sí | Sí (en `verify`) | Sí: «Sintaxis correcta en 50 archivos» |
| Formato (`format:check`) | Sí | Sí (en `verify`) | Sí: «All matched files use Prettier code style!» en la raíz y en `frontend/` |
| Lint y límites de arquitectura | Sí ([`frontend/architecture.md`](../../../../frontend/architecture.md)) | Sí (ESLint, Sheriff y `test:architecture`, en `verify`) | Sí: `eslint src projects` sin errores; `test:architecture` `pass 22`, `fail 0`. Sin reglas desactivadas en el diff |
| Pruebas unitarias | Sí (plan, TEST-01 a TEST-09) | Sí (`npm test`, en `verify`) | Sí: frontend `pass 22`, `fail 0` (las 14 de `resumen.rules.spec.mjs` incluidas); backend `pass 3`, `fail 0`. Además, `TZ=Asia/Tokyo node --test …/resumen.rules.spec.mjs`: `pass 14`, `fail 0` |
| Typecheck del Admin | Sí (riesgo de TASK-12; PBI-0029) | No en `verify` (PBI-0029): lo cubre el build, que solo compila lo que se importa | Sí, a mano: `npx tsc -p projects/admin/tsconfig.app.json --noEmit` desde `frontend/`, código de salida 0 |
| Pruebas de integración y contrato del BFF | Sí ([contrato](../../../../backend/docs/BFF-CONTRACT.md)) | Sí (`validate:contract`, en `verify`) | Sí: estructura «OK» y «Smoke test BFF: OK» (10 bloques). `git diff --stat origin/dev...HEAD -- backend/`: vacío (TEST-15) |
| Pruebas E2E | Sí (plan, TEST-10 a TEST-12) | Sí (`playwright.config.ts`: BFF 3400, Storefront 4400, Admin 4500, estado temporal) | Sí: `npm run test:e2e` desde `frontend/`, en segundo plano: `34 passed (1.3m)`, código de salida 0 |
| Build de Storefront y Admin | Sí | Sí (`build:all`, en `verify`, con presupuestos) | Sí: los dos builds completos, sin avisos de presupuesto |
| `npm run verify` completo | Sí | Sí | Sí: código de salida 0 |
| Capturas antes y después | Sí (plan, [tabla de capturas](planning.md#capturas-antes-y-después)) | Sí (script de CDP de un solo uso, mismos roles, rutas, anchos y copias) | Sí: comparación final repetida; ver [Capturas antes y después](#capturas-antes-y-después) |
| Auditoría de dependencias | Sí | Sí (`audit:all`) | Sí: «found 0 vulnerabilities» en la raíz y en `frontend/`. Las dependencias no cambian en el diff |
| CI | Sí ([`ci.yml`](../../../../.github/workflows/ci.yml)) | Sí | No ejecutado: la rama no tiene push; corre al abrir el PR |
| Revisión ciega | Sí ([guía](../../../development/agent-execution.md#revisión-ciega)) | Sí (catálogo, `roles`) | No ejecutada: `sdd-verify` no la pide. Aunque se hiciera, no contaría como evidencia |

## Resultados de las pruebas

| ID | AC | Comando | Resultado | Evidencia |
|---|---|---|---|---|
| TEST-01 | AC-04, AC-06 | `npm test --prefix frontend` (en `verify`) | Pasa | «la fecha de Lima de un instante no depende de la zona del equipo»; también con `TZ=Asia/Tokyo` |
| TEST-02 | AC-03 | Ídem | Pasa | «los tramos de comparación van del día 1 a hoy y cubren el mes anterior más corto» |
| TEST-03 | AC-02 | Ídem | Pasa | «los totales cuentan todos los pedidos, las ventas sin cancelados y todos los clientes» |
| TEST-04 | AC-03, AC-13 | Ídem | Pasa | «la variación es el cambio en % entero…», «sin pedidos en el tramo anterior no hay variación…» |
| TEST-05 | AC-03, AC-04 | Ídem | Pasa | «un cliente es nuevo el día de su primer pedido…», «las variaciones comparan el mes en curso…» |
| TEST-06 | AC-06, AC-13 | Ídem | Pasa | Las dos pruebas de la serie del mes (noviembre, febrero normal y bisiesto, diciembre, vacío) |
| TEST-07 | AC-07, AC-13 | Ídem | Pasa | «los distritos con más pedidos van de mayor a menor…» |
| TEST-08 | AC-09 | Ídem | Pasa | «los últimos pedidos van del más nuevo al más antiguo…» |
| TEST-09 | AC-11, AC-13 | Ídem | Pasa | Las tres pruebas de la distribución por estado (mayor resto, 0/0/0) |
| TEST-10 | AC-10 | `npm run test:e2e` desde `frontend/` | Pasa | `storefront-checkout.spec.ts` («un invitado compra, consulta su pedido y el Admin lo recibe») en `34 passed` |
| TEST-11 | AC-09, AC-10 | Ídem | Pasa | Misma spec: el pedido nuevo encabeza «Últimos pedidos», «Ver» abre `/pedidos?pedido=<id>`, `?pedido=` con un pedido que no es el primero y `NO-EXISTE` |
| TEST-12 | AC-01, AC-05 a AC-09, AC-11, AC-12 | Ídem | Pasa | `admin-resumen.spec.ts`: las tres pruebas en `34 passed` |
| TEST-13 | AC-12, AC-13, AC-14 | Script de CDP de un solo uso (`capturar-admin.mjs`) | Pasa | Ver [Capturas antes y después](#capturas-antes-y-después) |
| TEST-14 | — (STD-01, STD-03) | `npm run verify` | Pasa | Código de salida 0; Sheriff y ESLint sin reglas desactivadas; builds sin avisos de presupuesto |
| TEST-15 | — (STD-05) | `npm run validate:contract` (en `verify`) y `git diff --stat origin/dev...HEAD -- backend/` | Pasa | «Smoke test BFF: OK»; diff de `backend/` vacío |

La salida del e2e incluye errores NG02953 y avisos NG02952 del Storefront (`NgOptimizedImage`). Ya existían y están en el backlog como PBI-0026. No vienen de esta feature.

## Capturas antes y después

Toma final del 2026-11-07, ~19:35 de Lima, el mismo día que las de antes (TASK-08), así que el mes del gráfico es el mismo. Mismo script, roles, rutas, anchos y copias. Admin servido desde el worktree (`npm run start:admin`) y BFF con `WEBSTORE_DATA_FILE` en las copias. El código de la aplicación no cambia entre `006aff7` (TASK-12) y la punta: `git diff --stat 006aff7 HEAD -- frontend/projects frontend/src` está vacío. Carpeta `frontend/output/visual-qa/001-reorganizar-resumen-del-admin/verify` (no versionada).

| Pantalla o ruta | Anchos | Resultado | Evidencia |
|---|---|---|---|
| Admin, Resumen (`/`), superadmin | 1440 y 375 | Cambios pedidos (AC-01 a AC-03, AC-05 a AC-09, AC-11, AC-14) | PNG idénticos byte a byte a los de después de TASK-12, aprobados en el hito ⚠. Frente a `antes`: las diferencias que lista TASK-12, todas con su AC. `scrollWidth` = `clientWidth` (1425 con barra vertical y 375): sin desborde. Consola sin errores |
| Admin, Resumen (`/`), vendedor | 1440 y 375 | Cambios pedidos (AC-12) | Idénticos byte a byte a los de TASK-12; sin «Total de clientes» ni «Clientes nuevos». Sin desborde y consola sin errores |
| Admin, Resumen (`/`) sin pedidos (`data-vacio.json`), superadmin | 1440 | Cambios pedidos (AC-13) | Idéntica byte a byte a la de TASK-12. Consola sin errores |
| Admin, Pedidos (`/pedidos`), superadmin | 1440 y 375 | Iguales | Idénticos byte a byte a `antes` (TASK-08) y a TASK-12. Sin desborde y consola sin errores |
| Admin, barra lateral y cabecera | 1440 y 375 | Iguales | Comparación de píxeles de TASK-12, sobre las mismas imágenes que la toma final reproduce byte a byte |
| Storefront | — | No aplica | El diff no toca `frontend/src/` |

Una primera toma final lanzó Chrome con `--hide-scrollbars`, y las tres capturas de 375 px con tablas desplazables no coincidieron. La diferencia de píxeles se limitó al indicador de desplazamiento horizontal superpuesto, que esa opción oculta (`pedidos` 375: 1224 píxeles entre x 0–198 e y 120–979). Era un cambio del método, no de la interfaz. Se repitió la toma sin esa opción, como en TASK-08 y TASK-12, y las seis capturas con datos salieron idénticas byte a byte.

## Cumplimiento TDD

| Área | TDD obligatorio | Prueba antes del código | Evidencia |
|---|---|---|---|
| Admin `domain/` (`resumen.rules.ts`, TASK-01 a TASK-07) | Sí (STD-18) | Sí | Rojo con `AssertionError` contra un stub y después verde, registrado en cada tarea («Ejecución por tarea»). Hay un commit por tarea con la prueba y el código juntos, así que la evidencia del orden está en este documento y no en el historial. Los dos rojos por `ReferenceError` y `SyntaxError` (TASK-05, TASK-07) se descartaron y se repitieron |
| Admin `domain/` (`tienda.model.ts`, TASK-09) | Sí | No aplica | Solo mueve una constante, sin comportamiento nuevo. `verify` en verde |
| Admin `presentation/` (`pedidos.page.ts`, TASK-10 y TASK-11) | No (código existente sin pruebas: caracterización obligatoria) | Sí | La caracterización TEST-10 (`33f8060`) está en verde antes del cambio (`be409f5`). El rojo de TEST-11 está registrado en TASK-11 |
| Admin `presentation/` (Resumen, TASK-12) | No (los componentes derivan de los AC) | No aplica | Las reglas que usa ya estaban probadas (TEST-01 a TEST-09). La cubren TEST-12 y TEST-13 |
| E2E (TASK-13) | No | No aplica | STD-18 permite escribir el e2e junto al código. Se registró como tal en TASK-13 |

## Trazabilidad

| REQ | AC | TASK | Commit o PR | TEST | Resultado |
|---|---|---|---|---|---|
| REQ-01, REQ-03 | AC-01 | TASK-12, TASK-13 | `006aff7`, `a94145b` | TEST-12, TEST-13 | Pasa |
| REQ-01, REQ-02 | AC-02 | TASK-04, TASK-12 | `77a177f`, `006aff7` | TEST-03, TEST-13 (cifras contra los valores de TASK-08) | Pasa |
| REQ-02 | AC-03 | TASK-02, TASK-04 | `3a66a43`, `77a177f` | TEST-02, TEST-04, TEST-05 | Pasa |
| REQ-02, REQ-04 | AC-04 | TASK-01, TASK-03 | `9597b75`, `0425f5b` | TEST-01, TEST-05 | Pasa |
| REQ-03 | AC-05 | TASK-12, TASK-13 | `006aff7`, `a94145b` | TEST-12 | Pasa |
| REQ-04 | AC-06 | TASK-01, TASK-05, TASK-12 | `9597b75`, `b0c6b0c`, `006aff7` | TEST-01, TEST-06, TEST-12 | Pasa |
| REQ-05 | AC-07 | TASK-06, TASK-12 | `da17596`, `006aff7` | TEST-07, TEST-12 | Pasa |
| REQ-06 | AC-08 | TASK-12 | `006aff7` | TEST-12, TEST-13 | Pasa |
| REQ-07 | AC-09 | TASK-06, TASK-09, TASK-12, TASK-13 | `da17596`, `85408f4`, `006aff7`, `a94145b` | TEST-08, TEST-11, TEST-12 | Pasa |
| REQ-07 | AC-10 | TASK-10, TASK-11, TASK-13 | `33f8060`, `be409f5`, `a94145b` | TEST-10, TEST-11 | Pasa |
| REQ-08 | AC-11 | TASK-07, TASK-12 | `1af854d`, `006aff7` | TEST-09, TEST-12 | Pasa |
| REQ-09 | AC-12 | TASK-12, TASK-13 | `006aff7`, `a94145b` | TEST-12, TEST-13 | Pasa |
| REQ-11 | AC-13 | TASK-04 a TASK-07, TASK-12 | `77a177f`, `b0c6b0c`, `da17596`, `1af854d`, `006aff7` | TEST-04, TEST-06, TEST-07, TEST-09, TEST-13 (vacío) | Pasa |
| REQ-10 | AC-14 | TASK-08, TASK-11, TASK-12 | `7a3cf8b`, `be409f5`, `006aff7` | TEST-13 | Pasa |
| — (STD-01, STD-03, STD-05) | — | TASK-14 | `c8b46f8` | TEST-14, TEST-15 | Pasa |

Los documentos afectados están actualizados: glosario, [`TRACEABILITY.md`](../../../planning/TRACEABILITY.md), `frontend/architecture.md` §6, backlog (PBI-0029) e índice de features. `BFF-CONTRACT.md` no cambia porque el contrato no cambia. Los enlaces relativos de los siete documentos modificados, de la especificación y del plan resuelven, anclas incluidas (comprobación con un script de un solo uso: 0 enlaces con problema).

## Definition of Done

Marca solo lo que se cumple ([criterios](../../../development/definition-of-done.md)).

- [x] AC aplicables demostrados (AC-01 a AC-14), con el comportamiento normal, los límites (fin de mes, bisiesto, medianoche de Lima, mayor resto) y los fallos (tramo anterior en 0, tienda sin pedidos, BFF caído) cubiertos.
- [x] En `domain/`, las pruebas existían antes del código. La evidencia está en «Ejecución por tarea» y en [Cumplimiento TDD](#cumplimiento-tdd).
- [x] `npm run verify` ejecutado desde la raíz sobre `f9598f3` (código de salida 0), `npm run test:e2e` desde `frontend/` (`34 passed`) y `npm run audit:all` (0 vulnerabilidades).
- [x] No cambia el contrato HTTP: el diff de `backend/` está vacío y el smoke test del contrato está en verde (TEST-15).
- [x] Autorización, confidencialidad y accesibilidad revisadas para el cambio. El BFF no cambia y sigue enviando cada colección solo al rol que la gestiona. El Resumen oculta los bloques con `can()`, que es UX. Accesibilidad revisada en el código: `h2` por bloque, enlaces con nombre (`Ver más (<tarjeta>)`, `Ver el pedido <id>`), `role="img"` con texto alternativo y tabla `sr-only` en el gráfico, y marcas ▲/▼ con lectura `sr-only`. No se ejecutó ninguna auditoría automática de accesibilidad ni prueba de teclado.
- [x] Capturas antes y después a 1440 y 375 px, sin cambios visuales no pedidos (STD-12).
- [x] Documentación coherente con la implementación. No hace falta ADR (plan aprobado sin ADR, PR #2).
- [x] Trazabilidad REQ → AC → TASK → commit → TEST → resultado completa.
- [x] Sin secretos, hosts ni datos personales reales en Git ni en la evidencia: las specs usan datos de prueba y las copias de datos y las capturas no se versionan. `backend/data.json` no se modificó.
- [x] Los controles no ejecutados figuran como tales (CI y revisión ciega). El hallazgo de los commits, ya corregido, figura en [Riesgos remanentes y excepciones](#riesgos-remanentes-y-excepciones).
- [ ] Revisión humana del hito correspondiente registrada. Las del bloque 2 y de ⚠ TASK-12 están registradas. **Falta la del hito de entrega**, que se acepta después del merge.

## Riesgos remanentes y excepciones

- **Hallazgo corregido: firmas de IA en commits.** Cinco commits de la fase 2 (`4ec5f9e`, `08decd1`, `b6efefc`, `b92cf98` y `2f793c0`, antes de reescribirlos) terminaban con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Eso incumplía [conventional-commits.md](../../../git/conventional-commits.md) («No añadas `Co-Authored-By` ni firmas de herramientas de IA») y el punto «Flujo y título» de la [revisión de PR](../../../development/pull-request-checklist.md). Con la aprobación de Sebastián Avila del 2026-11-07 («Sí, quítalas»), y antes del primer push, se quitó la línea con `git filter-branch --msg-filter` sobre `8cacac1..HEAD`. Solo cambiaron los mensajes: el árbol de la punta sigue siendo `7efd0ca`, los commits de la fase 1 conservan su SHA y los demás cambian (`4ec5f9e` → `7a3cf8b`, `08decd1` → `85408f4`, `b6efefc` → `33f8060`, `b92cf98` → `be409f5`, `2f793c0` → `46ded7e`, `94ce624` → `006aff7`, `1488025` → `a94145b`, `b82a534` → `c8b46f8`, `a26a7df` → `f9598f3`). Este documento ya usa los SHA nuevos. Las ejecuciones de esta verificación se hicieron sobre `a26a7df`, cuyo árbol es el mismo que el de `f9598f3`.
- **Convención menor.** Los commits de las fases 2 y 3 no llevan la nota al pie `Refs: 001-reorganizar-resumen-del-admin/TASK-NN` que sí llevan los de la fase 1.
- **Fecha de «Últimos pedidos».** La columna Fecha usa `DatePipe` con la zona del navegador, igual que la página de Pedidos. El gráfico y los tramos cuentan en hora de Lima. Con un navegador fuera de la zona de Lima, un pedido de las 23:30 podría mostrar en la tabla el día siguiente al que cuenta el gráfico. AC-09 no fija la zona, y en Lima son iguales. No se considera defecto.
- **Comentario desplazado.** En `tienda.model.ts`, el comentario «Etiquetas visibles…» ahora queda sobre `ETIQUETAS_ESTADO_PEDIDO` y `ETIQUETAS_ESTADO_RECLAMO` se quedó sin él. Es cosmético y no afecta al comportamiento.
- **`ahora` fijo.** El Resumen fija `ahora` al abrirse: si la página queda abierta al cambiar de día o de mes, los tramos y el gráfico no se mueven hasta volver a entrar. Es lo previsto en el plan y en la especificación (sin tiempo real).
- **Typecheck.** `verify` no comprueba los tipos de los archivos de `domain/` que ninguna página importa (PBI-0029, propuesta). En esta verificación se comprobaron a mano con `tsc`.
- **CI no ejecutado.** Corre al abrir el PR.
- **Ejecutado con.** Todas las tareas lo registraron (herramienta, modelo real y esfuerzo). No falta ninguna fila.

## Hito de entrega

pendiente
