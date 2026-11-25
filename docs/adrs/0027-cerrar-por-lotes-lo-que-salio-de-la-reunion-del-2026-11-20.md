# 0027. Cerrar por lotes lo que salió de la reunión del 2026-11-20, como excepción al flujo

- Estado: Aceptada
- Fecha: 2026-11-24

Decidida por Sebastián Avila el 2026-11-24: «cerremos todos los pendientes por lotes excepto terceros y similares». Es una [excepción](../development/exceptions.md) a [ADR-0002](0002-adoptar-sdd-y-tdd.md) y a [ADR-0016](0016-volver-a-un-pull-request-por-hito.md), con la misma forma que [ADR-0021](0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md) y [ADR-0025](0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md).

## Contexto

### Por qué había que decidir

La reunión de Daniel y Sebastián del 2026-11-20 dejó PBI-0238 a PBI-0244 en el [backlog](../planning/backlog.md) (PR #87). Con el flujo vigente, cada grupo sería una feature con seis etapas y un PR por hito. Sebastián Avila pidió cerrarlos ya, por lotes, menos lo que depende de terceros y lo similar.

- **Regla y ámbito:** STD-16 y STD-17 y el flujo SDD (etapas, sesiones por etapa, hitos humanos y un PR por hito), en el storefront, el backoffice y el BFF.
- **Riesgo:** sin especificación, plan ni hitos por elemento, una lectura de la reunión que correspondía confirmar con Daniel se implementa antes de que la revise. Se exponen el equipo, que recibe PR grandes, y Daniel, que confirma después lo provisional.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Lotes por área, un PR por lote (elegida)** | Como ADR-0021 y ADR-0025: cada lote es una rama `feature/lote-NN-slug` y un PR, sin documentos SDD por elemento | Rápido y conocido; cada PR es revisable | Menos puntos de control; PR grandes |
| Confirmar antes con Daniel las lecturas dudosas | Construir solo lo que no tiene dudas | Nada provisional | Deja pendiente lo que más pidió (PBI-0240) |
| SDD completo, una feature por área | Seis etapas e hitos por feature | Toda la trazabilidad | No cabe en el plazo |

## Decisión

Cerraremos por lotes PBI-0238, PBI-0239, PBI-0240, PBI-0243 y PBI-0244, con las reglas de ADR-0025:

1. **Lotes por área**, cada uno en `feature/lote-NN-slug`, con su worktree y un PR en borrador hacia `dev` que abre la sesión principal después de auditarlo. Los fusiona una persona. Los lotes 28 y 30 parten de `dev` y se ejecutan a la vez; el 29 parte del 28, y el 31, que toca todas las pantallas del backoffice, va al final.
2. **Lo que choca o no está decidido se decide aquí**, con la opción más apegada a lo que dijo Daniel o la más conservadora, y queda en las decisiones pendientes como «Provisional, por confirmar con Daniel». Las decisiones de partida están abajo; cada lote puede afinarlas y lo anota en su PR.
3. **Quedan fuera:**
   - lo que depende de terceros o de una validación externa: PBI-0002, 0003, 0007, 0008, 0009, 0011, 0012, 0041, 0058 y 0161;
   - lo que decide Daniel o depende del backend de producción: PBI-0004, 0005, 0043, 0197 y 0198;
   - las tareas de personas: PBI-0165, la prueba con lector de pantalla, y PBI-0225, el cronograma;
   - PBI-0241, el acceso a WhatsApp, que Daniel dejó para más adelante («eso se queda para el backlog»);
   - PBI-0242, el reparto de modelos por etapa, que es una decisión de proceso de Sebastián Avila y Daniel;
   - la marca del producto, su nombre y su logo.

**Sigue prohibido** (compensación), como en ADR-0025:

- saltarse la prueba primero en las áreas de STD-18;
- cerrar un lote sin `npm run verify` y `npm run test:e2e` en verde;
- desactivar reglas de ESLint o de Sheriff;
- cambiar el diseño visual más allá de lo que pide cada elemento, o hacerlo sin capturas (STD-12);
- cambiar el contrato del BFF sin reflejarlo en [`BFF-CONTRACT.md`](../../backend/docs/BFF-CONTRACT.md) y en el smoke test;
- que un agente haga push a `dev`, fusione un PR o cree tags;
- superar Opus 5.5 con `high`;
- lo que [`exceptions.md`](../development/exceptions.md) excluye de toda excepción.

Cada commit lleva `Refs:` con sus `PBI-NNNN` y este ADR. Los registros (backlog, decisiones pendientes, trazabilidad, historias e historial) se actualizan en el lote de cierre.

Mientras la cuenta no tenga minutos de GitHub Actions, el CI no arranca. La evidencia de cada lote es entonces `npm run verify` y `npm run test:e2e` completos en local, en la punta de su rama, y así consta en su PR.

### Lotes

| Lote | Área | Elementos |
|---|---|---|
| 28 | Color secundario de los temas | PBI-0240 |
| 29 | Editor de temas y filtro de categoría | PBI-0239, PBI-0238 |
| 30 | Avisos programados de la navegación superior | PBI-0244 |
| 31 | Íconos de los botones y de los títulos del backoffice | PBI-0243 |
| 32 | Cierre documental | Los registros de todos los lotes y el cierre de este ADR |

### Decisiones provisionales de partida

- **PBI-0240, color secundario:**
  - El tema C pasa a negro (`#1F2328`) de principal y amarillo (`#F2B705`) de secundario. «Ecom» es una lectura de la transcripción; el tema C es el de Ecom.
  - El secundario se ve en los botones secundarios: relleno del secundario con el texto y el ícono en su color de contraste («El botón podría ser amarillo con icono negro»). También en el fondo de los elementos al enfocarlos o con el puntero encima, donde hoy se usa el fondo neutro.
  - El contador del carrito lleva el fondo del secundario y el número en su color de contraste, como propuso Sebastián.
  - Se aplica a los tres temas predefinidos, porque Daniel vio lo mismo en el tema B. Todos los pares siguen cumpliendo el contraste de [ADR-0022](0022-validar-el-contraste-de-los-temas-propios.md) y [ADR-0023](0023-dar-al-tema-un-borde-del-acento-y-un-acento-fuerte-legible.md).
- **PBI-0239:** cada color del editor de temas tiene, junto al selector nativo, un campo de texto donde se escribe el código hexadecimal (`#RRGGBB`). Los dos se sincronizan, y un código mal escrito se marca sin guardar.
- **PBI-0238:**
  - El filtro «Categoría» del listado de Productos y el campo «Categoría» del registro del producto pasan a una selección con búsqueda: un autocompletado que busca en todos los niveles del árbol, muestra la ruta de cada categoría y admite una sola.
  - La lista se filtra desde el tercer carácter, y Enter elige la primera coincidencia.
  - Daniel lo pidió para el filtro; el registro del producto se incluye por el mismo motivo, el árbol de varios niveles.
- **PBI-0244:** cada aviso de la navegación superior lleva un «Desde» y un «Hasta» opcionales, con fecha y hora de Lima. El storefront solo muestra los avisos vigentes, y el backoffice marca cada aviso como programado, vigente o vencido. Un aviso sin fechas se muestra siempre, como hoy.
- **PBI-0243:**
  - Todos los botones con texto del backoffice llevan su ícono a la izquierda.
  - El título de cada página lleva el ícono de su módulo, el mismo del menú lateral.
  - Los botones que ya tienen ícono no cambian.

*Motivo:* Sebastián Avila pidió cerrar los pendientes ya; los lotes conservan lo que protege el resultado (prueba primero, controles, capturas y revisión por PR), como con ADR-0017, ADR-0021 y ADR-0025.

## Consecuencias

**Lo que se vuelve más fácil:** presentar a Daniel construido lo que pidió en la reunión del 2026-11-20.

**Lo que se vuelve más difícil:**

- PR grandes.
- Decisiones que Daniel puede pedir rehacer, sobre todo el reparto del color secundario (PBI-0240) y el alcance de los íconos (PBI-0243).

**Vigencia y cierre:**

- Responsable: Sebastián Avila. Termina cuando se fusiona el lote 32 o cuando él la retira.
- Aprobación: Sebastián Avila, 2026-11-24. Falta informar a Daniel Avila.
- Al cerrar, se quita de «Excepciones vigentes» y el flujo de ADR-0016 vuelve a regir sin excepción.

## Cierre

Se ejecutaron cinco lotes el 2026-11-24, cada uno con su rama y su PR en borrador hacia `dev`, auditados por la sesión principal (diff, `npm run verify` y e2e completo, y capturas cuando tocaba la interfaz). Los fusiona Sebastián Avila:

| Lote | Elementos | PR |
|---|---|---|
| 28, color secundario de los temas ([ADR-0028](0028-hacer-visible-el-secundario-en-la-tienda-e-invertir-el-tema-c.md)) | PBI-0240 | [#90](https://github.com/sebastianaviladev01-xyz/WebStore/pull/90), fusionado en `dev` (`dfdf15f`) |
| 29, editor de temas y filtro de categoría | PBI-0239 y PBI-0238 | [#91](https://github.com/sebastianaviladev01-xyz/WebStore/pull/91) |
| 30, avisos programados de la navegación superior | PBI-0244 | [#89](https://github.com/sebastianaviladev01-xyz/WebStore/pull/89), fusionado en `dev` (`3ea8ac4`) |
| 31, íconos de los botones y de los títulos del backoffice | PBI-0243 | [#92](https://github.com/sebastianaviladev01-xyz/WebStore/pull/92) |
| 32, cierre documental | Los registros y este cierre | El PR del lote 32 |

Cada lote cerró sus elementos con `npm run verify` y la suite e2e completa en verde en la sesión principal: 372 de 372 en el lote 28, 370 de 370 en el 30, 379 de 379 en el 29 y 383 de 383 en el 31. El lote 28 registró su decisión de arquitectura en [ADR-0028](0028-hacer-visible-el-secundario-en-la-tienda-e-invertir-el-tema-c.md). Los hallazgos fuera de alcance que anotaron los PR tienen su PBI en el [backlog](../planning/backlog.md): PBI-0246 (la vigencia de los banners acepta fechas inexistentes), PBI-0247 (el botón principal de un tema propio con un principal casi igual a su contraste), PBI-0248 (el hueco de la barra fija de la ficha a 375 px) y PBI-0249 (la tuerca del modo demo tapa un «Eliminar» de Productos), en `propuesta`; y PBI-0250, la contradicción de `VISUAL-SYSTEM.md` sobre el menú del celular, que corrigió el lote 32.

Los registros quedaron al día en el lote 32: el [backlog](../planning/backlog.md), las [decisiones pendientes](../planning/PENDING-DECISIONS.md) (las filas «Reunión del 2026-11-20» dicen qué quedó construido, y cada detalle que no se decidió en la reunión dice «Provisional, por confirmar con Daniel»), la [trazabilidad](../planning/TRACEABILITY.md#reunión-del-2026-11-20-lotes-28-a-32-2026-11-24), la [funcionalidad](../planning/FUNCIONALIDAD.md), las [historias de usuario](../planning/user-stories/user-stories.md) (US01, US15 y US23) y el [historial del 2026-11-24](../changelog/CHANGELOG-2026-11-24.md).

**Lo que queda abierto**, con su motivo en la fila de cada elemento del backlog:

- **Daniel:** confirmar las decisiones provisionales, sobre todo el reparto del color secundario (PBI-0240, [ADR-0028](0028-hacer-visible-el-secundario-en-la-tienda-e-invertir-el-tema-c.md)) y el alcance de los íconos (PBI-0243); decidir el acceso a WhatsApp o un asistente propio (PBI-0241), que dejó para el backlog; y la marca del producto (nombre y logo).
- **Sebastián Avila y Daniel:** el reparto de modelos por etapa (PBI-0242), que choca con el tope vigente y se decide en un ADR si cambia.
- **Hallazgos de los lotes:** PBI-0246 a PBI-0249, sin priorizar.
- **Lo que ya estaba fuera:** terceros, personas (PBI-0165 y PBI-0225) y el backend de producción, como al [cerrar ADR-0025](0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md#cierre).

Falta informar a Daniel Avila, como decía la aprobación. Los PR de los lotes 29 y 31 seguían abiertos al cerrar este ADR. Están apilados: el lote 31 parte del 29 y el 32 parte del 31, así que conviene fusionar el #91, después el #92 y al final el del lote 32. No queda ninguna excepción vigente: esta termina al fusionar el PR del lote 32, el último, y desde entonces rige [ADR-0016](0016-volver-a-un-pull-request-por-hito.md) sin excepción.
