# 0029. Cerrar por lotes los hallazgos de los lotes 28 a 31, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-25

Decidida por Sebastián Avila el 2026-11-25, al elegir «Cerrar PBI-0246 a 0249» como el siguiente trabajo. Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0025](0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md) y [ADR-0027](0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md).

## Contexto

### Por qué había que decidir

Los lotes 28 a 31 de ADR-0027 dejaron cuatro hallazgos en el [backlog](../planning/backlog.md), en `propuesta`:

- **PBI-0246:** la vigencia de los banners acepta fechas inexistentes, como el 30 de febrero.
- **PBI-0247:** en un tema propio con el principal casi igual a su contraste, el botón principal apenas cambia con el puntero encima.
- **PBI-0248:** en la ficha del producto a 375 px, la barra fija «Agregar al carrito» deja un hueco junto a la cantidad.
- **PBI-0249:** en el modo demo, la tuerca «Cambiar tema» del backoffice tapa parte de un «Eliminar» de Productos.

Son defectos pequeños, de impacto bajo, en tres áreas distintas. Con el flujo vigente, cada uno sería una feature con seis etapas y un PR por hito. Sebastián Avila pidió cerrarlos ya.

- **Regla y ámbito:** STD-16 y STD-17 y el flujo SDD (etapas, sesiones por etapa, hitos humanos y un PR por hito), en el storefront, el backoffice y el BFF.
- **Riesgo:** sin especificación ni hitos por elemento, una corrección que cambia algo visible (PBI-0247 y PBI-0249) se construye antes de que Daniel la vea. Se exponen el equipo, que revisa los PR, y Daniel, que confirma después lo provisional.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Como ADR-0025 y ADR-0027: cada lote es una rama `feature/lote-NN-slug` y un PR, sin documentos SDD por elemento | Rápido y conocido; cada PR es pequeño y revisable | Menos puntos de control |
| Una feature SDD con los cuatro hallazgos | Seis etapas y un PR por hito para cuatro defectos sin relación entre sí | Toda la trazabilidad | Mucho proceso para cambios pequeños de áreas distintas |
| Dejarlos en `propuesta` | No hacer nada hasta otra priorización | Nada provisional | Sebastián Avila pidió cerrarlos |

## Decisión

Cerraremos por lotes PBI-0246, PBI-0247, PBI-0248 y PBI-0249, con las reglas de ADR-0027:

1. **Lotes por área**, cada uno en `feature/lote-NN-slug`, con su worktree y un PR en borrador hacia `dev` que abre la sesión principal después de auditarlo. Los fusiona una persona. Los lotes 33, 34 y 35 parten de `dev` y se ejecutan a la vez, porque no comparten archivos; el 36, de cierre, parte del último que se fusione.
2. **Lo que no está decidido se decide aquí**, con la opción más conservadora, y queda en las decisiones pendientes como «Provisional, por confirmar con Daniel» cuando cambia algo que Daniel ve. Las decisiones de partida están abajo; cada lote puede afinarlas y lo anota en su PR.
3. **Quedan fuera** los mismos elementos que en ADR-0027: lo que depende de terceros, de Daniel o del backend de producción, las tareas de personas (PBI-0165 y PBI-0225), PBI-0241, PBI-0242 y la marca del producto.

**Sigue prohibido** (compensación), como en ADR-0027:

- saltarse la prueba primero en las áreas de STD-18;
- cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde;
- desactivar reglas de ESLint o de Sheriff;
- cambiar el diseño visual más allá de lo que pide cada elemento, o hacerlo sin capturas (STD-12);
- cambiar el contrato del BFF sin reflejarlo en [`BFF-CONTRACT.md`](../../backend/docs/BFF-CONTRACT.md) y en el smoke test;
- que un agente haga push a `dev`, fusione un PR o cree tags;
- superar Opus 5.5 con `high`;
- lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. Los registros (backlog, decisiones pendientes, trazabilidad e historial) se actualizan en el lote de cierre.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 33 | Vigencia de los banners en el BFF | PBI-0246 |
| 34 | Tienda: botón principal de los temas propios y ficha a 375 px | PBI-0247, PBI-0248 |
| 35 | Backoffice: tuerca del modo demo | PBI-0249 |
| 36 | Cierre documental | Los registros de todos los lotes y el cierre de este ADR |

### Decisiones provisionales de partida

- **PBI-0246:** el inicio y el fin de la vigencia de un banner rechazan una fecha que no existe en el calendario, con el mismo error que una fecha mal escrita. Se usa la misma comprobación del calendario que los avisos ([`reloj.mjs`](../../backend/src/domain/comun/reloj.mjs)), sin una regla duplicada. Una vigencia guardada antes que no cambia sigue valiendo, como hoy.
- **PBI-0247:** solo cambian los temas propios cuyo principal fuerte no se distingue del principal. A esos se les aleja el principal fuerte hasta una diferencia mínima, que fija el lote y anota en su PR. Los temas propios que ya se distinguen y los predefinidos A, B y C quedan idénticos, y lo prueban las capturas. Si el cambio modifica la regla de [ADR-0023](0023-dar-al-tema-un-borde-del-acento-y-un-acento-fuerte-legible.md) o de [ADR-0028](0028-hacer-visible-el-secundario-en-la-tienda-e-invertir-el-tema-c.md), el lote lo registra en un ADR nuevo.
- **PBI-0248:** primero se comprueba si el hueco se ve en una ventana real de 375 px al desplazarse, y no solo en la captura de página completa.
  - Si se ve, se corrige sin cambiar nada más de la ficha.
  - Si solo aparece en la captura de página completa, no se cambia el código: el lote deja la evidencia y el cierre lo anota como descartado, con ese motivo.
- **PBI-0249:** en el modo demo, el contenido del backoffice reserva al final el espacio de la tuerca, para que al llegar abajo nada quede debajo de ella. La tuerca sigue donde está, porque se queda en la demo (PBI-0188, provisional). Fuera del modo demo no cambia nada.

*Motivo:* Sebastián Avila pidió cerrar los hallazgos ya; los lotes conservan lo que protege el resultado (prueba primero, controles, capturas y revisión por PR), como con ADR-0025 y ADR-0027.

## Consecuencias

**Lo que se vuelve más fácil:** dejar el backlog sin hallazgos propios abiertos; lo que queda depende de terceros, de Daniel o de personas.

**Lo que se vuelve más difícil:** Daniel puede pedir otra forma para el botón principal de los temas propios (PBI-0247) o para la tuerca de la demo (PBI-0249).

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el lote 36 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-25. Falta informar a Daniel Avila.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.

## Cierre

Se ejecutaron cuatro lotes el 2026-11-25, cada uno con su rama y su PR en borrador hacia `dev`, auditados por la sesión principal (diff, `npm run verify`, la suite e2e completa y las capturas cuando tocaba la interfaz). Los fusiona Sebastián Avila:

| Lote | Elementos | PR |
|---|---|---|
| 33, vigencia de los banners en el BFF | PBI-0246 | [PR #95](https://github.com/sebastianaviladev01-xyz/WebStore/pull/95) |
| 34, botón principal de los temas propios y ficha a 375 px ([ADR-0030](0030-alejar-el-principal-fuerte-que-no-se-distingue-del-principal.md)) | PBI-0247 y PBI-0248 (descartado) | [PR #94](https://github.com/sebastianaviladev01-xyz/WebStore/pull/94) |
| 35, tuerca del modo demo | PBI-0249 | [PR #96](https://github.com/sebastianaviladev01-xyz/WebStore/pull/96) |
| 36, cierre documental | Los registros y este cierre | El PR del lote 36 |

Resultados de la auditoría:

- **Lote 33:** `npm run verify` en verde (BFF 748). La suite e2e completa dio 382 de 383: falló una prueba del registro del producto a 375 px mientras otro lote compilaba en la misma máquina; repetida sola tres veces, pasó las tres (PBI-0254).
- **Lote 34:** `npm run verify` en verde (frontend 426, BFF 751) y la suite e2e completa, 383 de 383. En las capturas solo cambia el botón con el puntero encima del tema propio que tenía el defecto.
- **Lote 35:** `npm run verify` en verde y la suite e2e completa, 391 de 391. Sin el modo demo, las capturas no cambian.
- **Lote 36, con los tres lotes juntos:** `npm run verify` en verde (frontend 426, BFF 755) y la suite e2e completa, 391 de 391.

Lo que cambió durante la ejecución:

- **PBI-0248** se descartó: el hueco de la ficha a 375 px solo sale en la captura de página completa, no en una ventana real.
- **PBI-0249:** la decisión de partida, reservar al final del contenido el espacio de la tuerca, no resolvía que la tuerca tapara un «Eliminar» al cargar la página. La auditoría la rechazó, y Sebastián Avila eligió el 2026-11-25 mover la tuerca a la barra superior del panel en lugar de quitarla; en el acceso, que no tiene barra, sigue flotando.
- **PBI-0247:** el lote fijó 1.1:1 para detectar el defecto y 1.3:1 como objetivo, y lo registró en [ADR-0030](0030-alejar-el-principal-fuerte-que-no-se-distingue-del-principal.md).

Los registros quedaron al día en el lote 36: el [backlog](../planning/backlog.md), las [decisiones pendientes](../planning/PENDING-DECISIONS.md) (filas «Hallazgos de los lotes 28 a 31: …», provisionales, por confirmar con Daniel), la [trazabilidad](../planning/TRACEABILITY.md#hallazgos-de-los-lotes-28-a-31-lotes-33-a-36-2026-11-25), la [funcionalidad](../planning/FUNCIONALIDAD.md), el [índice de features](../specs/features/README.md) y el [historial del 2026-11-25](../changelog/CHANGELOG-2026-11-25.md). Los hallazgos de los lotes tienen su PBI: PBI-0252 (las capturas de página completa con elementos fijos o pegados), PBI-0253 (el ruido de `comparar.mjs` en esquinas redondeadas) y PBI-0254 (la e2e intermitente), en `propuesta`; y PBI-0255, el enlace del plan de la feature 003 a la ruta antigua de la tuerca, que corrigió el lote 36.

**Lo que queda abierto:** confirmar con Daniel las decisiones provisionales de los lotes 34 y 35 y si la tuerca del backoffice se queda en el modo demo (PBI-0188); los hallazgos PBI-0252 a PBI-0254, sin priorizar; y lo que ya estaba fuera, como al [cerrar ADR-0027](0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md#cierre).

Falta informar a Daniel Avila, como decía la aprobación. Los PR de los lotes 33 a 35 parten de `dev` y no comparten archivos; el del lote 36 los incluye, así que se fusiona al final, después del #95 (que trae este ADR), el #94 y el #96. Esta excepción termina al fusionarlo, y desde entonces rige [ADR-0016](0016-volver-a-un-pull-request-por-hito.md) sin excepción.
