# Configuración agnóstica para agentes de IA

Esta carpeta contiene el contenido canónico que usan los agentes de IA en WebStore, independiente de la herramienta ([ADR-0008](../docs/adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)).

- `skills/<nombre>/SKILL.md`: skills según el estándar abierto [Agent Skills](https://agentskills.io/specification). El frontmatter usa solo claves del estándar (`name`, `description`, `metadata`) y `name` coincide con el nombre de la carpeta.
- `adapters/<herramienta>.md`: lo propio de cada herramienta (cómo invoca los skills, entra en un worktree, fija el modelo y el esfuerzo, delega, levanta los servidores de desarrollo y sigue la CI). No contiene reglas del flujo: solo las traduce a la herramienta.
- `execution-catalog.json`: el catálogo de niveles de ejecución, la única fuente de los modelos concretos. Para cada herramienta dice qué modelo y qué valor de esfuerzo corresponden a cada nivel (`ligero`, `estándar`, `avanzado`) y a cada rol, con sus respaldos ([delegar por nivel y esfuerzo](../docs/development/agent-execution.md#delegar-por-nivel-y-esfuerzo)).
- Las reglas para agentes no van aquí: viven en [`AGENTS.md`](../AGENTS.md) y en los `AGENTS.md` de [`frontend/`](../frontend/AGENTS.md) y [`backend/`](../backend/AGENTS.md).

## Skills disponibles

Implementan las etapas del [flujo SDD + TDD](../docs/architecture/development-workflow.md):

| Skill | Etapa |
|---|---|
| `sdd-specify` | 1. Especificar |
| `sdd-plan` | 2. Planificar |
| `sdd-decide` | 3. Decidir y modelar |
| `sdd-tasks` | 4. Desglosar |
| `sdd-implement` | 5. Implementar (ciclo TDD) |
| `sdd-verify` | 6. Verificar |

Otros skills:

| Skill | Uso |
|---|---|
| `pr-create` | Publica una rama `feature/*` y abre su PR en borrador hacia `dev` cuando la persona aprueba el título, las etiquetas y el cuerpo ([convenciones de pull requests](../docs/git/conventional-pull-requests.md)) |
| `post-merge` | Cierra un cambio cuyo PR ya está fusionado en `dev`: su worktree, su rama local y sus copias de datos, y actualiza `dev` local ([cerrar el worktree](../docs/development/agent-execution.md#cerrar-el-worktree)) |
| `ready-check` | Comprueba el entorno, el repositorio, el flujo y el estado del proyecto, y responde «Listo para trabajar» o qué falta. No cambia nada |
| `onboarding` | Acompaña la incorporación de una persona: accesos, entorno del primer día, `ready-check` y ruta de lectura de la [guía de incorporación](../docs/development/onboarding.md) |

Los skills se nombran sin prefijo en toda la documentación. Cada herramienta los invoca a su manera, según su adaptador.

### Skills de diseño de `frontend/`

`frontend/.agents/skills/` y `frontend/.claude/` contienen skills y agentes de diseño de terceros (por ejemplo, `impeccable` o `frontend-design`), instalados por una herramienta de skills y registrados en [`frontend/skills-lock.json`](../frontend/skills-lock.json). No forman parte del flujo SDD, no se editan a mano y no siguen las reglas de esta carpeta: no tienen punteros en `.claude/skills/` de la raíz ni los revisa `tools/check-agents.mjs`. Se actualizan con la misma herramienta que los instaló.

## Cómo los encuentra cada herramienta

| Herramienta | Reglas | Skills | Adaptador |
|---|---|---|---|
| Claude Code | Cada `CLAUDE.md` importa su `AGENTS.md` con `@AGENTS.md` | Lee `.claude/skills/`: cada carpeta tiene un `SKILL.md` puntero que remite al canónico. No pongas instrucciones en el puntero | [`claude-code.md`](adapters/claude-code.md), importado desde el `CLAUDE.md` raíz |
| Codex | Lee `AGENTS.md` de la raíz al directorio de trabajo | Lee `.agents/skills/` directamente | [`codex.md`](adapters/codex.md), que `AGENTS.md` pide leer |

## Añadir un skill

1. Crea `.agents/skills/<nombre>/SKILL.md`, con `<nombre>` en minúsculas, dígitos y guiones.
2. Crea el puntero `.claude/skills/<nombre>/SKILL.md` con el mismo `name` y `description`, porque Claude Code no lee `.agents/skills/`. Si recibe argumentos, añade `argument-hint` y pásalos con `$ARGUMENTS`.
3. Si implementa una etapa del flujo, enlázalo desde el [flujo de trabajo](../docs/architecture/development-workflow.md).
4. Comprueba la estructura con `node tools/check-agents.mjs`, desde la raíz.

## Añadir una herramienta

1. Crea su adaptador en `adapters/<herramienta>.md`, con las secciones de los existentes.
2. Decide cómo lo carga al empezar (un import, como en `CLAUDE.md`, o una línea en `AGENTS.md`) y añádelo a la tabla anterior.
3. Si no lee `.agents/skills/`, añade en su carpeta propia punteros equivalentes a los de `.claude/skills/`. Nunca copies el contenido.
4. Añade su entrada en `harnesses` de `execution-catalog.json`, con un modelo para cada nivel y rol, y su fila en [Equivalencias por herramienta](../docs/development/agent-execution.md#equivalencias-por-herramienta).
5. Comprueba la estructura con `node tools/check-agents.mjs`: valida el catálogo, que existe el adaptador y que `AGENTS.md` lo enlaza.
