# Ejecución de features por agentes

Cómo ejecutan los agentes de IA las etapas del [flujo SDD + TDD](../architecture/development-workflow.md) con menos tiempo y menos tokens, sin perder TDD, trazabilidad, el diseño visual ni las revisiones humanas. Se aplica sobre todo a la etapa 5 (skill `sdd-implement`), y en parte a `sdd-plan`, `sdd-tasks` y `sdd-verify`.

- Los comandos y las reglas del entorno están en [`AGENTS.md`](../../AGENTS.md) y en el [entorno local](local-environment.md); aquí no se repiten. Todo se ejecuta en el host, con npm y desde la raíz del repositorio.
- Esta guía no depende de la herramienta. Lo propio de cada una (cómo invoca los skills, entra en un worktree, fija el modelo y el esfuerzo, levanta los servidores o sigue la CI) está en su [adaptador](../../.agents/adapters/) ([ADR-0008](../adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)).
- Esta guía no nombra modelos: las tareas indican un [nivel y un esfuerzo](#delegar-por-nivel-y-esfuerzo), que se resuelven en el [catálogo de niveles](../../.agents/execution-catalog.json). Si cambia un modelo, solo se actualiza el catálogo.

## Un worktree por feature

La implementación de cada feature se hace en un worktree propio, creado a mano y fuera del pool de worktrees de la herramienta:

```bash
git worktree add .worktrees/NNN-slug feature/NNN-slug
```

- Se crea al empezar la implementación. Si la rama todavía no existe, `git worktree add -b feature/NNN-slug .worktrees/NNN-slug <base>` la crea desde la base que fija la [convención de ramas](../git/conventional-pull-requests.md).
- La carpeta `.worktrees/` está ignorada por git y es la misma para cualquier herramienta.
- Cada sesión entra en él por su ruta, como indica el adaptador de su herramienta. Como la herramienta no lo creó, no lo gestiona ni lo borra al salir.
- Cada worktree tiene sus propias dependencias: la primera vez hay que ejecutar `npm run setup` en él. También tiene su propio `backend/data.json`, que el BFF crea desde el seed al arrancar por primera vez.
- Los servidores de desarrollo usan puertos fijos (3000, 4200 y 4300): solo puede haber un juego levantado a la vez ([varios checkouts](local-environment.md#varios-checkouts)). Antes de levantar los de un worktree, detén los del checkout principal o los de otro worktree.
- Cuando el PR está fusionado, se [cierra](#cerrar-el-worktree) junto con su carpeta y su rama local.

### Ramas creadas por la herramienta

Algunas herramientas abren su propia rama de sesión (su nombre está en el adaptador de la herramienta). El trabajo no se entrega desde esa rama ni se renombra:

1. Crea la rama `feature/*` desde `origin/dev`.
2. Lleva los commits con `git cherry-pick`.
3. Comprueba que no falta nada: `git cherry feature/<slug> <rama de sesión>` solo muestra líneas `-`.
4. Anota el SHA de la punta de la rama de sesión y bórrala.

### Cerrar el worktree

El skill [`post-merge`](../../.agents/skills/post-merge/SKILL.md) automatiza este cierre y el de una [rama sin worktree](#cerrar-una-rama-sin-worktree): basta con decirle al agente que el PR está aprobado y fusionado.

Todos los comandos se ejecutan desde el checkout principal:

1. Comprueba que la rama está integrada: `git fetch --prune origin` y, después, `git merge-base --is-ancestor feature/NNN-slug origin/dev` termina con código `0`. Si no, detente.
2. Detén los servidores de desarrollo que se levantaron desde el worktree (BFF, Storefront y Admin) y el navegador headless de las capturas, si sigue abierto. Cómo se detienen en cada herramienta está en su adaptador.
3. Saca de la carpeta los shells, las pestañas de terminal y las sesiones que la usen. Si no, Windows la deja bloqueada y no se puede borrar.
4. Si `git worktree list --porcelain` lo muestra bloqueado por la sesión de una herramienta (`locked … (pid N)`), comprueba ese proceso con `Get-Process -Id N`. Si ya no existe, desbloquéalo con `git worktree unlock .worktrees/NNN-slug`. Si existe, la sesión que lo usa sigue abierta: ciérrala antes de seguir.
5. `git worktree remove .worktrees/NNN-slug`. Las carpetas ignoradas (`node_modules`, `dist`, `.angular`, `frontend/output`) y las copias `backend/data*.json` se borran con él. Si git no puede borrar la carpeta, ya no la tiene registrada: bórrala cuando se libere.
6. `git branch -D feature/NNN-slug`. Hace falta `-D` porque `-d` compara con la rama actual, no con `origin/dev`, y el paso 1 ya lo comprobó.
7. Antes del paso 5, copia las capturas que citan `verification.md` o el PR a `frontend/output/visual-qa/<nombre>/` del checkout principal: `frontend/output` está ignorado y se borra con el worktree. Si una e2e falló de forma intermitente en la feature, copia también su carpeta de `frontend/test-results/` (con el trace de `retain-on-failure`) y cítala en su PBI: sin ella, el fallo no se puede diagnosticar después (PBI-0258).
8. Si la feature guardó copias de datos o capturas fuera del worktree (por ejemplo, en el directorio temporal de la sesión), bórralas. No toques `backend/data.json` del checkout principal.
9. [Actualiza `dev` local](#actualizar-dev-local).

La rama remota no se borra desde aquí: la borra una persona en GitHub, según el [modelo de ramas](../git/conventional-pull-requests.md).

### Cerrar una rama sin worktree

Los cambios pequeños, como los de documentación, se hacen en una rama `feature/*` del checkout principal, sin worktree. Para cerrar una de esas ramas:

1. La misma comprobación del paso 1 de [Cerrar el worktree](#cerrar-el-worktree).
2. [Actualiza `dev` local](#actualizar-dev-local).
3. `git branch -D feature/<slug>`.

### Actualizar `dev` local

En el checkout principal, sin cambios sin commit (`git status --porcelain` vacío):

```bash
git switch dev
git pull --ff-only origin dev
```

Si el pull no es *fast-forward*, `dev` local tiene commits que no están en `origin/dev`. En ese caso, detente y avisa. Tener `dev` local al día evita revisar y comparar contra una base antigua.

## Una sesión por etapa

Cada etapa del flujo empieza en una **sesión nueva** sobre la rama de la feature (o su worktree, desde la implementación): `sdd-plan`, `sdd-decide`, `sdd-tasks`, cada bloque de `sdd-implement` y `sdd-verify`. `sdd-specify` abre la feature en la sesión donde empieza el trabajo.

- La sesión nueva parte de los artefactos del repositorio, no del historial de la anterior: lo que no está en `specification.md`, `planning.md`, `tasks.md` o un ADR no existe para ella.
- Las preguntas del hito de una etapa se responden en la sesión que lo plantea, una cada vez, según «Hitos humanos» del [flujo de trabajo](../architecture/development-workflow.md).
- Continuar una etapa es empezar otra sesión, **nunca desarchivar** una anterior ([bloqueo de escritura](#bloqueo-de-escritura-de-la-sesión)).

## Una sesión por bloque

`sdd-implement` se ejecuta por **bloque**, no por feature completa.

- Un bloque es una fase de `tasks.md` o un tramo de **6 a 8 tareas** como máximo. Termina siempre antes de una tarea ⚠.
- Cada bloque es una **sesión nueva** sobre el worktree de la feature. Continuar es empezar una sesión nueva, **nunca desarchivar** una anterior.
- La sesión empieza de cero y solo lee la [sección Traspaso](#traspaso) de `tasks.md` y las filas de las tareas de su bloque.
- Las tareas ⚠ se preparan en la sesión de su bloque y se detienen con el paquete de revisión. La aprobación y el commit pueden hacerse en la sesión siguiente.
- Al terminar el bloque: commit de la última tarea con el Traspaso actualizado y servidores detenidos. Después, la sesión se puede archivar.
- El agente informa a la persona del bloque terminado (commits, árbol limpio y Traspaso) y pide su aprobación. **No empieza el bloque siguiente** hasta recibir un sí explícito.
- No se archiva una sesión a mitad de un bloque, ni a mano ni desde otra sesión, mientras haya cambios sin commit.

### Traspaso

`tasks.md` tiene una sección **Traspaso** de unas 20 líneas que permite empezar el bloque siguiente sin releer la feature:

| Campo | Contenido |
|---|---|
| Punta de la rama | SHA y título del último commit |
| Siguiente bloque | Fase o tareas, y la primera tarea que se ejecuta |
| Decisiones de ejecución | Lo decidido durante la implementación que no está en el plan, con su enlace |
| Riesgos abiertos | Lo que puede romper el bloque siguiente |
| Entorno | Comandos, puertos o datos que han dado problemas y cómo se resolvieron, y dónde están las capturas de antes |

La última tarea del bloque actualiza el Traspaso **en su mismo commit**. Si un `tasks.md` no tiene Traspaso o la columna **Nivel y esfuerzo**, la primera sesión los añade siguiendo la [plantilla](../specs/templates/tasks-template.md), en un commit `docs` propio, antes de ejecutar ninguna tarea.

### Bloqueo de escritura de la sesión

Si la herramienta bloquea la escritura de la sesión, el bloqueo es de la **sesión**, no del worktree ni del repositorio. El mensaje y la causa habitual de cada herramienta están en su adaptador.

- No escribas por la terminal (redirecciones, `Set-Content`, `sed -i`, scripts) para saltártelo.
- Haz commit de lo que se pueda con git y detente.
- Continúa en una **sesión nueva** sobre el mismo worktree, que entra en él por su ruta.

Para evitarlo, se usa un worktree propio y se continúa siempre en una sesión nueva.

## Delegar por nivel y esfuerzo

`tasks.md` indica en la columna **Nivel y esfuerzo** quién ejecuta cada tarea (por ejemplo, `estándar · medio`). El nivel no nombra un modelo: cada herramienta lo resuelve en el [catálogo de niveles](../../.agents/execution-catalog.json), la única fuente de los modelos concretos, como explica su adaptador ([ADR-0008](../adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)). El agente principal trabaja en el nivel avanzado, con el esfuerzo alto como [tope](#reglas-de-escalado), y orquesta el bloque:

- Delega con un **brief cerrado**: archivos, tabla de correspondencias o casos de prueba, comandos y criterio de terminado.
- Revisa el diff y la evidencia de lo delegado antes de aceptarlo.
- Es el único que hace commits.
- No hay dos escritores sobre los mismos archivos. Las tareas de solo lectura sí pueden ir en paralelo.
- Solo una sesión levanta servidores de desarrollo a la vez: los puertos son fijos.
- Delegar es opcional. Si la herramienta no tiene subagentes, el agente principal ejecuta las tareas en orden, con el nivel y el esfuerzo de cada una.

Los ejemplos de las tablas son tipos de trabajo de WebStore, no tareas registradas.

### Ligero: trabajo literal, sin decisiones

| Esfuerzo | Tareas | Ejemplos en WebStore |
|---|---|---|
| Bajo | Inventarios y búsquedas literales; resumir un log a su línea de resultado; ejecutar un script existente e informar del resultado | `git ls-files` de una feature; contar los `*.spec.mjs` por capa; `node tools/check-agents.mjs` |
| Medio | Sustituciones literales con una tabla dada; ajustar importaciones tras un `git mv`; Prettier sobre los archivos tocados; rellenar SHA y estados en `tasks.md` y `verification.md` | Renombrar un campo según la tabla del plan; marcar tareas como `hecha` |
| Alto | Búsquedas con criterio que distinguen excepciones; comprobar que un diff solo cambia nombres (comparación normalizada); proponer la corrección de un enlace roto | Buscar usos de `HttpClient` fuera de `data/` y `core/`, separando los permitidos |

### Estándar: patrón claro y pocas decisiones locales

| Esfuerzo | Tareas | Ejemplos en WebStore |
|---|---|---|
| Bajo | Redactar filas de evidencia a partir de los logs; actualizar documentos siguiendo una tabla exacta del plan | Una fila de `docs/planning/TRACEABILITY.md`; una tabla de `backend/docs/BFF-CONTRACT.md` |
| Medio | Mover y renombrar ajustando importaciones, plantillas Angular y rutas; reescribir documentación viva; pruebas de caracterización que siguen un patrón existente; e2e que reutilizan los helpers | Mover un componente a la capa `presentation/` de su feature; caracterizar una regla de `domain/` |
| Alto | TDD de reglas puras con casos ya fijados por los AC; DTO y mapper sobre un contrato definido; una ruta del BFF con su caso de uso y el smoke test | Una regla de tarifas de envío; un `Bff*Gateway` nuevo sobre un contrato ya escrito |

### Avanzado: diseño, riesgo y diagnóstico (agente principal)

| Esfuerzo | Tareas | Ejemplos en WebStore |
|---|---|---|
| Medio | Revisar diffs y evidencia de lo delegado; montar un paquete ⚠ cuando la evidencia ya existe; preguntas de hito | Paquete de revisión de una tarea ⚠ a partir de los logs y las capturas |
| Alto | `sdd-plan`, `sdd-decide` y revisiones del hito de arquitectura; tareas ⚠ con riesgo de pérdida de datos o sobre permisos por rol; caracterización de código complejo con dobles; TDD de cambios de modelo o contrato que cruzan Storefront, Admin y BFF; diagnóstico de fallos del build, de Sheriff, del e2e o de diferencias en las capturas | Una migración del esquema del estado del BFF; un permiso nuevo; un campo nuevo del estado que llega del BFF al Admin y al Storefront |

### Reglas de escalado

- Si una ejecución delegada falla dos veces, o necesita una decisión que no está en el brief, sube al nivel superior. No se repite con el mismo nivel.
- **El esfuerzo más alto es `alto`.** El catálogo no tiene esfuerzos por encima y ninguna sesión ni subagente los usa, aunque la herramienta los ofrezca: consumen los tokens demasiado deprisa (decisión de Daniel Avila del 2026-11-13).
- **El modelo más alto es el del nivel avanzado, salvo el escalado del catálogo.** Ninguna sesión ni subagente usa un modelo por encima del que el catálogo da a ese nivel, salvo el de `escalation` de su herramienta (en Claude Code, Fable 5.2, [ADR-0036](../adrs/0036-usar-opus-5-5-en-todo-y-fable-5-2-cuando-haga-falta.md)). Ese solo se usa cuando el nivel avanzado con esfuerzo alto no basta: falló dos veces en la tarea, o no llega a un resultado sólido en diseño o diagnóstico. El motivo queda en el informe y en el PR. Una persona también puede pedirlo para una sesión concreta, y la evidencia de esa sesión lo dice.
- Si una tarea falla dos veces con el modelo de `escalation` (o con el nivel avanzado con esfuerzo alto, en una herramienta sin `escalation`), no hay nivel al que subir: el agente se detiene, explica qué intentó y pregunta a la persona.
- Las tareas ⚠, los hitos y las decisiones de diseño no se delegan.
- Si el modelo o el esfuerzo de una tarea no están disponibles en la herramienta, la tarea queda en `Falta` o se usa el respaldo (`fallbacks`) del catálogo, y se registra. No se cambia de modelo en silencio.
- Un modelo con `onlyFor` en el catálogo solo se usa para ese rol, nunca para un nivel ni como respaldo de uno.

### Revisión ciega

Una revisión ciega la hace un agente que solo ve los artefactos (el diff, la especificación, la evidencia, las capturas) y no el razonamiento de quien los produjo. Aporta independencia, no profundidad ([ADR-0008](../adrs/0008-trabajar-con-claude-code-o-codex-mediante-adaptadores.md)):

- Es acotada: una lista de comprobación o una pregunta concreta.
- Es consultiva: el agente principal verifica cada hallazgo antes de actuar.
- Nunca es la única revisión de una tarea ⚠, de un hito ni de la Definition of Done. Que no encuentre nada no cuenta como evidencia en `verification.md`.
- El modelo y el esfuerzo que la hacen en cada herramienta están en el catálogo, en `roles`.

### Equivalencias por herramienta

El catálogo dice qué modelo y qué valor de esfuerzo corresponden a cada nivel en cada herramienta (`harnesses`). El adaptador dice cómo se fijan:

| Herramienta | Modelo, esfuerzo, subagentes y revisión ciega |
|---|---|
| Claude Code | [Adaptador de Claude Code](../../.agents/adapters/claude-code.md#modelo-y-esfuerzo) |
| Codex | [Adaptador de Codex](../../.agents/adapters/codex.md#modelo-y-esfuerzo) (provisional) |

Al adoptar otra herramienta, se crea su adaptador, se añade su entrada en `harnesses` del catálogo y se añade aquí su fila.

## Controles proporcionados

Cada tarea ejecuta los controles del área que toca, desde la raíz del repositorio:

| Control | Cuándo | Cómo |
|---|---|---|
| Prueba concreta | Durante el ciclo TDD ([STD-18](../architecture/standards.md)), para ver el rojo y el verde | `node --test <archivo>` desde `frontend/` o `backend/` |
| `npm run verify` (sintaxis, formato, lint, tipos de `domain/` y de las e2e, límites de arquitectura, build, pruebas y contrato) | En cada tarea que toca `frontend/`, `backend/` o `tools/`, sobre el árbol del commit | En segundo plano mientras se redacta la evidencia, con la salida filtrada a la línea de resultado de cada paso |
| `node tools/check-agents.mjs` | En cada tarea que toca `.agents/`, `.claude/skills/`, un `AGENTS.md` o un `CLAUDE.md` | Desde la raíz; tarda menos de un segundo |
| [Comparar capturas](#comparar-capturas) | En cada tarea que toca plantillas, estilos, tokens o componentes ([STD-12](../architecture/standards.md)), y al cerrar la fase si alguna tarea lo hizo | Antes y después del cambio, con los mismos datos, rutas y anchos |
| Spec e2e concreta | Cuando la tarea toca esa spec | `npm run test:e2e -- <spec>` desde `frontend/`, en segundo plano |
| E2E completo | Al cerrar cada fase, y en las tareas que `tasks.md` marca en la columna **E2E** (las que cambian plantillas, rutas, datos guardados o el contrato) | `npm run test:e2e` desde `frontend/`, siempre en segundo plano |
| `npm run audit:all` | Cuando cambian `package.json` o un `package-lock.json`, y al cerrar la fase | Necesita red; si no la hay, `No ejecutado (motivo)` |
| Prettier | Sobre los archivos tocados, en el mismo commit | Con el Prettier de cada área: `node_modules/.bin/prettier --write <archivos>` desde la raíz para `backend/` y `tools/`, y desde `frontend/` para el frontend. Un commit de formato aparte solo para un reformateo masivo provocado por renombrados. Los archivos que ya estaban fuera de formato no se reformatean |

### Datos de prueba

`backend/data.json` no se versiona y es el estado de trabajo de quien desarrolla. Las pruebas y las comprobaciones que modifican datos usan una copia con `WEBSTORE_DATA_FILE` ([STD-09](../architecture/standards.md)); cómo se crea y se quita está en [Trabajar sobre una copia](local-environment.md#trabajar-sobre-una-copia). Lo propio de los agentes:

- Las pruebas del BFF y el smoke test del contrato ya trabajan sobre un archivo temporal: no necesitan copia.
- Pasa una ruta absoluta en `WEBSTORE_DATA_FILE`: una relativa se resuelve desde el directorio en que arranca el BFF, que con `npm run start:bff` es `backend/`, no la raíz.
- En un worktree, una copia llamada `backend/data-<propósito>.json` (por ejemplo, `backend/data-capturas.json`) queda ignorada por git y se borra con el worktree. Si no existe, el BFF la crea desde el seed.
- Anota en el Traspaso qué copia usa el bloque, para que la sesión siguiente compare con los mismos datos.

### Comparar capturas

El diseño visual no cambia sin que se pida ([STD-12](../architecture/standards.md)). Una tarea que toca la interfaz demuestra que no lo altera, o que solo cambia lo que piden sus AC. Es el procedimiento de [Cambios que tocan la interfaz](../architecture/development-workflow.md#cambios-que-tocan-la-interfaz), con lo que necesita un agente para repetirlo igual:

1. **Datos fijos.** Levanta el BFF sobre una copia ([datos de prueba](#datos-de-prueba)) y no la modifiques entre las dos tomas. Levanta el Storefront o el Admin según la tarea.
2. **Antes.** Sobre la punta de la rama, antes de cambiar nada, toma las capturas de las rutas afectadas en los anchos que fija la tarea. Para la comparación final de `sdd-verify`, con el árbol limpio, cambia a la base de la rama con `git switch --detach <base>` y vuelve después a `feature/NNN-slug`. Si la tarea cambia el BFF, reinícialo tras cada cambio de revisión: no recarga solo.
3. **Después.** Con el cambio hecho, repite las mismas capturas con el mismo método, las mismas rutas, los mismos anchos y la misma sesión de usuario (por ejemplo, el mismo rol en el Admin).
4. **Compara** cada par. El resultado es «Iguales» o la lista de diferencias, cada una con el AC que la pide. Una diferencia no pedida es un fallo de la tarea, no una nota.

Herramientas:

- Los scripts de [`frontend/tools/qa/`](../../frontend/tools/qa/) se ejecutan desde `frontend/` contra un Chrome headless con perfil temporal, como indica [QA visual con Chrome](local-environment.md#qa-visual-con-chrome). `cdp-visual-qa.mjs` toma la página de `VISUAL_QA_URL`, guarda en `VISUAL_QA_OUTPUT` (por ejemplo, `output/visual-qa/NNN-slug/antes` y `.../despues`) y recorre los seis anchos de referencia; `VISUAL_QA_WIDTH` limita a uno.
- **Capturas por tema y ancho, y comparación píxel a píxel** (lote 08, PBI-0057), con Playwright y el Chrome instalado, desde `frontend/`:
  - `node tools/qa/preparar-datos.mjs`: una sola vez, sobre un BFF levantado con una copia de datos y en modo demo; crea un pedido de invitado (imprime su `id` y su `accessToken`) y un reclamo para que las páginas tengan algo que mostrar.
  - Un archivo de escenarios (copia [`tools/qa/escenarios/ejemplo.mjs`](../../frontend/tools/qa/escenarios/ejemplo.mjs); su nombre es el de la carpeta de salida): cada escenario es una página de la tienda o del Admin, con su tema (`a`, `b` o `c`, por la cookie de la vista previa del modo demo), el rol del Admin, algo que hacer antes o después de abrirla y, por omisión, los anchos 1440 y 375. Los guardados se cortan con `sinGuardar` para que los datos no cambien entre tomas.
  - `node tools/qa/capturas.mjs <escenarios.mjs> antes|despues [escenario] [--salida carpeta]`: toma las capturas de página completa en `output/visual-qa/<nombre>/antes` y `.../despues`. Antes de cada toma espera a la red en reposo, a las fuentes, a las fotos y a las animaciones que terminan, no una pausa fija: con las fotos sin cargar, el rasterizado cambia entre tomas. Desde el lote 20, cada toma emula movimiento reducido (`prefers-reduced-motion: reduce`): lo que aparece al desplazarse (`wsReveal`, en el inicio) ya está a la vista, y la toma de página completa no sale con secciones vacías. Un escenario con `conMovimiento: true` se toma con las animaciones; un par de tomas se compara siempre con el mismo valor. Direcciones por entorno: `QA_BFF`, `QA_ADMIN` y `QA_TIENDA` (por omisión 3000, 4300 y 4200).
  - **Elementos fijos o pegados** (lote 37, PBI-0252). La toma de página completa dibuja los elementos con `position: fixed` o `sticky` (la barra «Agregar al carrito» de la ficha a 375 px, la tuerca del modo demo, una cabecera pegada) en su lugar del primer viewport: en una página más alta que la ventana quedan a media página y dejan huecos o solapes que no existen en la ventana real. Y al revés: un solape real puede pasar por efecto de la captura (la tuerca tapaba un botón al cargar, PBI-0249). En esas páginas, añade al escenario `desplazamientos`, una lista de posiciones: enteros ≥ 0 (píxeles desde arriba; si la página no da para tanto, el final), `'mitad'` (la mitad del desplazamiento posible) y `'final'`. Por ejemplo, `desplazamientos: [0, 'mitad', 'final']`. Además de la de página completa, que no cambia, `capturas.mjs` toma la ventana en cada posición y la guarda en `<escenario>-<ancho>-ventana-<posición>.png` (por ejemplo, `tienda-ficha-a-375-ventana-mitad.png`), y `comparar.mjs` las compara como a cualquier otra. Lo que hacen los elementos fijos o pegados se juzga en las tomas de la ventana; la de página completa solo vale para el resto. Los escenarios sin `desplazamientos` dan las mismas tomas, con los mismos nombres, que antes.
  - `node tools/qa/comparar.mjs <carpeta> [umbral] [--estricto]`: compara cada par, deja en `comparacion/` la imagen con las diferencias en rojo y un `resumen.md` con el tamaño de cada toma, los píxeles distintos y su zona. El umbral por píxel (30 por omisión, suma de los tres canales) deja fuera el ruido de las fotos y de los bordes suavizados. Termina con código 1 si alguna captura difiere.
  - **Por qué el umbral es 30** (lote 41, PBI-0260). Se midió con 8 tomas del mismo código (4 con la máquina libre y 4 con los cuatro núcleos ocupados; la tienda del lote 37 y cinco páginas del backoffice del lote 35, 40 capturas por toma), en 10 pares, 400 comparaciones. Con 30, ninguna captura con diferencias. Con 24, 12, en 4 de los 6 pares con una toma cargada: la foto de la ficha con C, cuyos píxeles cambian hasta 35. Con 20, 21, también con la máquina libre: el pie del inicio con C a 1440 px. Con 15, 21 y con 10, 28. Por otro lado, unos cambios sutiles aplicados a propósito: un borde de 1 px que cambia 22 en total y un botón un 7 % más claro (21) salen con 20, pero no con 24 ni con 30; un botón un 4 % más claro (12) solo sale con 10. Bajarlo a 24 no gana nada y da falsos positivos con carga; a 20, los da también con la máquina libre. **Límite conocido:** un cambio de color de menos de 30 en total no sale como diferencia. Si la tarea cambia un color sutil, compara también con `comparar.mjs <carpeta> 20` y explica las diferencias que salgan: con 20, las de la foto de la ficha con C y las del pie del inicio con C a 1440 px ya salían entre tomas del mismo código. Las cifras y sus pruebas, en [`tools/qa/lib/ruido.mjs`](../../frontend/tools/qa/lib/ruido.mjs). El `resumen.md` es lo que se cita en `verification.md` o en el PR.
  - **Ruido de antialiasado** (lote 37, PBI-0253). Entre dos tomas del mismo código, sobre todo con la máquina cargada, el borde suavizado de unas esquinas redondeadas o unos píxeles de una foto pueden pasar el umbral por unos niveles. `comparar.mjs` cuenta como ruido, y no como diferencia, un píxel distinto cuyo grupo es pequeño. El grupo son los píxeles que se tocan con él (también en diagonal) y cambian más de la mitad del umbral: así, unos píxeles sueltos por encima del umbral en un área que cambia entera un poco menos (un color sutil) forman un solo grupo grande. Es ruido si el grupo tiene como mucho 16 píxeles, ninguno pasa el umbral en más de 10, y la captura suma como mucho 48 píxeles de ruido; si pasa de ahí, todo vuelve a contar como diferencia. El ruido sale aparte, en la columna «Ruido» del resumen (píxeles, grupos, diferencia máxima y zona) y en ámbar en la imagen: se mira, no se esconde. Un cambio real pequeño sigue siendo una diferencia: un borde de 1 px en una línea, un texto, un ícono que se mueve o un color sutil en un área. `--estricto` cuenta el ruido como diferencia, como antes. Los límites y sus pruebas están en [`tools/qa/lib/ruido.mjs`](../../frontend/tools/qa/lib/ruido.mjs).
  - El ruido que no es del cambio se explica, no se esconde: un carrusel que rota (la portada), una cifra que cambia con los datos (las cifras del Dashboard, si otra prueba crea pedidos) o la hora. Para repetirlo sin ese ruido, toma la misma página dos veces sobre el mismo código y compara: lo que ya difiere ahí no es del cambio.
  - Ayudas para escenarios y medidas en [`tools/qa/lib/qa.mjs`](../../frontend/tools/qa/lib/qa.mjs): `tokensDeAdmin`, `conSesion`, `cookieDeTema`, `activarTema` (activa un tema por la API del Admin; devuelve el anterior, para restaurarlo), `crearPedidoDeInvitado`, `asentar` y `medirColores` (`getComputedStyle` de un elemento, para medir contraste sin mirar la imagen).
- **Base en `sdd-verify`.** Si las capturas «antes» de la implementación se conservan y la copia de datos no cambió, no se vuelven a tomar: se comparan con las de la punta. Activar un tema por la API del Admin cambia la copia (tema activo y revisión de la apariencia): restaura el tema anterior al terminar o usa la cookie de la vista previa del modo demo, que no escribe en la copia. Para restaurarlo, el archivo de escenarios exporta `alTerminar`, que `capturas.mjs` llama al acabar las tomas, también si fallan, y vuelve a activar el tema que devolvió el primer `activarTema`, como el escenario del lote 34 (lote 41, PBI-0261).
- Como mínimo, un ancho de escritorio y uno móvil por ruta afectada.
- Algunas herramientas tienen su propio navegador para capturar; su adaptador dice cómo usarlo. Las dos tomas de un par se hacen con el mismo método.
- `frontend/output/` está ignorado por git: las capturas no se versionan. La evidencia en `verification.md` dice qué rutas y anchos se compararon, el resultado y dónde están las capturas; si hacen falta en el PR, se adjuntan allí.
- Si no se puede capturar (sin navegador o sin servidores), el control queda `No ejecutado (motivo)` y la tarea no se marca `hecha` hasta que una persona lo compruebe.

## Evidencia en el commit de la tarea

- El commit de cada tarea incluye su fila en `verification.md`, con una línea por control (comando y resultado), y marca la tarea como `hecha` en `tasks.md`.
- La primera línea de la tarea dice con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada, y el respaldo si se usó uno. Así la evidencia no depende de qué resolvía el catálogo ese día. Si la sesión no puede leer su esfuerzo, escribe «esfuerzo no visible en la sesión» y el que le asignó el encargo; la sesión principal que orquesta anota también su propio modelo.
- Si la tarea comparó capturas, una línea dice las rutas, los anchos y el resultado.
- Como el SHA no se conoce antes del commit, la fila lo deja vacío. Los SHA se rellenan en un único commit `docs` al cerrar la fase.
- `verification.md` completo (matriz de controles, cobertura de los AC y Definition of Done) solo se redacta en `sdd-verify`.
- La [plantilla de verificación](../specs/templates/verification-template.md) incluye un ejemplo de fila breve.

## Higiene del contexto

- Lee `specification.md`, `planning.md` y `tasks.md` **por secciones**: la fila de la tarea y los apartados que enlaza, con `grep` o leyendo un rango de líneas. No vuelvas a leer completos los archivos que ya leíste.
- Filtra las salidas a la línea de resultado (`# pass`, `# fail`, `All matched files use Prettier`, código de salida) y guarda los logs completos en el directorio temporal de la sesión.
- Edita con las herramientas de edición. Si escribes por shell, un archivo por comando y en bloques cortos.
- No pegues en el chat diffs, logs largos ni capturas que no se pidieron: basta su resumen y la ruta del archivo.
