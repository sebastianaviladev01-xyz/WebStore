# 0031. Cerrar por lotes los hallazgos de los lotes 33 a 35, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-25

Decidida por Sebastián Avila el 2026-11-25: «cerremos PBI-0252 a 0254 por lotes». Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0029](0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md).

## Contexto

### Por qué había que decidir

Los lotes 33 a 35 de ADR-0029 dejaron tres hallazgos en el [backlog](../planning/backlog.md), en `propuesta`, todos de las herramientas de calidad y no de la tienda:

- **PBI-0252:** las capturas de página completa de `frontend/tools/qa/capturas.mjs` dibujan los elementos fijos o pegados en su lugar del primer viewport y dejan huecos o solapes que no existen en la ventana real.
- **PBI-0253:** `frontend/tools/qa/comparar.mjs` marca a veces unos 16 píxeles distintos en las esquinas redondeadas de un botón entre dos tomas del mismo código.
- **PBI-0254:** la e2e `admin-catalogo-filtros.spec.ts` («TEST-18 · móvil sin desplazamiento horizontal») falló una vez con la máquina cargada.

Con el flujo vigente, cada uno sería una feature con seis etapas. Sebastián Avila pidió cerrarlos por lotes.

- **Regla y ámbito:** STD-16 y STD-17 y el flujo SDD, en las herramientas de QA visual, las e2e y la guía de ejecución. No cambia la tienda, el backoffice ni el BFF.
- **Riesgo:** sin especificación ni hitos, un cambio en las herramientas que validan las capturas o en una e2e puede ocultar un defecto real. Se expone quien revisa los PR de las próximas tareas.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Como ADR-0029: cada lote es una rama `feature/lote-NN-slug` y un PR | Rápido y conocido; PR pequeños | Menos puntos de control |
| Una feature SDD con los tres | Seis etapas para tres ajustes de herramientas | Toda la trazabilidad | Mucho proceso para cambios pequeños |
| Dejarlos en `propuesta` | Nada que tocar | Nada provisional | Sebastián Avila pidió cerrarlos |

## Decisión

Cerraremos por lotes PBI-0252, PBI-0253 y PBI-0254, con las reglas de ADR-0029:

1. **Lotes por área**, cada uno en `feature/lote-NN-slug`, con su worktree y un PR en borrador hacia `dev` que abre la sesión principal después de auditarlo. Los fusiona una persona. Los lotes 37 y 38 parten de `dev` y se ejecutan a la vez, porque no comparten archivos; el 39, de cierre, los incluye.
2. **Lo que no está decidido se decide aquí**, con la opción más conservadora. Son decisiones técnicas de las herramientas y de las pruebas: no hace falta confirmarlas con Daniel.
3. **Quedan fuera** los mismos elementos que en ADR-0029.

**Sigue prohibido** (compensación), como en ADR-0029:

- saltarse la prueba primero en las áreas de STD-18;
- cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde;
- desactivar reglas de ESLint o de Sheriff;
- cambiar la interfaz de la tienda o del backoffice;
- que un ajuste de las herramientas o de una e2e esconda una diferencia o un fallo real: una tolerancia nueva se justifica con datos y se prueba con un caso que sí debe fallar;
- que un agente haga push a `dev`, fusione un PR o cree tags;
- superar Opus 5.5 con `high`;
- lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. Los registros se actualizan en el lote de cierre.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 37 | Herramientas de capturas | PBI-0252, PBI-0253 |
| 38 | E2e intermitente del catálogo del backoffice | PBI-0254 |
| 39 | Cierre documental | Los registros de los dos lotes y el cierre de este ADR |

### Decisiones provisionales de partida

- **PBI-0252:**
  - `capturas.mjs` puede tomar también capturas de la ventana en las posiciones de desplazamiento que pida un escenario, para las páginas con elementos fijos o pegados.
  - «Comparar capturas» de la [guía de ejecución](../development/agent-execution.md#comparar-capturas) explica la limitación de la captura de página completa y cuándo usar las de la ventana.
  - Los escenarios que ya existen dan las mismas capturas que hoy.
- **PBI-0253:**
  - `comparar.mjs` separa del resto las diferencias que son solo antialiasado: pocos píxeles aislados con una diferencia por canal apenas por encima del umbral. Las cuenta aparte, como ruido, sin darlas por cambios.
  - El lote fija los límites con las tomas repetidas de los lotes 34 y 35, y prueba que un cambio real pequeño, como un borde de 1 px o un texto, sigue saliendo como diferencia.
- **PBI-0254:**
  - Se reproduce con la máquina cargada y se corrige la causa: esperar la señal correcta de que la página está lista, o repartir la prueba, que recorre tres temas, tres anchos y tres páginas en un solo test.
  - No se usan pausas fijas, y no se sube un tiempo de espera sin explicar por qué basta.
  - Si no se reproduce, el lote lo deja documentado con la evidencia, y el cierre decide si se descarta.

*Motivo:* Sebastián Avila pidió cerrar los hallazgos; los lotes conservan las pruebas, los controles y la revisión por PR, como con ADR-0029.

## Consecuencias

**Lo que se vuelve más fácil:** confiar en las capturas y en la suite e2e sin revisar a mano falsos huecos, ruido o fallos intermitentes.

**Lo que se vuelve más difícil:** las herramientas de QA tienen más opciones que mantener.

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el lote 39 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-25.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.

## Cierre

Se ejecutaron tres lotes el 2026-11-25, auditados por la sesión principal. Los fusiona Sebastián Avila:

| Lote | Elementos | PR |
|---|---|---|
| 37, herramientas de capturas | PBI-0252 y PBI-0253 | [PR #98](https://github.com/sebastianaviladev01-xyz/WebStore/pull/98) |
| 38, e2e intermitente | PBI-0254 (descartado) | Sin PR: no cambió el código |
| 39, cierre documental | Los registros y este cierre | El PR del lote 39 |

- **Lote 37:** `npm run verify` en verde (frontend 441, con 15 pruebas nuevas de las herramientas; BFF 755) y la suite e2e completa, 391 de 391. La comprobación real dio «Iguales» entre tomas del mismo código con la máquina libre y cargada, con el ruido aparte, y cuatro cambios reales a propósito salieron como diferencia. La regla del entorno se añadió durante el lote, porque sin ella un cambio de color sutil casi pasaba como ruido.
- **Lote 38:** el fallo no se reprodujo en 1 029 vistas medidas, con y sin carga: el registro aparece en 1,2 s como mucho, frente a los 10 s de margen. No se cambió el código y PBI-0254 se descartó. El diagnóstico encontró dos defectos que explicarían un fallo así, con su PBI: PBI-0256 y PBI-0257.

Los registros quedaron al día en el lote 39: el [backlog](../planning/backlog.md), las [decisiones pendientes](../planning/PENDING-DECISIONS.md), la [trazabilidad](../planning/TRACEABILITY.md#hallazgos-de-los-lotes-33-a-35-lotes-37-a-39-2026-11-25), el [índice de features](../specs/features/README.md) y el [historial del 2026-11-25](../changelog/CHANGELOG-2026-11-25.md). Los hallazgos de los lotes tienen su PBI, en `propuesta`: PBI-0256 (el registro del producto dice «ya no existe» si falla la consulta), PBI-0257 (la sesión se cierra con un fallo pasajero), PBI-0258 (conservar el trace de una e2e intermitente), PBI-0259 (TEST-18 en un solo test), PBI-0260 (el umbral de 30), PBI-0261 (el escenario del lote 34 deja un tema propio activo) y PBI-0262 (el alcance `qa` de los commits).

**Lo que queda abierto:** esos hallazgos, sin priorizar, y lo que ya estaba fuera, como al [cerrar ADR-0029](0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md#cierre). El PR del lote 39 parte del lote 37, así que se fusiona después del [PR #98](https://github.com/sebastianaviladev01-xyz/WebStore/pull/98). Esta excepción termina al fusionarlo, y desde entonces rige [ADR-0016](0016-volver-a-un-pull-request-por-hito.md) sin excepción.
