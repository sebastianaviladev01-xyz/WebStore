# AGENTS.md

Guía operativa para agentes de IA y desarrolladores. Este archivo **no** describe la arquitectura ni el stack: los enlaza, para que haya una sola fuente de verdad.

## Proyecto

WebStore es una tienda en línea: Storefront (tienda pública) y Admin (backoffice) en Angular, en `frontend/`, y un BFF de prueba en Node.js, en `backend/`, que es la única fuente de datos de ambos.

## Leer antes de cambiar código

| Tema | Documento |
|---|---|
| Incorporación de personas nuevas: accesos, primer día y ruta de lectura | [`docs/development/onboarding.md`](docs/development/onboarding.md) |
| Cómo instalar, ejecutar y verificar | [`README.md`](README.md) |
| Vista de sistema, contenedores y principios | [`docs/architecture/README.md`](docs/architecture/README.md) |
| Estándares verificables (`STD-NN`) | [`docs/architecture/standards.md`](docs/architecture/standards.md) |
| Flujo de trabajo SDD + TDD | [`docs/architecture/development-workflow.md`](docs/architecture/development-workflow.md) |
| Ejecución por agentes: worktree, sesiones por etapa y por bloque, nivel y esfuerzo, controles, capturas y evidencia | [`docs/development/agent-execution.md`](docs/development/agent-execution.md) |
| Definition of Ready, Definition of Done, revisión de PR y excepciones | [`docs/development/`](docs/development/) |
| Convenciones de commits, ramas, pull requests y versiones | [`docs/git/conventional-commits.md`](docs/git/conventional-commits.md) y [`docs/git/conventional-pull-requests.md`](docs/git/conventional-pull-requests.md) |
| Entorno local: requisitos, servidores, datos del BFF y QA visual | [`docs/development/local-environment.md`](docs/development/local-environment.md) |
| Puesta en marcha de la instalación de un cliente: sin modo demo, contraseñas propias, logo y tema activo | [`docs/development/puesta-en-marcha.md`](docs/development/puesta-en-marcha.md) |
| Arquitectura del frontend: capas, reglas de dependencia y convenciones | [`frontend/architecture.md`](frontend/architecture.md) |
| Reglas para agentes en el frontend | [`frontend/AGENTS.md`](frontend/AGENTS.md) |
| Arquitectura del BFF de prueba | [`backend/architecture.md`](backend/architecture.md) |
| Reglas para agentes en el BFF | [`backend/AGENTS.md`](backend/AGENTS.md) |
| Contrato HTTP entre frontends y BFF | [`backend/docs/BFF-CONTRACT.md`](backend/docs/BFF-CONTRACT.md) |
| Sistema visual: paleta, tipografía y tokens | [`frontend/docs/VISUAL-SYSTEM.md`](frontend/docs/VISUAL-SYSTEM.md) |
| Decisiones de arquitectura | [`docs/adrs/`](docs/adrs/) |
| Alcance, trazabilidad y decisiones pendientes | [`docs/planning/`](docs/planning/) |
| Historias de usuario | [`docs/planning/user-stories/user-stories.md`](docs/planning/user-stories/user-stories.md) |
| Backlog de mejoras pendientes: propuestas, priorizadas y su origen | [`docs/planning/backlog.md`](docs/planning/backlog.md) |
| Vocabulario de negocio: términos canónicos y su nombre en el código | [`docs/architecture/glosario.md`](docs/architecture/glosario.md) |
| Especificaciones por feature | [`docs/specs/README.md`](docs/specs/README.md) |
| Skills de IA (agnósticos de herramienta) | [`.agents/README.md`](.agents/README.md) |
| Lo propio de cada herramienta de IA (Claude Code, Codex): skills, worktrees, servidores, modelo y esfuerzo | [`.agents/adapters/`](.agents/adapters/) ([ADR-0008](docs/adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)) |
| Catálogo de niveles de ejecución: qué modelo y esfuerzo usa cada herramienta en cada nivel | [`.agents/execution-catalog.json`](.agents/execution-catalog.json) |

## Orientación para agentes

- Al empezar, lee el adaptador de tu herramienta: [`claude-code.md`](.agents/adapters/claude-code.md), que Claude Code carga desde `CLAUDE.md`, o [`codex.md`](.agents/adapters/codex.md). Si tu herramienta no tiene adaptador, sigue las reglas generales y avisa.
- Antes de tocar `frontend/` o `backend/`, lee su `AGENTS.md`: no todas las herramientas lo cargan solas.
- Los skills se nombran sin prefijo (`sdd-plan`). Cómo se invocan en tu herramienta está en su adaptador. Los skills de diseño de `frontend/.agents/` y `frontend/.claude/` son de terceros y no forman parte del flujo.
- El flujo SDD + TDD está adoptado y vigente ([ADR-0002](docs/adrs/0002-adoptar-sdd-y-tdd.md)). Sus reglas no se rediseñan dentro de una tarea.
- Si la persona es nueva o pide orientación general, usa el skill [`onboarding`](.agents/skills/onboarding/SKILL.md). Si pregunta si está todo listo para trabajar, usa [`ready-check`](.agents/skills/ready-check/SKILL.md) en lugar de una auditoría abierta.
- Si encuentras un hueco o una contradicción real en la documentación, repórtalo aparte, con archivo y línea, y propón el cambio en una rama `feature/*` de documentación. No lo mezcles con la tarea.
- El estado de cada feature y el siguiente trabajo están en el [índice de features](docs/specs/features/README.md). Si el siguiente trabajo figura como «por decidir», pregunta; no lo elijas.
- Si una persona te enseña una regla del flujo que no está en el repositorio, propón escribirla en el documento que corresponda, no solo en tu memoria.
- Una mejora o deuda fuera del alcance de la tarea se anota en el [backlog](docs/planning/backlog.md) con su origen. No la priorizas sin que te lo pidan. Todo hallazgo fuera de alcance (defecto, deuda o prueba intermitente) tiene su PBI, no solo una línea en `verification.md` o en un PR.
- Una pregunta de negocio que las fuentes (notas de reunión, chats) no responden de forma explícita no la decide quien aprueba el hito: va a [decisiones pendientes](docs/planning/PENDING-DECISIONS.md) para quien decide el producto, con las citas y la pregunta, y la feature queda bloqueada hasta su respuesta. Las preguntas técnicas o de proceso sí las responde quien aprueba el hito ([hitos humanos](docs/architecture/development-workflow.md#hitos-humanos)).

## Mapa del repositorio

| Carpeta | Contenido |
|---|---|
| `frontend/` | Workspace Angular: Storefront (`src/`) y Admin (`projects/admin/`) |
| `backend/` | BFF de prueba en Node.js, sin dependencias |
| `docs/` | Arquitectura de sistema, ADR, proceso, planificación, especificaciones e historial de cambios |
| `tools/` | Validación de la estructura del repositorio y de la configuración de agentes |
| `.agents/` | Skills, adaptadores por herramienta y catálogo de niveles de los agentes de IA |
| `.claude/` | Punteros a los skills y servidores de desarrollo (`launch.json`) de Claude Code |
| `.github/` | CI y plantilla de pull request |

Lo que IdShield tiene y WebStore no (base de datos, despliegue, contenedores, servidor de producción) está explicado en [ADR-0004](docs/adrs/0004-adoptar-la-estructura-de-repositorio-de-idshield.md).

## Comandos

Todo se ejecuta en el host con npm, desde la raíz ([entorno local](docs/development/local-environment.md)):

```bash
npm run setup              # dependencias de la raíz y de frontend/ (npm ci); el BFF no tiene
npm run start:bff          # BFF de prueba: http://localhost:3000
npm run start:storefront   # Storefront: http://localhost:4200
npm run start:admin        # Admin: http://localhost:4300
npm run verify             # agentes, sintaxis, formato, lint, arquitectura, build, pruebas y contrato
npm run test:e2e           # e2e con Playwright (unos minutos; en segundo plano si la herramienta limita la duración)
npm run audit:all          # npm audit de la raíz y de frontend/
npm run check:agents       # catálogo, punteros de .claude/skills/ e imports de los CLAUDE.md (ADR-0008)
```

Qué control corresponde a cada tarea: [controles proporcionados](docs/development/agent-execution.md#controles-proporcionados).

## Flujo de trabajo SDD + TDD

Cada feature se desarrolla en `docs/specs/features/NNN-slug/` siguiendo el [flujo de trabajo](docs/architecture/development-workflow.md) ([ADR-0002](docs/adrs/0002-adoptar-sdd-y-tdd.md)):

1. `sdd-specify` → `sdd-plan` → `sdd-decide` → `sdd-tasks` → `sdd-implement` → `sdd-verify`. Cada etapa empieza en una sesión nueva y cada hito cierra un PR.
2. Hay hitos humanos de alcance, arquitectura y entrega. No los des por aprobados sin evidencia.
3. En las áreas de STD-18 la prueba se escribe antes que el código.
4. La implementación se hace en un worktree por feature y por bloques de tareas, cada uno con el nivel y el esfuerzo que indica `tasks.md`, resueltos para tu herramienta en el [catálogo](.agents/execution-catalog.json). Al terminar un bloque, informa y espera la aprobación antes del siguiente.
5. Cada tarea ejecuta los controles de su área y deja la evidencia en el commit. Si toca la interfaz, compara capturas antes y después (STD-12).
6. Si la herramienta bloquea la escritura de la sesión, no escribas por la terminal para saltártelo: haz commit de lo que puedas y continúa en una sesión nueva ([bloqueo](docs/development/agent-execution.md#bloqueo-de-escritura-de-la-sesión)).

## Reglas

- No copies a este archivo el stack ni las reglas de arquitectura: enlázalos.
- Cada aplicación (`frontend/`, `backend/`) tiene `architecture.md` (diseño), `AGENTS.md` (reglas que especializan estas) y `CLAUDE.md` (solo importa `@AGENTS.md`).
- Mantén una sola fuente de verdad por contrato, versión o decisión. Distingue lo diseñado de lo implementado y medido.
- Toda funcionalidad nueva parte de `docs/specs/features/NNN-slug/specification.md`.
- Trabaja en una rama `feature/*` y sigue las [convenciones de commits, ramas y pull requests](docs/git/) ([ADR-0005](docs/adrs/0005-adoptar-convenciones-de-versionamiento-y-entrega.md)). Los agentes no hacen push a `dev`, `release/*` ni `main`, no fusionan PR y no crean tags. Abren el PR con el skill [`pr-create`](.agents/skills/pr-create/SKILL.md).
- Respeta las reglas de dependencia de cada aplicación. Si Sheriff o ESLint bloquean un cambio, corrige el diseño; no desactives la regla.
- No cambies el diseño visual sin que se pida (STD-12).
- Al cambiar comportamiento, actualiza la trazabilidad y las pruebas afectadas. No escribas pruebas que solo copien la implementación.
- Las versiones exactas viven solo en los manifiestos (`package.json`).
- Una decisión de arquitectura nueva o modificada se registra como ADR en `docs/adrs/` a partir de [`0000-template.md`](docs/adrs/0000-template.md).
- No escribas credenciales, hosts ni secretos en el código ni en la documentación. `backend/data.json` no se versiona; para pruebas que modifiquen datos usa una copia con `WEBSTORE_DATA_FILE` (STD-09).
- Antes de borrar o sobrescribir algo, revísalo; si hay duda, muévelo.
- La documentación se escribe en español. Los nombres de negocio van en español y los términos técnicos en inglés ([ADR-0003](docs/adrs/0003-usar-espanol-para-el-vocabulario-de-negocio.md)). Usa los términos del [glosario](docs/architecture/glosario.md).
- Los documentos de `docs/changelog/` son historia: no se reescriben.
