# Flujo de trabajo: SDD y TDD

SDD significa aquí desarrollo guiado por especificaciones versionadas en el repositorio. El flujo incorpora TDD en las áreas que define [ADR-0002](../adrs/0002-adoptar-sdd-y-tdd.md) y [STD-18](standards.md). Es el mismo flujo de IdShield, adaptado a WebStore. Los skills ayudan a producir los artefactos, pero su existencia no demuestra que se hayan ejecutado.

## Carpeta e identificadores

Cada feature tiene una carpeta `docs/specs/features/NNN-slug/` con `specification.md`, `planning.md`, `tasks.md` y `verification.md`, creados desde las [plantillas](../specs/templates/). Convenciones e índice: [`docs/specs/README.md`](../specs/README.md).

Los identificadores `REQ-01`, `AC-01`, `TASK-01` y `TEST-01` son únicos dentro de la feature. Para citarlos desde fuera de ella, se antepone la carpeta: `001-slug/AC-02`.

## Etapas

| Etapa | Skill | Entrada | Resultado | Criterio de salida y control humano |
|---|---|---|---|---|
| 1. Especificar | `sdd-specify` | Historia de usuario, actor, contexto y restricciones | `specification.md`: alcance, REQ/AC, datos, casos límite, exclusiones y preguntas | Alcance y aceptación comprobables. **Hito de alcance** aprobado por una persona. No inventar reglas de negocio ni resolver temas de [`PENDING-DECISIONS.md`](../planning/PENDING-DECISIONS.md). |
| 2. Planificar | `sdd-plan` | Spec aprobada, [estándares](standards.md) y arquitectura | `planning.md`: enfoque, capas, contrato del BFF, datos, riesgos y estrategia de pruebas | Solución realizable; incertidumbres de alto impacto resueltas o bloqueadas. |
| 3. Decidir y modelar | `sdd-decide` | Plan y alternativas | ADR necesarios; diagramas, contrato y dependencias entre features actualizados | **Hito de arquitectura**: capas, dependencias entre features, contrato y trade-offs revisados por una persona. Sin número fijo de ADR. |
| 4. Desglosar | `sdd-tasks` | Spec, plan y ADR aceptados | `tasks.md`: tareas pequeñas con dependencias, REQ/AC, TEST a escribir primero y evidencia esperada | Cada tarea cumple la [Definition of Ready](../development/definition-of-ready.md). |
| 5. Implementar | `sdd-implement` | Tarea preparada y alcance autorizado | Cambios incrementales siguiendo el ciclo TDD | Avance registrado solo con evidencia. Revisión adicional ante alto impacto; no pedir aprobación por cada cambio rutinario. |
| 6. Verificar e integrar | `sdd-verify` | Diff, contrato, tareas y entorno | `verification.md` con comandos, resultados, capturas y pendientes | [Definition of Done](../development/definition-of-done.md) y [revisión de PR](../development/pull-request-checklist.md); lo no ejecutado se etiqueta como tal. |
| 7. Entregar y aprender | `pr-create` y `post-merge` | Resultado funcional y verificación | Hito funcional aprobado, limitaciones y ADR actualizados; el [PR único](#un-pull-request-por-feature) de la feature y, tras su merge, el [registro de la entrega](#registro-de-la-entrega) | **Hito de entrega** aceptado por una persona; riesgos remanentes registrados en el [backlog](../planning/backlog.md). |

Con agentes, cada etapa empieza en una sesión nueva ([una sesión por etapa](../development/agent-execution.md#una-sesión-por-etapa)). Todas las etapas hacen commit en la misma rama y la feature se entrega en [un solo pull request](#un-pull-request-por-feature).

### Hitos humanos

Los hitos de alcance, arquitectura y entrega los aprueba una persona del equipo:

- Las preguntas del hito se presentan **de una en una**. Cada una lleva sus alternativas, con lo que significaría elegir cada una, la recomendación y la evidencia que la respalda (un archivo, una historia, una medida), para que la persona pueda rebatirla.
- La decisión se registra en el artefacto de la etapa: quién aprobó y cuándo. Si da lugar a un ADR, sus alternativas pasan a la tabla de opciones de la [plantilla](../adrs/0000-template.md).
- El registro es un commit de la rama de la feature. Un hito no abre un pull request, y la etapa siguiente no empieza hasta que el hito anterior está aprobado y registrado.

Las demás aprobaciones de una persona (las tareas de `tasks.md`, cada tarea ⚠ y cada bloque de implementación) se registran igual: en el artefacto y en un commit de la rama.

### Un pull request por feature

Cada feature se entrega en un solo PR hacia `dev` ([ADR-0015](../adrs/0015-entregar-cada-feature-en-un-solo-pull-request.md)). Todo su trabajo va en commits de la misma rama `feature/NNN-slug`:

| Qué | Dónde queda |
|---|---|
| Etapas 1 a 6: `specification.md` y la fila del [índice de features](../specs/features/README.md), `planning.md`, los ADR y los documentos de arquitectura que cambien, `tasks.md`, el código, las pruebas y `verification.md` | Commits de la rama, según la [convención de commits](../git/conventional-commits.md#commits-de-una-feature) |
| Hitos de alcance, arquitectura y entrega, y aprobación de las tareas, de cada tarea ⚠ y de cada bloque | Un commit de la rama que registra en el artefacto quién aprobó y cuándo |
| Entrega | El PR único de la rama hacia `dev` |
| [Registro de la entrega](#registro-de-la-entrega) | Un PR nuevo, después del merge |

- **La rama.** `sdd-specify` crea `feature/NNN-slug` desde la rama base ([transición](../git/conventional-pull-requests.md#transición)) y las etapas siguientes continúan en ella. Si la rama no existe porque las etapas anteriores ya están en `dev`, se vuelve a crear desde la base. La rama no se cierra entre etapas.
- **El PR.** Se abre con el skill [`pr-create`](../../.agents/skills/pr-create/SKILL.md) cuando `sdd-verify` ha terminado y el hito de entrega está aprobado. Una persona lo revisa, por commits y en el orden de las etapas, y lo fusiona. Ninguna etapa anterior abre un PR.
- **El CI** se ejecuta en ese PR. Hasta entonces, cada tarea ejecuta en local los [controles de su área](../development/agent-execution.md#controles-proporcionados).
- **Publicar la rama.** La rama se puede publicar en `origin` sin abrir el PR, para tener una copia y para que el equipo vea el avance. Un agente la publica solo si la persona lo pide.
- **Mientras la feature está en curso**, su fila del índice y sus artefactos están en su rama, no en `dev`.

Los cambios que no son una feature (documentación, una corrección) van, como siempre, en una rama `feature/<slug>` y un PR.

### Registro de la entrega

El PR de la feature no puede citar su propio número ni el SHA de su merge. Por eso, después de que una persona lo fusiona:

1. El skill [`post-merge`](../../.agents/skills/post-merge/SKILL.md) cierra el worktree y la rama local.
2. Una rama `feature/registrar-entrega-NNN-slug`, creada desde la rama base, lleva un commit `docs` con el registro:
   - la fila del [índice de features](../specs/features/README.md) pasa a `entregada`, con el PR y el SHA del merge;
   - `verification.md` y el Traspaso de `tasks.md` anotan el resultado del CI del PR y la entrega;
   - los documentos que la feature dejó como pendientes de entregar (arquitectura, [trazabilidad](../planning/TRACEABILITY.md)) y los elementos del [backlog](../planning/backlog.md) que cierra pasan a entregados.
3. Su PR se abre con `pr-create`. Es el único PR adicional de una feature.

El registro no cambia código ni reabre decisiones: lo que se descubra después de la entrega va al backlog.

### Implantación con un piloto

La regla de un pull request por feature se estrena con un piloto, como pidió Daniel Avila el 2026-11-13:

1. La primera feature que se entrega así se limita a un solo módulo, por ejemplo productos. Qué feature es la decide el equipo.
2. Con su PR fusionado y su registro de la entrega hecho, el equipo comprueba que el flujo funcionó como necesita. El resultado se anota en ese registro.
3. Solo después se aplica a las features siguientes. Si la revisión pide cambios en el flujo, se hacen antes, en una rama de documentación, y con un ADR nuevo si cambia la decisión de [ADR-0015](../adrs/0015-entregar-cada-feature-en-un-solo-pull-request.md).

## Etapa 5 en detalle: ciclo TDD

En las áreas con TDD obligatorio (STD-18) cada tarea sigue este ciclo:

1. **Elegir** una TASK preparada y el TEST que `tasks.md` indica escribir primero.
2. **Rojo:** escribir la prueba y ejecutarla. Debe fallar, y por el motivo esperado: un error de sintaxis, de importación o de configuración no cuenta como rojo.
3. **Verde:** escribir el código mínimo que hace pasar la prueba.
4. **Refactor:** mejorar nombres y estructura con todas las pruebas en verde.
5. **Registrar:** commit o PR con la evidencia (prueba y código en el mismo incremento, con la prueba visible antes de la implementación cuando el historial lo permita), según la [convención de commits](../git/conventional-commits.md).

Qué se prueba primero en cada capa:

| Capa | Primera prueba | Dónde vive |
|---|---|---|
| BFF: `domain/` | Reglas e invariantes del concepto (`*.rules.mjs`) | `backend/tests/unit/` |
| BFF: `application/` | Caso de uso o consulta con el store y la seguridad pasados como parámetros: caso feliz, regla incumplida y fallo | `backend/tests/unit/` |
| BFF: `api/` | Contrato: códigos de estado, validación, formato de error y autorización por rol | `backend/tests/integration/`, con un archivo de estado temporal |
| Frontend: `domain/` | Reglas puras e invariantes del modelo (`*.rules.ts`) | `*.spec.mjs` junto al código |

Fuera de las áreas obligatorias:

- Frontend `application/` y `data/`: la prueba primero es recomendable, y será obligatoria cuando exista un entorno de pruebas de Angular (PBI-0025 del [backlog](../planning/backlog.md)).
- Componentes y e2e: se derivan de los AC y pueden escribirse junto al código. La suite e2e se ejecuta con `npm run test:e2e` desde `frontend/` ([ADR-0009](../adrs/0009-usar-node-test-y-playwright-para-las-pruebas.md)).
- BFF `infrastructure/`: integración contra el archivo de estado real en una copia, con la prueba primero como recomendación.

Antes de modificar código existente sin pruebas, se escribe una **prueba de caracterización** que fija el comportamiento actual.

### Cambios que tocan la interfaz

Un cambio de plantillas, estilos o tokens no debe alterar el diseño salvo que se pida ([STD-12](standards.md)):

1. Antes de cambiar el código, captura las pantallas afectadas en escritorio y móvil ([QA visual con Chrome](../development/local-environment.md#qa-visual-con-chrome)).
2. Después del cambio, repite las mismas capturas.
3. Compáralas ([comparar capturas](../development/agent-execution.md#comparar-capturas)) y registra el resultado en el commit de la tarea o en `verification.md`: iguales o con los cambios pedidos.

### Ejecución por bloques

Con agentes de IA, la etapa 5 se ejecuta por bloques: una fase de `tasks.md` o un tramo de 6 a 8 tareas que termina antes de cada tarea ⚠. Cada bloque es una sesión nueva sobre el worktree de la feature y parte de la sección Traspaso de `tasks.md`. Las reglas completas están en la guía de [ejecución por agentes](../development/agent-execution.md).

## Disparadores de revisión adicional

Pedir revisión humana antes de ejecutar una acción irreversible o de alto impacto:

- Cambio incompatible del contrato del BFF.
- Cambio de autenticación, roles o permisos.
- Cambio del formato del estado del BFF (`schemaVersion`) o de su migración.
- Riesgo de pérdida o corrupción de datos: stock, pedidos, clientes o reclamos.
- Cambio del diseño visual o de la identidad de marca ([sistema visual](../../frontend/docs/VISUAL-SYSTEM.md)).
- Cambio de textos legales, plazos del libro de reclamaciones o tratamiento de datos personales.
- Integración con un servicio externo real: pasarela de pago, correo o facturación.

Antes de pedirla, preparar el diseño o diff, el impacto, las alternativas y las pruebas disponibles, para que la revisión sea concreta.

Si falta una decisión crítica, registrar la pregunta y avanzar solo en trabajo independiente. La existencia de un skill no autoriza a desplegar, enviar correo real, crear issues ni acceder a servicios externos.

## Trazabilidad y evidencia

Mantener la cadena REQ → AC → TASK → commit o PR → TEST → ejecución en `verification.md`. Al cambiar un requisito, actualizar el plan, las tareas y las pruebas afectadas; no borrar la historia de un ADR aceptado.

| Control | Documentado | Configurado | Ejecutado |
|---|---|---|---|
| Pruebas | Hay estrategia y casos | Hay runner y comando real | Ejecución identificada con resultado |
| CI | Hay intención de pipeline | Existe un workflow válido | Una revisión concreta pasó |
| Capturas antes y después | Pantallas y anchos acordados | Chrome y los scripts de QA disponibles | Comparación registrada con su revisión |

No marcar casillas por intención. Una prueba que solo reproduce la implementación aporta poco: priorizar comportamiento observable, límites y fallos de integración.

Ver también: [excepciones](../development/exceptions.md).
