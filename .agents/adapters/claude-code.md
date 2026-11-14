# Adaptador: Claude Code

Lo propio de Claude Code en WebStore ([ADR-0008](../../docs/adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)). Las reglas están en [`AGENTS.md`](../../AGENTS.md) y los procedimientos en los [skills](../skills/). Aquí solo se traducen a las herramientas de Claude Code. El `CLAUDE.md` raíz importa este archivo.

## Instrucciones y skills

- Cada `CLAUDE.md` importa su `AGENTS.md` con `@AGENTS.md`. No quites el import aunque Claude Code ya sepa leer `AGENTS.md`: si hay un `CLAUDE.md`, solo carga lo que ese archivo importa.
- Claude Code no lee `.agents/skills/`. Cada skill tiene un puntero en `.claude/skills/<nombre>/SKILL.md`, con el mismo `name` y `description` que el canónico, `argument-hint` si recibe argumentos y una sola línea que remite al canónico con `$ARGUMENTS`.
- Un skill se invoca con `/nombre` y sus argumentos (por ejemplo, `/sdd-implement NNN-slug fase 2`) o pidiéndolo por su nombre.
- Los skills de diseño de `frontend/.claude/skills/` son de terceros y quedan fuera del flujo ([`.agents/README.md`](../README.md#skills-de-diseño-de-frontend)). Al trabajar en `frontend/`, Claude Code puede ofrecerlos con el prefijo `frontend:`: úsalos solo si la persona los pide o la tarea es de diseño visual pedido.

## Worktrees y sesiones

- Para entrar en el worktree de una feature, usa `EnterWorktree` con `path` en `.worktrees/NNN-slug`, desde una sesión que empieza en el checkout principal. Para cambiar desde otro worktree o desde un subagente, Claude Code exige que el destino esté en `.claude/worktrees/`: en ese caso, abre una sesión nueva.
- `ExitWorktree` con `action: "keep"` vuelve al checkout principal sin borrar el worktree.
- La app de escritorio puede abrir una rama de sesión `claude/<nombre>`. Se lleva a `feature/*` según [Ramas creadas por la herramienta](../../docs/development/agent-execution.md#ramas-creadas-por-la-herramienta).
- Una sesión abierta bloquea su worktree: `git worktree list --porcelain` lo muestra como `locked claude session … (pid N)`. Para desbloquearlo, sigue el paso 4 de [Cerrar el worktree](../../docs/development/agent-execution.md#cerrar-el-worktree).
- Si una edición responde «Edits are blocked… the worktree … was set aside», aplica [Bloqueo de escritura de la sesión](../../docs/development/agent-execution.md#bloqueo-de-escritura-de-la-sesión). La causa más probable es que la sesión se archivó con un worktree del pool de la herramienta y después se desarchivó.

## Servidores de desarrollo y capturas

- [`.claude/launch.json`](../../.claude/launch.json) define `bff` (3000), `storefront` (4200) y `admin` (4300). En la app de escritorio, levántalos con `preview_start` y su nombre, y detenlos con `preview_stop` al terminar. Fuera de la app, usa los scripts `npm run start:*` de la raíz en segundo plano.
- La configuración `bff` usa `backend/data.json`. Si la tarea modifica datos o compara capturas, levanta el BFF con `WEBSTORE_DATA_FILE` apuntando a una copia, como indica [Comparar capturas](../../docs/development/agent-execution.md#comparar-capturas).
- Las capturas de antes y después se toman con el panel del navegador (`computer` con `screenshot`, con `resize_window` para cada ancho) o con los scripts de [`frontend/tools/qa/`](../../frontend/tools/qa/). Usa el mismo método, las mismas rutas y los mismos anchos en las dos tomas.
- Los puertos son fijos: no levantes los servidores de un worktree mientras sigan levantados los del checkout principal o los de otro worktree.

## Modelo y esfuerzo

Resuelve el nivel y el esfuerzo de la tarea en el [catálogo](../execution-catalog.json), en `harnesses.claude-code`: `levels.<nivel>.model` da el modelo y `efforts.<esfuerzo>` el valor de esfuerzo.

- El modelo de la sesión principal lo elige la persona, con `/model` en la CLI o con el selector de modelo de la app de escritorio. El agente comprueba que coincide con el que da el catálogo para la tarea y, si no coincide, pide el cambio.
- Delega con la herramienta `Agent`: `model` con el alias de `agentAliases` y `effort` con el valor del catálogo.
- [Revisión ciega](../../docs/development/agent-execution.md#revisión-ciega): un `Agent` nuevo, no una bifurcación de la sesión, con el modelo y el esfuerzo de `roles`. Recibe solo los artefactos que revisa y la pregunta o la lista de comprobación.
- No uses los modelos de `excludedModels`.
- El esfuerzo más alto del catálogo es `alto` (`high`). No fijes `xhigh` ni `max` en la sesión ni al delegar, aunque Claude Code los ofrezca ([reglas de escalado](../../docs/development/agent-execution.md#reglas-de-escalado)).

## CI de un pull request

En la app de escritorio, vigila el CI del PR con las herramientas `ccd_pr`, que avisan al terminar. Fuera de la app, usa `gh pr checks <n>` una vez al informar, sin bucles de espera.
