---
name: pr-create
description: Publica una rama feature/* de WebStore y abre su pull request en borrador hacia dev. Revisa el diff y los commits, redacta el título, el cuerpo según la plantilla y las etiquetas, y publica solo cuando la persona los aprueba. Úsalo cuando la persona pida abrir, crear o publicar el PR de una rama (por ejemplo, «abre el PR» o «crea el pull request»).
metadata:
  project: webstore
---

# Crear un pull request

## Entrada

Argumentos opcionales: la rama y el destino.

- Sin rama, usa la de la carpeta de la sesión: la del worktree en el que trabaja o la del checkout principal.
- Sin destino, `dev`. Otro destino solo si la persona lo pide.

## Lee primero

- `docs/git/conventional-pull-requests.md`, apartados «Política de pull requests», «Crear un pull request» y «Alerta de flujo». Son el procedimiento: este skill no lo repite.
- `.github/pull_request_template.md`: las secciones del cuerpo.
- `docs/git/conventional-commits.md`, apartados «Formato» y «Tipos».
- `docs/development/pull-request-checklist.md`.

## Pasos

1. **Comprueba la rama.** Si `git remote get-url origin` falla, el repositorio todavía no está en GitHub: detente e informa. Si existe, ejecuta `git fetch --prune origin` y comprueba que:
   - la rama es `feature/*`, o `hotfix/*` si la persona lo pidió; nunca `dev`, `release/*` ni `main`;
   - `git status --porcelain` está vacío. Si hay cambios sin commit, pregunta: no los incluyas por tu cuenta;
   - el origen y el destino cumplen la política. Si generan una alerta, prepárala para el cuerpo; si son un flujo prohibido, detente;
   - `gh pr list --head <rama> --state open` no devuelve ningún PR. Si devuelve uno, no abras otro: sigue los pasos 2 a 7 para su cuerpo y propone hacer push de los commits nuevos y actualizarlo con `gh pr edit <n> --body-file <archivo>`.
2. **Revisa el diff y los commits** contra `origin/<destino>`, como indica la guía. Si la rama todavía no está publicada, compara con la rama local:
   - el diff contiene solo lo previsto, sin archivos generados (`node_modules`, `dist`, `.angular`, `frontend/output`, logs), sin `backend/data*.json`, sin secretos y sin capturas ni datos personales;
   - cada commit sigue la convención de commits. Si alguno no cumple, informa y propone corregirlo; no reescribas el historial sin que la persona lo pida;
   - `git merge-tree --write-tree origin/<destino> <rama>` termina con código `0`. Si hay conflictos, aplica «Conflictos con `dev`» de la guía.
3. **Reúne la evidencia** de los commits, del `verification.md` de la feature y de esta sesión. No inventes resultados: lo no ejecutado figura como «No ejecutado (motivo)».
   - Si el diff toca `frontend/`, `backend/` o `tools/` y falta la evidencia de `npm run verify` sobre la punta de la rama, ejecútalo desde la raíz, en segundo plano, o déjalo como pendiente.
   - Si el diff toca plantillas, estilos o componentes y falta la comparación de capturas, déjala como pendiente: no la des por buena sin haberla hecho ([comparar capturas](../../../docs/development/agent-execution.md#comparar-capturas)).
   - No anticipes el resultado de la CI: GitHub lo muestra en el PR. No pongas en la tabla filas para sus jobs.
4. **Redacta el título** según la guía. Con un solo commit, usa su título.
5. **Redacta el cuerpo** en un archivo temporal fuera del repositorio. Lleva las secciones de la plantilla en su orden y sin sus comentarios:
   - **Resultado y motivo:** qué cambia y por qué, en dos o tres frases, y una viñeta por área que empiece con el área en negrita.
   - **Trazabilidad:** la feature con sus REQ, AC, TASK y TEST, el requisito de `docs/planning/TRACEABILITY.md` y los ADR. Si no hay feature, «No aplica a ninguna feature» y el ADR o el requisito en que se apoya el cambio.
   - **Verificación:** «Revisión `<sha>`» con la punta de la rama y el entorno (`node --version` y `npm --version` del host). Después, la tabla de comandos del paso 3, la fila de capturas antes y después (Iguales, Cambios esperados o No aplica, con su motivo) y la línea «Pruebas antes del código»: Sí, No aplica o Excepción con su ADR.
   - **Riesgos:** compatibilidad, datos, permisos o diseño visual afectados, y el rollback. En el checklist, marca `[x]` solo lo que se cumple; lo que no aplica queda sin marcar y con su motivo.
   - Si la plantilla tiene más secciones (flujo de ramas, enlaces), rellénalas como indica la guía. Los enlaces a archivos del repositorio usan rutas `../blob/...`, nunca `../docs/...`.
   - Sin firma de herramienta: nada de «Generated with …» al final.
6. **Elige las etiquetas** entre las que existen (`gh label list`):
   - `documentation`, si solo cambian documentos o skills;
   - `enhancement`, si añade una capacidad nueva: un `feat`, un skill o un ADR;
   - `bug`, si es un `fix`;
   - las que pida la persona.
7. **Pide aprobación.** Muestra el destino, el título, las etiquetas, el cuerpo y `git diff --stat origin/<destino>...<rama>`, y espera un sí explícito. Si la persona pide cambios, aplícalos y vuelve a mostrar lo que cambió.
8. **Publica:**

   ```bash
   git push -u origin <rama>
   gh pr create --draft --base <destino> --head <rama> --title "<título>" --body-file <archivo> --label <etiqueta>
   ```

   Repite `--label` por cada etiqueta. `-u` deja `origin/<rama>` como upstream, aunque la rama se creara siguiendo a `origin/dev`. Comprueba con `gh pr view <n> --json isDraft,labels` que el PR quedó en borrador y con las etiquetas.
9. **Sigue la CI.** Si la herramienta puede vigilar el CI del PR y avisar al terminar, actívalo; cómo se hace está en su adaptador (`.agents/adapters/`). Si no, consulta `gh pr checks <n>` una vez al informar, sin bucles de espera. Si un check falla o contradice el cuerpo, informa con el enlace al job y propone la corrección; no edites el PR sin aprobación.
10. **Informa** en pocas líneas:
    - la URL del PR, que está en borrador y sus etiquetas;
    - el estado de los checks;
    - el comando para marcarlo como listo, `gh pr ready <n>`;
    - que, una vez fusionado, se cierra con el skill `post-merge` y, si es el último PR de la implementación de una feature, sigue el registro de la entrega.

## No hacer

- No hagas push a `dev`, `release/*` ni `main`, ni push forzado.
- No publiques nada antes de la aprobación del paso 7.
- No fusiones el PR, no lo marques como listo ni pidas revisores sin que la persona lo pida.
- No añadas firmas de herramientas ni líneas de coautoría que la convención de commits no admita, aunque la herramienta los ponga por defecto.
- No sustituyas la plantilla por la lista de commits ni uses palabras clave de cierre como `Closes #12` sin que la persona lo pida.
- No fusiones `dev` en la feature ni uses el botón de resolver conflictos de GitHub en un PR hacia `dev`.
- No crees etiquetas nuevas ni el repositorio de GitHub.
