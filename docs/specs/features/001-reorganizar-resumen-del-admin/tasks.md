# 001. Reorganizar el Resumen del Admin — Tareas

- Feature: `001-reorganizar-resumen-del-admin`
- Especificación: [specification.md](specification.md) (aprobada, PR #1)
- Plan: [planning.md](planning.md) (aprobado, PR #2, gráfico propio sin ADR)
- Fecha: 2026-11-07

Todas las rutas de código son relativas a `frontend/projects/admin/src/app/features/tienda/`, salvo las que empiezan por `frontend/`, `backend/` o `docs/`.

## Traspaso

Permite empezar el bloque siguiente sin releer la feature. La actualiza la última tarea del bloque, en su mismo commit ([guía](../../../development/agent-execution.md#traspaso)).

| Campo | Contenido |
|---|---|
| Punta de la rama | `feature/001-reorganizar-resumen-del-admin`, creada desde `origin/dev` (`8cacac1`, merge del PR #3). Fase 1 cerrada: un commit `feat(frontend)` por tarea (TASK-01 a TASK-07) y, encima, el commit `docs` de cierre con los SHA en `verification.md`; la punta es ese commit (`git log -1`). Sin push ni PR: el PR de implementación va al final de la feature |
| Siguiente bloque | Bloque 2 (fase 2): TASK-08 a TASK-11. Empieza por TASK-08, que **pide permiso a la persona antes de detener los servidores del checkout principal**. Termina antes de ⚠ TASK-12 |
| Decisiones de ejecución | Las capturas de antes (TASK-08) van antes de tocar `pedidos.page.ts` (TASK-09 y TASK-11), no después como en el paso 7 de la [ejecución prevista](planning.md#ejecución-prevista): así el «antes» de `/pedidos` es anterior a su cambio, como pide [Cambios que tocan la interfaz](../../../architecture/development-workflow.md#cambios-que-tocan-la-interfaz). La fase 1 la hizo el agente principal, sin delegar. `resumen.rules.ts` exporta `fechaEnLima`, `tramosDeComparacion`, `clientesNuevosPorFecha` (devuelve `Map<correo normalizado, FechaLima>`), `variacionPorcentual`, `calcularIndicadores`, `serieDelMes`, `distritosConMasPedidos`, `ultimosPedidos` y `distribucionPorEstado`; TASK-12 las usa tal cual desde `ResumenPage`. `calcularIndicadores` y `serieDelMes` reciben `ahora: Date`, que `ResumenPage` fija una vez al crearse |
| Riesgos abiertos | El import de tipos de `resumen.model` en `resumen.rules.ts` lleva `// prettier-ignore` para caber en una línea: `resumen.rules.spec.mjs` borra las líneas que empiezan por `import` y un `import type` partido por Prettier (`printWidth` 110) rompe la prueba con `SyntaxError`. Si se añade un tipo, el import sigue en una línea. La fase 2 no toca esas reglas. Los tramos del mes dependen de `ahora`: las capturas de TASK-08 y TASK-12 deben tomarse el mismo día ([mismo día para las dos tomas](#mismo-día-para-las-dos-tomas)) |
| Entorno | Worktree en `.worktrees/001-reorganizar-resumen-del-admin`, con `npm run setup` hecho y `npm run verify` en verde (Node v24.20.0, npm 11.19.0). El bloque 1 no levantó servidores ni tocó `backend/data.json`; el e2e completo usó sus puertos (3400, 4400 y 4500) y quedó en `31 passed`. Los servidores del checkout principal (3000, 4200 y 4300) no se tocaron: el bloque 2 los necesita, así que pide permiso antes de detenerlos. TASK-01 creó `verification.md` desde su plantilla. Las capturas de antes irán a `frontend/output/visual-qa/001-reorganizar-resumen-del-admin/antes` |

## Reglas

- En áreas con TDD obligatorio ([STD-18](../../../architecture/standards.md)), cada TASK de implementación indica el TEST que se escribe primero. Aquí son TASK-01 a TASK-07, en `domain/`: el TEST se escribe, se ve en rojo con `node --test projects/admin/src/app/features/tienda/domain/resumen.rules.spec.mjs` (desde `frontend/`), y después el código.
- Una tarea solo se marca `hecha` con evidencia: commit, comando y resultado registrados en `verification.md`, en el mismo commit de la tarea ([guía](../../../development/agent-execution.md#evidencia-en-el-commit-de-la-tarea)). Los SHA se rellenan en un commit `docs` al cerrar cada fase.
- Una tarea que toca la interfaz registra la comparación de capturas antes y después ([STD-12](../../../architecture/standards.md)), con los datos, rutas y anchos de la [tabla del plan](planning.md#capturas-antes-y-después).
- Las pruebas y capturas que modifican datos usan una copia de `backend/data.json` con `WEBSTORE_DATA_FILE`, con ruta absoluta ([STD-09](../../../architecture/standards.md)). Nunca se escribe `backend/data.json` del checkout principal.
- **Servidores.** Los puertos de desarrollo son fijos (BFF 3000, Storefront 4200, Admin 4300) y los del checkout principal están levantados. Toda tarea que necesite levantar los del worktree **pide permiso a la persona antes de detener los del checkout principal**, cada vez y en su propia sesión; sin ese sí, la tarea queda `bloqueada`. No se usan puertos alternativos ([varios checkouts](../../../development/local-environment.md#varios-checkouts)). Al terminar, la tarea detiene los servidores del worktree y no vuelve a levantar los del checkout principal salvo que la persona lo pida.
- La configuración `bff` de `.claude/launch.json` usa `backend/data.json`: para las copias, el BFF se levanta con `WEBSTORE_DATA_FILE` como indica el [adaptador de Claude Code](../../../../.agents/adapters/claude-code.md#servidores-de-desarrollo-y-capturas).
- Las tareas de alto impacto se marcan con ⚠ y requieren revisión humana antes de ejecutarse ([disparadores](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional)).
- El diff de la rama no toca `backend/` ni `BFF-CONTRACT.md` (TEST-15).

## Fases

| Fase | Objetivo |
|---|---|
| 1 | Reglas puras del Resumen en `domain/`, con TDD (TEST-01 a TEST-09) |
| 2 | Capturas de antes y parámetro `?pedido=` en Pedidos, con su caracterización previa (TEST-10 y la parte de Pedidos de TEST-11) |
| 3 | Resumen reorganizado (⚠), e2e del Resumen y documentos afectados |

## Bloques de sesión

Cada bloque se ejecuta en una sesión nueva ([guía](../../../development/agent-execution.md#una-sesión-por-bloque)). Un bloque es una fase o 6 a 8 tareas como máximo, y termina antes de cada tarea ⚠. Al terminar un bloque, el agente informa y espera un sí explícito antes del siguiente.

| Bloque | Tareas | Termina antes de (⚠) |
|---|---|---|
| 1 | TASK-01 a TASK-07 (fase 1) | — (cierre de fase) |
| 2 | TASK-08 a TASK-11 (fase 2) | ⚠ TASK-12 |
| 3 | ⚠ TASK-12 | Se detiene con el paquete de revisión; la aprobación y el commit pueden hacerse al empezar el bloque 4 |
| 4 | TASK-13 y TASK-14 | — (cierre de la feature; sigue `sdd-verify`) |

## Tareas

| ID | Fase | Descripción | Capa | REQ/AC | TEST primero | Depende de | Riesgo | Nivel y esfuerzo | E2E | Capturas | Evidencia esperada | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-01 | 1 | Crear `domain/resumen.model.ts` con los [tipos del plan](planning.md#tipos-intermedios-y-nombres) (`FechaLima`, `TramoMes`, `Indicador`, `IndicadoresResumen`, `DiaDelMes`, `PedidosDistrito`, `DistribucionEstados`), y `domain/resumen.rules.spec.mjs` con el patrón de `tarifa-envio.rules.spec.mjs`. Implementar `fechaEnLima` con `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' })`. Crear `verification.md` desde su plantilla | Admin `domain/` | REQ-04 / AC-04, AC-06 | TEST-01 | — | Medio: zona horaria del navegador o del CI | estándar · alto | No | No | Rojo y verde de TEST-01 (`2026-11-01T03:00:00Z` → 31/10; `05:00:00Z` → 01/11); `npm run verify` en verde; Prettier sobre los archivos tocados | hecha |
| TASK-02 | 1 | Implementar `tramosDeComparacion(hoy)` | Admin `domain/` | REQ-02 / AC-03 | TEST-02 | TASK-01 | Medio: fin de mes, bisiesto y cambio de año | estándar · alto | No | No | Rojo y verde de TEST-02 con los cinco casos del plan (15/11, 31/03, 31/03/2028, 15/01 y día 1); `npm run verify` | hecha |
| TASK-03 | 1 | Implementar `clientesNuevosPorFecha(pedidos)` (exportada para la prueba): fecha de Lima del primer pedido por `customerEmail` con `trim().toLowerCase()`, incluidos los cancelados | Admin `domain/` | REQ-02, REQ-04 / AC-04 | TEST-05 (parte de clientes nuevos: primer pedido, mayúsculas y espacios, pedidos siguientes, cliente sin pedidos) | TASK-01 | Bajo | estándar · alto | No | No | Rojo y verde de esa parte de TEST-05; `npm run verify` | hecha |
| TASK-04 | 1 | Implementar `variacionPorcentual(actual, anterior)` y `calcularIndicadores(pedidos, clientes, ahora)`: totales de pedidos (con cancelados), ventas (`total` sin cancelados, redondeado a céntimos) y clientes; variación de cada uno sobre los tramos; la de clientes, con clientes nuevos | Admin `domain/` | REQ-01, REQ-02, REQ-11 / AC-02, AC-03, AC-13 | TEST-03, TEST-04 y TEST-05 (parte de variación de clientes) | TASK-02, TASK-03 | Medio: `null` cuando el tramo anterior es 0 (nunca `Infinity` ni `NaN`) | estándar · alto | No | No | Rojo y verde de TEST-03, TEST-04 y la parte de TEST-05 (subida, bajada, igual, −100 y `null`; cliente `c-1` del seed sin pedidos); `npm run verify` | hecha |
| TASK-05 | 1 | Implementar `serieDelMes(pedidos, ahora)`: un `DiaDelMes` por día del mes en curso de Lima, con pedidos y clientes nuevos | Admin `domain/` | REQ-04, REQ-11 / AC-06, AC-13 | TEST-06 | TASK-01, TASK-03 | Bajo | estándar · alto | No | No | Rojo y verde de TEST-06 (30, 28, 29 y 31 días; pedidos de otros meses ignorados; sin pedidos, todo en 0); `npm run verify` | hecha |
| TASK-06 | 1 | Implementar `distritosConMasPedidos(pedidos, limite = 5)` y `ultimosPedidos(pedidos, limite = 5)` | Admin `domain/` | REQ-05, REQ-07, REQ-11 / AC-07, AC-09, AC-13 | TEST-07 y TEST-08 | TASK-01 | Bajo | estándar · alto | No | No | Rojo y verde de TEST-07 (orden, empate por nombre con `localeCompare('es-PE')`, «miraflores» = «Miraflores», menos de 5, vacío) y TEST-08 (orden por `createdAt` con el arreglo desordenado); `npm run verify` | hecha |
| TASK-07 | 1 | Implementar `distribucionPorEstado(pedidos)` con la agrupación D8 y el método del mayor resto. Cierra la fase 1 | Admin `domain/` | REQ-08, REQ-11 / AC-11, AC-13 | TEST-09 | TASK-01 | Medio: porcentajes que suman 99 o 101 | estándar · alto | No (e2e completo por cierre de fase) | No | Rojo y verde de TEST-09 (1/1/1 suma 100, caso que sumaría 101, 0/0/0); `npm run verify`; e2e completo en segundo plano por cierre de fase; commit `docs` con los SHA de la fase; Traspaso actualizado | hecha |
| TASK-08 | 2 | Preparar las copias y tomar las capturas de **antes** ([tabla del plan](planning.md#capturas-antes-y-después)). Pide permiso para detener los servidores del checkout principal. Crea `backend/data-capturas.json` (≥ 8 pedidos, ≥ 3 correos con uno repetido, ≥ 4 distritos, los cinco estados asignados desde Pedidos; `createdAt` repartidos entre el mes en curso y el anterior con un script de un solo uso en el directorio temporal de la sesión, con el BFF detenido, y uno a las 23:30 de Lima) y `backend/data-vacio.json` desde el seed. Captura `/` (`superadmin` y `vendedor`, 1440 y 375; vacío, 1440) y `/pedidos` (1440 y 375) | Admin (QA visual) | REQ-10 / AC-12, AC-13, AC-14 | — (TEST-13, toma de antes) | Bloque 1 aprobado | Medio: detener servidores ajenos al worktree; escribir en `backend/data.json` por error | estándar · medio | No | Sí: `/` y `/pedidos`, 1440 y 375 px; `/` vacío, 1440 px | Rutas, anchos y carpeta de las capturas (`frontend/output/visual-qa/001-reorganizar-resumen-del-admin/antes`); fecha de la toma; resumen de las copias y **valores esperados** contados a mano de las cuatro tarjetas y las tres barras de estado; el Traspaso anota las copias y la fecha | hecha |
| TASK-09 | 2 | Mover `STATUS_LABELS` de `presentation/pedidos.page.ts` a `domain/tienda.model.ts` como `ETIQUETAS_ESTADO_PEDIDO: Readonly<Record<EstadoPedido, string>>`, junto a `ETIQUETAS_ESTADO_RECLAMO`, sin cambio de comportamiento | Admin `domain/` y `presentation/` | REQ-07 / AC-09 | — (sin comportamiento nuevo; las etiquetas no cambian) | TASK-08 | Bajo | ligero · medio | No | No (la plantilla no cambia) | Diff que solo mueve la constante y sus usos; `npm run verify` en verde | hecha |
| TASK-10 | 2 | Caracterizar Pedidos antes de tocarla: en `frontend/tests/e2e/storefront-checkout.spec.ts`, **añadir** pasos (sin cambiar ni quitar aserciones) que comprueban que, sin parámetro, el detalle muestra el pedido más reciente | E2E | REQ-07 / AC-10 | TEST-10 | TASK-08 | Bajo | estándar · medio | Spec `storefront-checkout` | No | `npm run test:e2e -- storefront-checkout` (desde `frontend/`) en verde **antes** de TASK-11; diff que solo añade pasos | hecha |
| TASK-11 | 2 | `PedidosPage` acepta `?pedido=<id>`: `pedido = input<string>()` y `selectedId = linkedSignal(() => this.pedido() ?? null)`, sin cambiar plantilla ni estilos. Añadir a `storefront-checkout.spec.ts` la parte de Pedidos de TEST-11: `/pedidos?pedido=<id>` selecciona ese pedido y `/pedidos?pedido=NO-EXISTE` se comporta como sin parámetro. Con un solo pedido no se distingue de lo de hoy: la prueba registra un segundo pedido y abre `?pedido=` con el primero, que ya no encabeza el listado. Cierra la fase 2 | Admin `presentation/` y E2E | REQ-07 / AC-10, AC-14 | TEST-11 (parte de Pedidos), con TEST-10 ya en verde | TASK-09, TASK-10 | Medio: la selección por URL no se distingue si el pedido es el primero | estándar · medio | Sí (completo, por cierre de fase) | Sí: `/pedidos` 1440 y 375 px (resultado esperado «Iguales»); `/pedidos?pedido=<id que no es el primero>` 1440 px, solo después | TEST-10 y TEST-11 (Pedidos) en verde; e2e completo en segundo plano; `npm run verify`; comparación de `/pedidos` contra TASK-08 con resultado «Iguales» y la captura de `?pedido=`; consola sin errores; commit `docs` con los SHA de la fase; Traspaso actualizado | pendiente |
| ⚠ TASK-12 | 3 | Reorganizar el Resumen: `presentation/tarjeta-indicador.component.ts` (`ws-admin-tarjeta-indicador`), `presentation/grafico-pedidos.component.ts` (`ws-admin-grafico-pedidos`, barras con CSS y tokens `primary` y `accent`, leyenda, texto alternativo y tabla `sr-only`) y `presentation/resumen.page.ts` (selector `ws-admin-dashboard` y `h1` «Resumen» conservados; `ahora` fijado al crearse; reglas en `computed`; bloques ocultos según `can('orders.manage')` y `can('customers.manage')`; aviso de error de hoy si el snapshot no carga). Tomar las capturas de **después** y preparar el paquete de revisión | Admin `presentation/` | REQ-01 a REQ-11 / AC-01 a AC-09, AC-11 a AC-14 | — (componentes derivados de los AC; las reglas ya están probadas) | TASK-04 a TASK-09, TASK-11; hito del bloque 2 | Alto: cambio visual pedido; presupuesto de estilos de 8 kB por componente | avanzado · alto | Sí (completo) | Sí: las filas de `/` de la [tabla del plan](planning.md#capturas-antes-y-después), con los mismos datos, anchos y método que TASK-08 | Paquete ⚠ con los [criterios del hito](#hitos-de-revisión-humana): pares antes/después de `/` con la lista de diferencias y el AC de cada una; cifras contra los valores esperados de TASK-08; búsqueda de hex sueltos en las plantillas; desborde a 375 px; consola sin errores; aviso de error con el BFF detenido; `npm run verify` y e2e completo en verde | pendiente |
| TASK-13 | 3 | Crear `frontend/tests/e2e/admin-resumen.spec.ts` (TEST-12: tarjetas en orden con «Ver más» y su destino, encabezados de cada bloque, leyendas del gráfico; el vendedor no ve «Total de clientes» ni «Clientes nuevos») y añadir a `storefront-checkout.spec.ts` la parte del Resumen de TEST-11 (el pedido recién creado encabeza «Últimos pedidos» y «Ver» lleva a `/pedidos?pedido=<id>` con ese pedido). Sin cifras que dependan del orden de las specs | E2E | REQ-01, REQ-03 a REQ-09 / AC-01, AC-05 a AC-09, AC-11, AC-12 | TEST-12 y TEST-11 (parte del Resumen) | ⚠ TASK-12 aprobada | Medio: estado del BFF compartido entre specs | estándar · medio | Sí (completo) | No | `npm run test:e2e -- admin-resumen` y `storefront-checkout` en verde; e2e completo en segundo plano; `admin-acceso.spec.ts` sin cambios y en verde; `npm run verify` | pendiente |
| TASK-14 | 3 | Actualizar los [documentos afectados](planning.md#documentos-afectados): glosario (fila «Resumen» con `resumen.rules.ts`; «Total de ventas», «Cliente nuevo» y «Variación»), `docs/planning/TRACEABILITY.md` (Resumen y `?pedido=`, con sus TEST) y `frontend/architecture.md` §6. Comprobar que el contrato no cambia. Cierra la fase 3 | Documentación | REQ-01 a REQ-11 / — | — | TASK-13 | Bajo | estándar · bajo | No (el e2e completo de TASK-13 cubre el cierre: TASK-14 no toca código) | No | `npm run verify` (TEST-14); `npm run validate:contract` en verde y `git diff --stat origin/dev -- backend/` vacío (TEST-15); commit `docs` con los SHA de la fase; Traspaso actualizado con `sdd-verify` como siguiente paso | pendiente |

- **Nivel y esfuerzo:** según las [tablas de la guía](../../../development/agent-execution.md#delegar-por-nivel-y-esfuerzo), resueltos para cada herramienta en el [catálogo de niveles](../../../../.agents/execution-catalog.json). TASK-12 es ⚠: no se delega.
- **E2E:** `Sí` si la tarea cambia plantillas, rutas, datos guardados o el contrato; `Spec <nombre>` si basta una spec; `No` en otro caso. Toda fase se cierra con el e2e completo.
- **Capturas:** `Sí` si la tarea toca plantillas, estilos o tokens, o si toma una de las dos capturas del par.

Estados: `pendiente`, `bloqueada`, `en curso`, `hecha`.

## Definition of Ready

Comprobado contra los [criterios](../../../development/definition-of-ready.md) el 2026-11-07. Para todas: alcance aprobado (PR #1), plan aprobado sin ADR (PR #2), sin cambios de contrato ni de estado del BFF, y los temas abiertos de [`PENDING-DECISIONS.md`](../../../planning/PENDING-DECISIONS.md) (permisos del Vendedor y paleta) no las afectan: D9 usa los permisos actuales y los colores son tokens.

| Tarea | Lista | Motivo si no lo está |
|---|---|---|
| TASK-01 | Sí | — |
| TASK-02 | Sí | — |
| TASK-03 | Sí | — |
| TASK-04 | Sí | — |
| TASK-05 | Sí | — |
| TASK-06 | Sí | — |
| TASK-07 | Sí | — |
| TASK-08 | Sí | Preparar las copias es parte de la tarea. Detener los servidores del checkout principal necesita el permiso de la persona en esa sesión: sin él, la tarea pasa a `bloqueada` |
| TASK-09 | Sí | — |
| TASK-10 | Sí | — |
| TASK-11 | Sí | Igual que TASK-08 para las capturas |
| ⚠ TASK-12 | Sí, tras el hito | Se ejecuta solo después de que la persona apruebe el bloque 2. Igual que TASK-08 para los servidores |
| TASK-13 | Sí, tras el hito | Empieza cuando la persona aprueba el paquete de TASK-12 |
| TASK-14 | Sí | — |

## Hitos de revisión humana

Cada revisión ⚠ lista sus criterios concretos de aprobación: qué debe comprobar la persona.

- **Antes de ⚠ TASK-12 (fin del bloque 2):** la persona revisa el bloque 2 y da el sí para empezar el bloque 3.
  - Criterio de aprobación: Pedidos sigue «Igual» en las capturas y abre el pedido de `?pedido=`; TEST-10 y TEST-11 (Pedidos) y el e2e completo en verde; las copias de TASK-08 y sus valores esperados son coherentes con los datos.
- **⚠ TASK-12** (disparador: «Cambio del diseño visual», [revisión adicional](../../../architecture/development-workflow.md#disparadores-de-revisión-adicional)). Son los [criterios del plan](planning.md#ejecución-prevista); la persona comprueba en las capturas:
  1. Los bloques están en el orden y con los textos de la especificación: cuatro tarjetas («Total de pedidos», «Total de ventas», «Total de clientes», «Stock bajo»), cada una con «Ver más»; gráfico; pedidos por distrito; alertas de inventario; últimos pedidos con «Ver»; pedidos por estado.
  2. Las cifras coinciden con los valores esperados de `data-capturas.json` que lista TASK-08 (cuatro tarjetas y tres barras de estado).
  3. Solo hay tokens existentes, Source Sans 3 y `admin-card`: sin hex sueltos en las plantillas, ni logo, colores, íconos o textos en inglés de OpenCart.
  4. A 375 px no hay desborde horizontal de la página; la tabla y el gráfico se desplazan dentro de su contenedor.
  5. El vendedor no ve la tarjeta ni la serie de clientes, y ningún bloque aparece vacío o en 0 por falta de permiso.
  6. Con `data-vacio.json`: 0 con «—», gráfico sin barras, mensajes de vacío y estados en 0 %.
  7. La barra lateral, la cabecera y `/pedidos` salen «Iguales».
  8. La consola no tiene errores, y `npm run verify` y el e2e completo están en verde.

### Mismo día para las dos tomas

El plan pide que las capturas de antes y de después se tomen el mismo día, porque el gráfico depende del mes en curso. Si el bloque 3 empieza otro día que TASK-08, antes de tocar `resumen.page.ts` repite las capturas de antes de `/` en la punta de la rama (el Resumen todavía no ha cambiado), con las mismas copias. Si además cambió el mes, vuelve a repartir los `createdAt` de `data-capturas.json` antes de esas capturas y anota los nuevos valores esperados en la evidencia.