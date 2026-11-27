# 0032. Cerrar por lotes los hallazgos de los lotes 37 y 38, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-25

Decidida por Sebastián Avila el 2026-11-25: «cerremos con todos los pendientes por lotes que tú puedes manejar», sobre la lista de PBI-0256 a PBI-0262. Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0031](0031-cerrar-por-lotes-los-hallazgos-de-los-lotes-33-a-35.md).

## Contexto

### Por qué había que decidir

Los lotes 37 y 38 de ADR-0031 dejaron siete hallazgos en el [backlog](../planning/backlog.md), en `propuesta`:

| PBI | Qué | Área |
|---|---|---|
| PBI-0256 | Si falla la consulta al abrir el registro de un producto, la página dice «Este producto ya no existe» en lugar de avisar del fallo | Backoffice |
| PBI-0257 | Al restaurar la sesión del backoffice, cualquier error (también un fallo de red o un 5xx pasajero) borra el token y manda al acceso | Backoffice |
| PBI-0258 | Conservar el trace de una e2e intermitente antes de limpiar el worktree | Proceso |
| PBI-0259 | TEST-18 de `admin-catalogo-filtros.spec.ts` recorre 21 vistas en un solo test y no dice qué había en pantalla al fallar | E2e |
| PBI-0260 | Decidir si el umbral por píxel de `comparar.mjs` (30) es el adecuado | QA visual |
| PBI-0261 | El escenario de capturas del lote 34 deja un tema propio activo en la copia de datos | QA visual |
| PBI-0262 | La convención de commits da como ámbitos `frontend` y `backend`, pero el historial usa también `admin`, `storefront`, `bff`, `qa` y otros | Documentación |

Todos se pueden resolver en el repositorio, sin terceros ni decisiones de producto. Sebastián Avila pidió cerrarlos por lotes.

- **Regla y ámbito:** STD-16 y STD-17 y el flujo SDD, en el backoffice (registro del producto y sesión), las e2e, las herramientas de QA visual y la documentación del proceso.
- **Riesgo:** PBI-0257 toca la sesión; un error ahí podría dejar entrar a quien no debe o echar a quien sí. Se exponen quien usa el backoffice y quien revisa el PR.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Como ADR-0031 | Rápido y conocido; PR pequeños | Menos puntos de control |
| Una feature SDD para PBI-0256 y PBI-0257 y lotes para lo demás | Seis etapas para dos defectos pequeños | Más control sobre la sesión | Más lento; los dos cambios son acotados |
| Dejarlos en `propuesta` | Nada que tocar | Nada provisional | Sebastián Avila pidió cerrarlos |

## Decisión

Cerraremos por lotes PBI-0256 a PBI-0262, con las reglas de ADR-0031:

1. **Lotes por área**, cada uno en `feature/lote-NN-slug`, con su worktree y un PR en borrador hacia `dev` que abre la sesión principal después de auditarlo. Los fusiona una persona. Los lotes 40 y 41 parten de `dev` y se ejecutan a la vez, porque no comparten archivos; el 42, de proceso y cierre, los incluye.
2. **Lo que no está decidido se decide aquí**, con la opción más conservadora. Lo que cambia algo que ve un usuario del backoffice queda como «Provisional, por confirmar con Daniel». Lo que solo cambia el proceso queda como provisional, por confirmar con Sebastián Avila.
3. **Quedan fuera** los mismos elementos que en ADR-0031.

**Sigue prohibido** (compensación), como en ADR-0031:

- saltarse la prueba primero en las áreas de STD-18;
- cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde;
- desactivar reglas de ESLint o de Sheriff;
- cambiar el diseño visual más allá de lo que pide cada elemento, o hacerlo sin capturas (STD-12);
- que la sesión deje pasar a alguien sin un usuario válido: el BFF sigue autorizando cada petición y una sesión vencida (401) sigue cerrándose;
- que un cambio en las herramientas o en una e2e esconda una diferencia o un fallo real;
- que un agente haga push a `dev`, fusione un PR o cree tags;
- superar Opus 5.5 con `high`;
- lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. Los registros se actualizan en el lote de cierre.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 40 | Backoffice: registro del producto y sesión | PBI-0256, PBI-0257 |
| 41 | E2e y herramientas de QA visual | PBI-0259, PBI-0260, PBI-0261 |
| 42 | Proceso y cierre documental | PBI-0258, PBI-0262, los registros y el cierre de este ADR |

### Decisiones provisionales de partida

- **PBI-0256:** si la consulta falla y el producto no está entre los datos que ya tenía el panel, el registro no dice que el producto no existe. Avisa de que no se pudieron traer los datos y ofrece reintentar. «Este producto ya no existe» queda solo para cuando la consulta responde y el producto no está.
- **PBI-0257:**
  - Solo una respuesta que dice que la sesión no vale (401) borra el token y manda al acceso.
  - Ante un fallo de red o un error del servidor, el token se conserva y el backoffice avisa de que no pudo comprobar la sesión, con un reintento. No muestra datos ni deja operar mientras no tenga el usuario.
  - El lote elige el lugar del aviso con lo que ya hay.
- **PBI-0259:** TEST-18 se reparte en un test por tema y ancho, con lo mismo que comprueba hoy, y al fallar adjunta lo que había en `main`.
- **PBI-0260:** se mide con tomas repetidas, con la máquina libre y cargada, qué umbral separa mejor los cambios reales del ruido ahora que el ruido de antialiasado va aparte. El umbral solo cambia si los datos lo justifican; si no, se deja en 30 y se documenta por qué.
- **PBI-0261:** el escenario restaura el tema que estaba activo al terminar, con el valor que devuelve `activarTema`.
- **PBI-0258:** el paso de «Cerrar el worktree» que conserva las capturas conserva también el `test-results/` de una e2e que falló de forma intermitente.
- **PBI-0262:** la convención admite, además de `frontend` y `backend`, un ámbito más fino cuando el cambio es de una sola aplicación o herramienta (`admin`, `storefront`, `bff`, `qa`), porque es lo que ya usa el historial. Los commits anteriores no se reescriben.

*Motivo:* Sebastián Avila pidió cerrar todo lo que se puede resolver en el repositorio. Los lotes conservan las pruebas, los controles, las capturas y la revisión por PR, como con ADR-0031.

## Consecuencias

**Lo que se vuelve más fácil:** un fallo pasajero ya no confunde con «el producto no existe» ni echa del backoffice; las e2e y las capturas dicen mejor qué falló.

**Lo que se vuelve más difícil:** la sesión tiene un estado más, el de «no se pudo comprobar».

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el lote 42 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-25. Falta informar a Daniel Avila de lo que cambia en el backoffice.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.

## Cierre

Se ejecutaron tres lotes entre el 2026-11-25 y el 2026-11-26, auditados por la sesión principal (diff, `npm run verify`, la suite e2e completa y las capturas cuando tocaba la interfaz). Los fusiona Sebastián Avila:

| Lote | Elementos | PR |
|---|---|---|
| 40, registros y sesión del backoffice | PBI-0256, PBI-0257 y PBI-0263 | [PR #101](https://github.com/sebastianaviladev01-xyz/WebStore/pull/101) |
| 41, e2e y herramientas de QA visual | PBI-0259, PBI-0260 y PBI-0261 | [PR #100](https://github.com/sebastianaviladev01-xyz/WebStore/pull/100) |
| 42, proceso y cierre documental | PBI-0258, PBI-0262, los registros y este cierre | El PR del lote 42 |

- **Lote 40:** `npm run verify` en verde (frontend 461, 20 pruebas nuevas). La suite e2e completa dio 401 de 402: falló por 0,34 px una prueba del diálogo de temas que el lote no toca; repetida cinco veces, pasó todas, y su trace se guardó (PBI-0264). Capturas del estado normal: 20 de 20 iguales. Durante la auditoría se amplió a los registros de categoría, usuario y banner, que tenían el mismo defecto (PBI-0263).
- **Lote 41:** `npm run verify` en verde (frontend 446) y la suite e2e completa, 397 de 397. El umbral de las capturas se queda en 30, con las mediciones que lo justifican.
- **Lote 42:** con los lotes 40 y 41 juntos, `npm run verify` en verde (frontend 466, BFF 755) y la suite e2e completa, 408 de 408. Además, dos cambios de documentación del proceso, provisionales, por confirmar con Sebastián Avila: el trace de una e2e intermitente al cerrar el worktree (PBI-0258) y los ámbitos de los commits (PBI-0262).

Los registros quedaron al día en el lote 42: el [backlog](../planning/backlog.md), las [decisiones pendientes](../planning/PENDING-DECISIONS.md) (fila «Hallazgos de los lotes 37 y 38: …», provisional, por confirmar con Daniel), la [trazabilidad](../planning/TRACEABILITY.md#hallazgos-de-los-lotes-37-y-38-lotes-40-a-42-2026-11-26), la [funcionalidad](../planning/FUNCIONALIDAD.md), el [índice de features](../specs/features/README.md) y el [historial del 2026-11-26](../changelog/CHANGELOG-2026-11-26.md). Otros comentarios de los informes se revisaron y no son defectos: `agent-execution.md` no pasa Prettier, pero los `.md` no se revisan con él; `npm ci` avisa de scripts de instalación que no hacen falta; y `npm run verify` ejecuta las pruebas del frontend dentro de `validate:contract`.

**Lo que queda abierto:** confirmar con Daniel los avisos de los registros y de la sesión, y con Sebastián Avila las dos reglas de proceso; PBI-0264, sin priorizar; y lo que ya estaba fuera, como al [cerrar ADR-0031](0031-cerrar-por-lotes-los-hallazgos-de-los-lotes-33-a-35.md#cierre). El PR del lote 42 incluye los lotes 40 y 41, así que se fusiona al final, después del [PR #101](https://github.com/sebastianaviladev01-xyz/WebStore/pull/101), que trae este ADR, y del [PR #100](https://github.com/sebastianaviladev01-xyz/WebStore/pull/100). Esta excepción termina al fusionarlo, y desde entonces rige [ADR-0016](0016-volver-a-un-pull-request-por-hito.md) sin excepción.

> Nota (2026-11-26): Sebastián Avila confirmó las dos reglas de proceso del lote 42 (PBI-0258 y PBI-0262), y PBI-0264 se cerró aparte, sin excepción, en la rama `feature/pbi-0264-e2e-dialogo-de-temas`.

> Nota (2026-11-27): Sebastián Avila confirmó sin esperar a Daniel los textos de los avisos de los registros y el lugar del aviso de la sesión del backoffice (lote 40; PBI-0256, PBI-0257 y PBI-0263) ([decisiones pendientes](../planning/PENDING-DECISIONS.md)).
