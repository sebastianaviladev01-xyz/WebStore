# 0033. Construir por lotes lo que salió de la reunión del 2026-11-24, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-26

Decidida por Sebastián Avila el 2026-11-26. Al preguntarle si se construían por lotes PBI-0265 a PBI-0271, respondió: «Sí, por lotes». Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0032](0032-cerrar-por-lotes-los-hallazgos-de-los-lotes-37-y-38.md).

## Contexto

### Por qué había que decidir

La reunión de Daniel y Sebastián del 2026-11-24 y las capturas del SGC que Daniel mandó como patrón dejaron siete PBI en el [backlog](../planning/backlog.md), en `propuesta`:

| PBI | Qué | Área |
|---|---|---|
| PBI-0265 | Listados del backoffice en un solo panel, como la lista de proveedores del SGC | Backoffice |
| PBI-0266 | Elegir el estilo de cada botón del banner | Backoffice, storefront y BFF |
| PBI-0267 | Explicar el contraste en el editor de temas, con el color sugerido | Backoffice |
| PBI-0268 | Formularios de registro como los del SGC | Backoffice |
| PBI-0269 | Ventana propia para confirmar los borrados | Backoffice |
| PBI-0270 | Dashboard como el panel del SGC, con filtro de periodo | Backoffice y BFF |
| PBI-0271 | Ruta de navegación en la barra superior | Backoffice |

Sebastián Avila decidió el 2026-11-26 no dejar nada de esa reunión a la espera de Daniel y tomar la mejor opción. Las decisiones están en las filas «Reunión del 2026-11-24» de las [decisiones pendientes](../planning/PENDING-DECISIONS.md): son la especificación de cada elemento. Todos se pueden resolver en el repositorio, sin terceros.

- **Regla y ámbito:** STD-12, STD-16, STD-17 y el flujo SDD, en el backoffice, el BFF (contrato de banners y del Dashboard) y el storefront (botones del banner).
- **Riesgo:**
  - es un cambio visual amplio del backoffice: todos los listados, los formularios, el borrado y el Dashboard;
  - cambian dos contratos del BFF;
  - quedan expuestos quien usa el backoffice y quien revisa los PR.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Como ADR-0032 | Rápido y conocido; PR revisables | Menos puntos de control que las seis etapas |
| Una feature SDD por PBI | Seis etapas por elemento | Más control | Mucho más lento; las decisiones ya están tomadas y escritas |
| Dejarlos en `propuesta` | Nada que tocar | Ningún cambio visual | Sebastián Avila pidió construirlos |

## Decisión

Construiremos por lotes PBI-0265 a PBI-0271, con las reglas de ADR-0032:

1. **Lotes por área.**
   - Cada lote va en `feature/lote-NN-slug`, con su worktree.
   - La sesión principal audita cada lote y abre su PR en borrador hacia `dev`. Los fusiona una persona.
   - Todos parten de la rama del lote 43, que lleva este ADR, salvo el 46, que parte del 44 porque cambia el mismo formulario de banners.
2. **La especificación son las filas «Reunión del 2026-11-24».**
   - Lo que esas filas no fijan lo decide el lote con la opción más apegada a las capturas del SGC y al sistema visual.
   - Lo que decide el lote queda escrito como decisión de Sebastián Avila, sin esperar a Daniel. Si Daniel pide otra cosa, se cambia.
3. **Fuera:** lo que esas filas dicen que no se copia (el menú lateral del SGC, el autocompletado con RENIEC o SUNAT, los bloques propios de la gestión documental) y lo que ya estaba fuera al cerrar ADR-0032.

**Sigue prohibido** (compensación):

- saltarse la prueba primero en las áreas de STD-18, también en los contratos del BFF que cambian;
- cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde;
- desactivar reglas de ESLint o de Sheriff;
- cambiar el diseño visual sin capturas antes y después (STD-12), o más allá de lo que fijan las filas;
- que una exportación o un resumen muestre datos que el rol de la sesión no puede ver: el BFF sigue autorizando cada petición;
- bajar el contraste de un texto o de un control por debajo de ADR-0022 y ADR-0023, también en las tarjetas de color del Dashboard y en los estilos de los botones del banner;
- que un agente haga push a `dev`, fusione un PR o cree tags;
- superar Opus 5.5 con `high`;
- lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. Los registros se actualizan en el lote de cierre.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 43 | Backoffice: listados y borrado | PBI-0265, PBI-0269 y el pie de las ventanas emergentes de registro (PBI-0268), que viven en las páginas de los listados |
| 44 | Backoffice: formularios de registro y ruta de navegación | PBI-0268 (páginas de registro) y PBI-0271 |
| 45 | Backoffice y BFF: Dashboard | PBI-0270 |
| 46 | BFF, backoffice y storefront: botones del banner | PBI-0266, sobre el lote 44 |
| 47 | Backoffice: contraste en Temas | PBI-0267 |
| 48 | Cierre documental | Los registros y el cierre de este ADR |

*Motivo:* Sebastián Avila pidió construirlos por lotes. Los lotes conservan las pruebas, los controles, las capturas y la revisión por PR, como con ADR-0032.

## Consecuencias

**Lo que se vuelve más fácil:**

- el backoffice sigue el patrón profesional que Daniel mostró;
- el usuario entiende el contraste de un tema y puede corregirlo con un clic;
- el Dashboard se puede leer por periodo.

**Lo que se vuelve más difícil:**

- hay más estructura compartida en los listados y los formularios;
- cambian dos contratos del BFF.

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el lote 48 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-26. Falta informar a Daniel Avila de lo que cambia en el backoffice.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.

## Cierre

Se ejecutaron seis lotes el 2026-11-26, auditados por la sesión principal (diff, `npm run verify`, la suite e2e completa y las capturas). Los fusiona Sebastián Avila, en este orden:

| Lote | Elementos | PR |
|---|---|---|
| 43, listados y borrado | PBI-0265, PBI-0269 y el pie de las ventanas de registro (PBI-0268) | [PR #106](https://github.com/sebastianaviladev01-xyz/WebStore/pull/106) |
| 44, formularios de registro y ruta de navegación | PBI-0268 y PBI-0271 | [PR #108](https://github.com/sebastianaviladev01-xyz/WebStore/pull/108) |
| 45, Dashboard | PBI-0270 | [PR #107](https://github.com/sebastianaviladev01-xyz/WebStore/pull/107) |
| 46, botones del banner | PBI-0266 | [PR #109](https://github.com/sebastianaviladev01-xyz/WebStore/pull/109) |
| 47, contraste en Temas | PBI-0267 | [PR #105](https://github.com/sebastianaviladev01-xyz/WebStore/pull/105) |
| 48, cierre | Los registros, la unión de los cinco lotes y este cierre | El PR del lote 48 |

- **Lote 43:** e2e 424 de 424. La auditoría corrigió la fila de filtros, el foco tras borrar, «1 pedidos» y un defecto que destapó la suite completa: con 10 por página, el registro recién creado quedaba fuera de la vista.
- **Lote 44:** e2e 420 de 420. La auditoría corrigió el pie en el celular y 7 e2e de contraste que chocaban con el nuevo `select` «Estado».
- **Lote 45:** e2e 413 de 413. La auditoría hizo que el gráfico siguiera el periodo. Decisión: todas las cifras son del periodo, ya no el total histórico (nota en la feature 001).
- **Lote 46:** e2e 424 de 424, con el lote 44 incorporado. Con los estilos por omisión, 0 diferencias en las capturas de la tienda.
- **Lote 47:** e2e 412 de 412. La auditoría pidió una sola sugerencia por color y en cadena, para no pedir cambiar un color de marca sin necesidad.
- **Lote 48, con los cinco lotes juntos:** `npm run verify` en verde y e2e 449 de 449 (y 449 de 449 en el CI del #105, sin intermitentes). Los conflictos entre lotes (documentación, íconos y dos e2e) se resolvieron aquí; las ramas se encadenaron para fusionarse en orden; y el ícono de información, repetido con dos nombres, quedó en uno.
- **Fallos intermitentes del CI, con su causa en las trazas:** «Agregar fila» le quitaba el foco al precio (defecto del lote 44, corregido) y dos e2e del diálogo de temas escribían antes de que Material pusiera su foco en «Nombre» (corregidas; el resto de ventanas, en PBI-0275). Seis e2e del lote 44 esperaban `nuevo` en la URL, que el listado del lote 43 consume: ahora esperan la URL final.

Los registros quedaron al día en el lote 48: el [backlog](../planning/backlog.md), las [decisiones pendientes](../planning/PENDING-DECISIONS.md) (filas «Reunión del 2026-11-24: …», decididas por Sebastián Avila), la [trazabilidad](../planning/TRACEABILITY.md), la [funcionalidad](../planning/FUNCIONALIDAD.md), el [glosario](../architecture/glosario.md), una nota en la [feature 001](../specs/features/001-reorganizar-resumen-del-admin/specification.md), el [índice de features](../specs/features/README.md) y el [historial](../changelog/CHANGELOG-2026-11-26.md). La excepción sale de «Excepciones vigentes».

**Lo que queda abierto:** PBI-0272 (un espacio en blanco del diálogo de tema a 375 px, por comprobar en un celular), PBI-0273 (el foco tras borrar la única fila de la última página), PBI-0274 (e2e del salto a la página del registro nuevo en más listados) y PBI-0275 (esperar el foco inicial de las demás ventanas en las e2e), sin priorizar; y lo que ya estaba fuera al [cerrar ADR-0032](0032-cerrar-por-lotes-los-hallazgos-de-los-lotes-37-y-38.md#cierre).
