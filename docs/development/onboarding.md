# Guía de incorporación

Esta guía es para quien empieza en WebStore, junior o senior. Todas las personas siguen la [ruta común](#ruta-común-de-lectura) y después la de su nivel.

La guía solo ordena y enlaza: no define reglas. Si contradice un documento enlazado, manda el documento enlazado.

Si trabajas con un agente de IA, empieza pidiéndole el skill `onboarding`: recorre esta guía contigo y prepara el entorno con tu visto bueno. Cómo se invoca un skill en tu herramienta (Claude Code o Codex) está en su [adaptador](../../.agents/adapters/).

## Accesos y herramientas

| Qué | Para qué | Dónde se explica |
|---|---|---|
| Acceso al repositorio en GitHub, con permiso para abrir pull requests | Clonar, publicar ramas `feature/*` y abrir PR | [Convención de ramas y pull requests](../git/conventional-pull-requests.md) |
| `git` y, para abrir PR desde la terminal, `gh` con `gh auth login` hecho | Ramas, PR y comprobaciones de merge | [Crear un pull request](../git/conventional-pull-requests.md#crear-un-pull-request) |
| Node.js y npm en el host, en una versión admitida por `engines` | Ejecutar el BFF, los frontends y los controles | [Requisitos del host](local-environment.md#requisitos-del-host) |
| Google Chrome | QA visual y capturas antes y después | [QA visual con Chrome](local-environment.md#qa-visual-con-chrome) |
| Una herramienta de IA con adaptador (hoy, Claude Code o Codex) | Ejecutar el flujo con agentes, con el nivel y el esfuerzo de cada tarea | [Equivalencias por herramienta](agent-execution.md#equivalencias-por-herramienta) |

WebStore no usa contenedores, bases de datos ni servicios en la nube: todo corre en el host con npm ([ADR-0004](../adrs/0004-adoptar-la-estructura-de-repositorio-de-idshield.md)).

## Primer día

1. Clona el repositorio y trabaja desde su raíz.
2. Comprueba los [requisitos del host](local-environment.md#requisitos-del-host).
3. Instala las dependencias: [antes de la primera vez](local-environment.md#antes-de-la-primera-vez).
4. [Levanta el proyecto](local-environment.md#levantar), [comprueba que responde](local-environment.md#comprobar-que-responde), [pruébalo a mano](local-environment.md#probar-a-mano) y [apágalo](local-environment.md#apagar).
5. Ejecuta `npm run verify` desde la raíz: debe terminar en verde.
6. Pide a tu agente el skill `ready-check`. Al final del primer día debe responder «Listo para trabajar».

Si algo falla, consulta [problemas frecuentes](local-environment.md#problemas-frecuentes).

## Ruta común de lectura

En este orden:

| # | Documento | Qué te llevas |
|---|---|---|
| 1 | [`AGENTS.md`](../../AGENTS.md) y el [README](../../README.md) | El mapa del repositorio, los comandos y las reglas que siguen personas y agentes |
| 2 | [Producto](../planning/PRODUCT.md) y [alcance](../planning/SCOPE.md) | Qué es WebStore, para quién y qué entra en el MVP |
| 3 | [Arquitectura del sistema](../architecture/README.md) | Storefront, Admin y BFF de prueba, una sola fuente de datos y los roles |
| 4 | [Glosario](../architecture/glosario.md) | Los nombres de negocio en español y su nombre en el código y en el contrato |
| 5 | [Flujo SDD + TDD](../architecture/development-workflow.md) | Las 7 etapas, los hitos humanos, el ciclo TDD y un PR por hito |
| 6 | [Especificaciones por feature](../specs/README.md) y su [índice](../specs/features/README.md) | La carpeta de una feature, los identificadores REQ, AC, TASK y TEST, y los estados |
| 7 | [Historias de usuario](../planning/user-stories/user-stories.md) y [backlog](../planning/backlog.md) | De dónde salen los requisitos y qué queda pendiente |
| 8 | [Ejecución por agentes](agent-execution.md) | Sesiones por etapa y por bloque, worktrees, nivel y esfuerzo, controles y evidencia |
| 9 | [Entorno local](local-environment.md) | Servidores, datos del BFF y sus copias, QA visual y problemas frecuentes |
| 10 | [Convención de commits](../git/conventional-commits.md) y, de la [de ramas y PR](../git/conventional-pull-requests.md), los apartados Principios, Modelo de ramas, Transición, Crear un pull request y Agentes de IA | Cómo se nombran ramas, commits y PR, y quién hace qué |
| 11 | [Definition of Ready](definition-of-ready.md), [Definition of Done](definition-of-done.md) y [revisión de PR](pull-request-checklist.md) | Cuándo una tarea puede empezar y cuándo está terminada |
| 12 | El `AGENTS.md` y el `architecture.md` de tu área: [frontend](../../frontend/AGENTS.md) o [backend](../../backend/AGENTS.md), y el [contrato del BFF](../../backend/docs/BFF-CONTRACT.md) | Las capas, las convenciones y las pruebas de tu área |

Si trabajas en la interfaz, añade el [sistema visual](../../frontend/docs/VISUAL-SYSTEM.md).

## Ruta junior

### Conceptos

| Concepto | Dónde lo explica el repositorio | Para profundizar |
|---|---|---|
| SDD: desarrollo guiado por especificaciones | [Flujo SDD + TDD](../architecture/development-workflow.md) y [ADR-0002](../adrs/0002-adoptar-sdd-y-tdd.md) | [Martin Fowler — Specification By Example](https://martinfowler.com/bliki/SpecificationByExample.html) |
| TDD y prueba de caracterización | [Ciclo TDD](../architecture/development-workflow.md#etapa-5-en-detalle-ciclo-tdd) | [Kent Beck — Test Driven Development: By Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/) |
| Puertos y adaptadores en el frontend | [`frontend/architecture.md` §2](../../frontend/architecture.md#2-estilo-arquitectónico) | [Alistair Cockburn — Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) |
| BFF (Backend for Frontend) | [Vista de sistema](../architecture/README.md) y [`backend/architecture.md`](../../backend/architecture.md) | [Sam Newman — Backends For Frontends](https://samnewman.io/patterns/architectural/bff/) |
| ADR: registro de decisiones | [ADR-0001](../adrs/0001-registrar-decisiones-de-arquitectura.md) | La [plantilla](../adrs/0000-template.md) |
| Worktree | [Un worktree por feature](agent-execution.md#un-worktree-por-feature) | [git-worktree](https://git-scm.com/docs/git-worktree) |
| Conventional Commits | [Convención de commits](../git/conventional-commits.md) | [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/) |

### Primer cambio guiado

Haz un cambio pequeño de documentación, por ejemplo corregir un enlace o una frase, con el flujo completo:

1. Una rama `feature/<slug>` según la [transición](../git/conventional-pull-requests.md#transición).
2. Un commit según la [convención](../git/conventional-commits.md).
3. El PR con el skill `pr-create`, que te pide aprobar el título y el cuerpo.
4. Tras el merge, que hace una persona, el skill `post-merge`.

### Cuándo detenerse y preguntar

- Antes de una acción de alto impacto: los [disparadores de revisión adicional](../architecture/development-workflow.md#disparadores-de-revisión-adicional).
- Cuando una tarea no cumple la [Definition of Ready](definition-of-ready.md).
- Cuando el cambio toca un tema de [`PENDING-DECISIONS.md`](../planning/PENDING-DECISIONS.md): no se resuelve por tu cuenta.
- Cuando una historia, el contrato y el código se contradicen: se registra como pregunta abierta, nunca se resuelve en silencio.
- Cuando un cambio de código altera el diseño visual sin que se haya pedido.

## Ruta senior

### Decisiones

Los ADR, agrupados por tema:

| Tema | ADR |
|---|---|
| Proceso y convenciones | [0001](../adrs/0001-registrar-decisiones-de-arquitectura.md), [0002](../adrs/0002-adoptar-sdd-y-tdd.md), [0003](../adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md), [0004](../adrs/0004-adoptar-la-estructura-de-repositorio-de-idshield.md), [0005](../adrs/0005-adoptar-convenciones-de-versionamiento-y-entrega.md) y [0008](../adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md) |
| Frontend | [0006](../adrs/0006-organizar-el-frontend-por-features-y-capas.md) |
| Backend (BFF de prueba) | [0007](../adrs/0007-organizar-el-bff-en-capas.md) |
| Pruebas | [0009](../adrs/0009-usar-node-test-y-playwright-para-las-pruebas.md) |

Después: los [estándares](../architecture/standards.md) completos, el [`frontend/architecture.md`](../../frontend/architecture.md), el [`backend/architecture.md`](../../backend/architecture.md) y las [decisiones pendientes](../planning/PENDING-DECISIONS.md), que son las que hoy condicionan más trabajo.

### Revisar hitos, tareas ⚠ y PR

| Qué revisas | Qué compruebas |
|---|---|
| Hito de alcance | Cada escenario de la historia es un AC; los AC que no salen de la historia están marcados como propuestos; las contradicciones son preguntas abiertas ([relación con las historias](../specs/README.md#relación-con-las-historias-de-usuario)) |
| Hito de arquitectura | Capas, dependencias entre features, contrato del BFF y alternativas del plan y de los ADR, según el [flujo](../architecture/development-workflow.md#etapas) |
| Tarea ⚠ | Los criterios de aprobación que la propia tarea lista en `tasks.md` |
| Pull request | La [revisión de PR](pull-request-checklist.md) y cómo [revisar un pull request](../git/conventional-pull-requests.md#revisar-un-pull-request) |

Las preguntas de un hito llegan [de una en una](../architecture/development-workflow.md#hitos-humanos), con recomendación y evidencia. Si la evidencia es débil, rebátela.

## Recorrido de una feature

1. `sdd-specify` en la sesión donde empieza el trabajo. Hito de alcance y primer PR.
2. `post-merge`. En sesiones nuevas, `sdd-plan` y `sdd-decide`. Hito de arquitectura y segundo PR.
3. `post-merge`. En una sesión nueva, `sdd-tasks`: tareas, bloques, Traspaso y nivel y esfuerzo.
4. En el worktree de la feature, un bloque de `sdd-implement` por sesión. Entre un bloque y el siguiente, una persona del equipo aprueba.
5. `sdd-verify` en una sesión nueva. PR de implementación, que pueden ser varios, e hito de entrega.

Las reglas de cada paso: [etapas](../architecture/development-workflow.md#etapas), [pull requests de una feature](../architecture/development-workflow.md#pull-requests-de-una-feature), [una sesión por etapa](agent-execution.md#una-sesión-por-etapa) y [una sesión por bloque](agent-execution.md#una-sesión-por-bloque).

## Trabajar con un agente

- **El primer día:** el skill `onboarding`. **Al empezar el día o antes de una etapa:** `ready-check`.
- **Qué pedirle:** la etapa con su skill y sus argumentos. Por ejemplo, `sdd-specify` con `US06 comprar como invitado`, o `sdd-implement` con `NNN-slug fase 2`. La sintaxis de cada herramienta está en su [adaptador](../../.agents/adapters/).
- **Puedes cambiar de herramienta** entre etapas o entre bloques: la sesión nueva parte de los artefactos del repositorio, no del historial ([ADR-0008](../adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)).
- **Lo que el agente no hace:** push a `dev`, `release/*` o `main`, fusionar PR, crear tags, modificar `backend/data.json` en pruebas ni cambiar el diseño visual sin pedido.
- **Lo que le enseñes va al repositorio.** La memoria de tu agente es local y nadie más la ve. Si una regla del flujo no está escrita, pídele que la documente aquí.

## Reglas que más se olvidan

- Antes de dar por terminado un cambio, `npm run verify` desde la raíz ([`AGENTS.md`](../../AGENTS.md#reglas)).
- En las áreas de STD-18, la prueba va primero y debe fallar por el motivo esperado ([ciclo TDD](../architecture/development-workflow.md#etapa-5-en-detalle-ciclo-tdd)).
- Las pruebas que modifican datos usan una copia con `WEBSTORE_DATA_FILE` ([datos del BFF](local-environment.md#trabajar-sobre-una-copia)).
- Un cambio de interfaz lleva capturas antes y después, y no cambia el diseño sin pedido ([STD-12](../architecture/standards.md)).
- Un cambio del contrato HTTP cambia a la vez el BFF, `BFF-CONTRACT.md`, el smoke test y los adaptadores `Bff*Gateway`.
- Si Sheriff o ESLint bloquean un cambio, se corrige el diseño, no la regla.
- Sin evidencia no hay tarea hecha, y lo que no se ejecutó se dice.
- Un PR por hito, y a `dev` solo se llega por PR ([convención de ramas](../git/conventional-pull-requests.md)).
- Sin credenciales, hosts, secretos ni datos personales reales en el código, la documentación, los PR o los logs.
- Los documentos de `docs/changelog/` son historia: no se reescriben.

## Si algo falla

| Situación | Dónde mirar |
|---|---|
| Un servidor no arranca o no responde | [Problemas frecuentes](local-environment.md#problemas-frecuentes) |
| Un control de `npm run verify` falla | El mensaje del control y [Problemas frecuentes](local-environment.md#problemas-frecuentes) |
| Falta una decisión para seguir | Se registra como pregunta y se sigue solo con el trabajo independiente ([flujo](../architecture/development-workflow.md#disparadores-de-revisión-adicional)) |
| Hace falta desviarse de un estándar | [Excepciones](exceptions.md) |
