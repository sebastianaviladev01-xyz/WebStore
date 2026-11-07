# 0008. Trabajar con Claude Code o Codex mediante adaptadores por herramienta

- Estado: Aceptada
- Fecha: 2026-11-06

## Contexto

### Por qué había que decidir

WebStore adopta la estructura de IdShield ([ADR-0004](0004-adoptar-la-estructura-de-repositorio-de-idshield.md)), versiona `.claude/` y `.agents/` y trabaja con el [flujo SDD + TDD](../architecture/development-workflow.md) ([ADR-0002](0002-adoptar-sdd-y-tdd.md)) mediante agentes de IA. El equipo alterna Claude Code y Codex, y cada herramienta carga las reglas y los skills de forma distinta: Claude Code solo lee `.claude/skills/` y carga lo que importa un `CLAUDE.md`; Codex lee `AGENTS.md` de la raíz al directorio de trabajo y los skills de `.agents/skills/`. IdShield resolvió lo mismo con adaptadores por herramienta y un catálogo de niveles (ADR-0018 de IdShield), que el equipo ya usa.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Adaptadores y catálogo de IdShield (elegida)** | Reglas en los `AGENTS.md`, skills canónicos en `.agents/skills/`, punteros en `.claude/skills/`, un adaptador por herramienta en `.agents/adapters/` y los modelos solo en `.agents/execution-catalog.json` | Misma forma de trabajar que en IdShield; una sola fuente por regla, skill y modelo | Hay que mantener un adaptador por herramienta y los punteros |
| Copiar skills y reglas en la carpeta de cada herramienta | `.claude/skills/` y `.codex/skills/` con el contenido completo | Cada herramienta lo encuentra sin indirección | Dos fuentes de verdad que divergen; Codex ya lee `.agents/skills/` |
| Solo Claude Code | Skills directamente en `.claude/skills/` y modelos nombrados en la guía | Menos archivos | Deja fuera a quien trabaja con Codex y obliga a reescribir la guía si cambia un modelo |

## Decisión

Usaremos el esquema de IdShield, adaptado a WebStore:

- Las reglas siguen en los `AGENTS.md` y los skills en `.agents/skills/`. Lo propio de cada herramienta vive en su adaptador, `.agents/adapters/<herramienta>.md`: cómo invoca los skills, entra en un worktree, fija el modelo y el esfuerzo, delega, levanta los servidores de desarrollo y sigue la CI.
- Claude Code carga su adaptador desde el `CLAUDE.md` raíz, que importa `@AGENTS.md` y `@.agents/adapters/claude-code.md`. Los `CLAUDE.md` de `frontend/` y `backend/` solo importan su `AGENTS.md`. Codex lee su adaptador porque `AGENTS.md` se lo pide.
- Cada skill tiene un puntero en `.claude/skills/<nombre>/SKILL.md` con el mismo `name` y `description`. Los skills de diseño de terceros de `frontend/.agents/` y `frontend/.claude/` quedan fuera de este esquema ([`.agents/README.md`](../../.agents/README.md)).
- Las tareas indican un nivel (`ligero`, `estándar`, `avanzado`) y un esfuerzo, nunca un modelo. El catálogo de niveles parte del de IdShield (versión 1.0.0) sin cambios de modelos, con su rol de revisión ciega y sus modelos excluidos ([guía de ejecución](../development/agent-execution.md#delegar-por-nivel-y-esfuerzo)).
- Los worktrees de las features se crean en `.worktrees/NNN-slug`, con una sesión nueva por etapa y por bloque.
- Las piezas de IdShield que dependen de contenedores, .NET, Azure o PostgreSQL se sustituyen por los comandos npm del host. La guía de ejecución incorpora dos controles propios de WebStore: la comparación de capturas antes y después de cada cambio que toca la interfaz ([STD-12](../architecture/standards.md)) y las copias de datos con `WEBSTORE_DATA_FILE` ([STD-09](../architecture/standards.md)).
- `tools/check-agents.mjs` comprueba la estructura: el catálogo, los niveles que nombran los skills, los punteros y los imports de `CLAUDE.md`.

*Motivo:* el equipo ya trabaja así en IdShield; repetir el esquema permite alternar herramientas y proyectos con las mismas reglas, y cambiar un modelo tocando solo el catálogo.

## Consecuencias

**Lo que se vuelve más fácil:**

- Una persona puede continuar con Codex una feature empezada con Claude Code, o al revés, con los mismos artefactos, skills y reglas.
- Un cambio de modelo o de herramienta se absorbe en el catálogo o en su adaptador, sin tocar el flujo.
- Quien viene de IdShield encuentra los mismos skills, etapas e hitos humanos.

**Lo que se vuelve más difícil:**

- Hay que mantener los adaptadores, los punteros y el catálogo. Un `CLAUDE.md` sin `@AGENTS.md` deja a Claude Code sin reglas; `tools/check-agents.mjs` lo detecta.
- Codex no ve las reglas de `frontend/` o `backend/` si no lee su `AGENTS.md`: depende de que cumpla la regla de `AGENTS.md`.
- El catálogo de los dos proyectos puede divergir. Si IdShield cambia de modelos, WebStore lo revisa y actualiza su catálogo por separado.
- La equivalencia entre modelos es un criterio heredado de IdShield, no una medida de WebStore. El adaptador de Codex y sus modelos siguen provisionales hasta que una persona los valide.

**Fuera de alcance:**

- Otras herramientas, como OpenCode o GitHub Copilot, y otros proveedores de modelos.
- Los skills de diseño de terceros de `frontend/`, que gestiona su propia herramienta de instalación.
- Credenciales, precios o configuración personal de las herramientas.
