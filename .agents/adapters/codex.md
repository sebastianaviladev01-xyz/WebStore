# Adaptador: Codex

Lo propio de Codex en WebStore ([ADR-0008](../../docs/adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)). Las reglas están en [`AGENTS.md`](../../AGENTS.md) y los procedimientos en los [skills](../skills/). Aquí solo se traducen a Codex. `AGENTS.md` pide leer este archivo al empezar.

Estado: **provisional** hasta que una persona lo valide con Codex. Si algo de este archivo no coincide con lo que hace tu versión, corrígelo aquí, en una rama `feature/*` de documentación.

## Instrucciones y skills

- Codex lee `AGENTS.md` al arrancar, desde la raíz del proyecto hasta el directorio de trabajo, con un tope de 32 KiB en total. No carga los `AGENTS.md` de las carpetas inferiores: antes de tocar `frontend/` o `backend/`, lee su `AGENTS.md`.
- Codex lee los skills directamente de `.agents/skills/`; no necesita punteros. Ignora los de `.claude/skills/`.
- Codex también puede encontrar los skills de diseño de terceros de `frontend/.agents/skills/` al trabajar dentro de `frontend/`. Quedan fuera del flujo ([`.agents/README.md`](../README.md#skills-de-diseño-de-frontend)): úsalos solo si la persona los pide o la tarea es de diseño visual pedido.
- Un skill se invoca con `$nombre` y sus argumentos en el mismo mensaje (por ejemplo, `$sdd-implement NNN-slug fase 2`), con `/skills` o pidiéndolo por su nombre. Donde un skill dice «argumentos», son las palabras que siguen a su nombre.

## Worktrees y sesiones

- Crea el worktree de la feature según [Un worktree por feature](../../docs/development/agent-execution.md#un-worktree-por-feature) y empieza la sesión dentro de él (`.worktrees/NNN-slug`). Así Codex toma su `AGENTS.md` como el de la raíz del proyecto.
- Si Codex crea su propio worktree o su propia rama de sesión, lleva el trabajo a `feature/*` según [Ramas creadas por la herramienta](../../docs/development/agent-execution.md#ramas-creadas-por-la-herramienta).
- Una sesión nueva por etapa y por bloque, como en cualquier herramienta, todas sobre la misma rama `feature/NNN-slug`: [Una sesión por etapa](../../docs/development/agent-execution.md#una-sesión-por-etapa).
- Si Codex bloquea la escritura de la sesión, aplica [Bloqueo de escritura de la sesión](../../docs/development/agent-execution.md#bloqueo-de-escritura-de-la-sesión).

## Servidores de desarrollo y capturas

- Codex no lee `.claude/launch.json`. Levanta los servidores con los scripts de la raíz en segundo plano (`npm run start:bff`, `npm run start:storefront`, `npm run start:admin`) y detenlos al terminar.
- Si la tarea modifica datos o compara capturas, levanta el BFF con `WEBSTORE_DATA_FILE` apuntando a una copia, como indica [Comparar capturas](../../docs/development/agent-execution.md#comparar-capturas).
- Las capturas de antes y después se toman con los scripts de [`frontend/tools/qa/`](../../frontend/tools/qa/) contra un Chrome headless. Si tu versión no puede abrir un navegador, registra la comparación como `No ejecutado (motivo)` y pídela a la persona.
- Los puertos son fijos: no levantes los servidores de un worktree mientras sigan levantados los del checkout principal o los de otro worktree.

## Modelo y esfuerzo

Resuelve el nivel y el esfuerzo de la tarea en el [catálogo](../execution-catalog.json), en `harnesses.codex`: `levels.<nivel>.model` da el modelo y `efforts.<esfuerzo>` el valor de `model_reasoning_effort`.

- El modelo y el esfuerzo de la sesión se fijan con `/model` o con `model` y `model_reasoning_effort` en la configuración de Codex. El agente comprueba que coinciden con los que da el catálogo para la tarea y, si no coinciden, pide el cambio.
- Si tu versión de Codex permite subagentes con otro modelo, delega según la [guía](../../docs/development/agent-execution.md#delegar-por-nivel-y-esfuerzo). Si no, la sesión principal ejecuta las tareas en orden, con el nivel y el esfuerzo de cada una.
- El tope es el modelo del nivel avanzado con esfuerzo `alto` (`high`). No fijes `xhigh` en `model_reasoning_effort` ni uses un modelo por encima, aunque Codex los ofrezca ([reglas de escalado](../../docs/development/agent-execution.md#reglas-de-escalado)).
- Un esfuerzo con valor `null` en el catálogo no está disponible: se registra así y no se sustituye por otro. Hoy no hay ninguno.
- Si el modelo de un nivel no está disponible, usa sus `fallbacks` en orden y regístralo. Si no tiene, la tarea queda en `Falta`. Los modelos con `onlyFor` (GPT‑6 Sol y GPT‑6.1 Sol) solo sirven para ese rol, nunca como respaldo.
- [Revisión ciega](../../docs/development/agent-execution.md#revisión-ciega): el modelo y el esfuerzo de `roles`, en una sesión aparte que recibe solo los artefactos que revisa y la pregunta o la lista de comprobación.
- Los modelos de OpenAI tienen `modelId: null` y `status: provisional`. La persona que valide este adaptador anota en el catálogo el identificador real de cada uno y pasa su estado a `validated`.

## CI de un pull request

Consulta `gh pr checks <n>` una vez al informar, sin bucles de espera.

Una feature tiene un solo PR, que se abre al final ([un pull request por feature](../../docs/architecture/development-workflow.md#un-pull-request-por-feature)): hasta entonces no hay CI que consultar, y los controles se ejecutan en local.
