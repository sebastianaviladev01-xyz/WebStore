---
name: post-merge
description: Cierra en local un cambio de WebStore cuyo PR ya está aprobado y fusionado en dev. Comprueba el merge, detiene sus servidores, elimina el worktree, la rama local y las copias de datos, y actualiza dev local. Úsalo cuando la persona diga que el PR está aprobado y mergeado o fusionado (por ejemplo, «listo, PR aprobado y mergeado» o «ya hice merge»).
metadata:
  project: webstore
---

# Cerrar un cambio fusionado

## Entrada

Argumentos opcionales: una rama `feature/*` o un número de PR.

- Sin argumentos, cierra la rama de la carpeta de la sesión: la del worktree en el que trabaja o la del checkout principal.
- Si esa rama es `dev`, busca las ramas locales `feature/*` cuyo PR hacia `dev` está fusionado y cierra todas.

## Lee primero

- `docs/development/agent-execution.md`, apartados «Cerrar el worktree», «Cerrar una rama sin worktree» y «Actualizar `dev` local». Son el procedimiento: este skill no lo repite.
- `docs/git/conventional-pull-requests.md`, apartado «Comprobar que un cambio ya está en `dev`».
- `docs/architecture/development-workflow.md`, apartado «Registro de la entrega», si la rama es la de una feature.

## Pasos

1. Ejecuta `git fetch --prune origin` desde el checkout principal, la primera carpeta de `git worktree list`.
2. Identifica cada rama que vas a cerrar y si tiene worktree (`git worktree list --porcelain`). Con un número de PR, toma la rama de `gh pr view <n> --json headRefName`.
3. Comprueba cada rama con dos evidencias:
   - `gh pr list --head <rama> --base dev --state merged` devuelve el PR;
   - `git merge-base --is-ancestor <rama> origin/dev` termina con código `0`.

   Si falta cualquiera de las dos, no toques esa rama e informa. Anota el SHA de su punta antes de borrarla.
4. Si la sesión trabaja dentro del worktree que vas a cerrar, sal de él sin borrarlo antes de seguir, como indica el adaptador de tu herramienta (`.agents/adapters/`); si no lo indica, cambia el directorio al checkout principal. Saca también de esa carpeta el shell y las pestañas de terminal.
5. Aplica el procedimiento a cada rama:
   - con worktree: «Cerrar el worktree», de los pasos 2 a 7;
   - sin worktree: «Cerrar una rama sin worktree».

   Si el worktree está bloqueado por un proceso que sigue vivo, o Windows no deja borrar la carpeta, termina el resto y deja ese paso pendiente en el informe.
6. Aplica «Actualizar `dev` local» una sola vez, al final. Si el checkout principal tiene cambios sin commit, no cambies de rama: informa.
7. Informa en pocas líneas, por cada rama: el PR, el SHA de la punta y qué se eliminó (servidores detenidos, worktree, rama local y copias de datos). Indica también si su rama remota sigue en `origin`, el SHA final de `dev` y lo que quedó pendiente con su motivo.
8. Si una rama cerrada era la de una feature (`feature/NNN-slug`), di que falta el registro de la entrega, con el número del PR y el SHA del merge que necesita, y propón hacerlo: una rama `feature/registrar-entrega-NNN-slug` desde `origin/dev`, un commit `docs` y su PR con el skill `pr-create`. No lo empieces sin que la persona lo pida.

## No hacer

- No borres ramas remotas ni hagas push.
- No borres `backend/data.json` del checkout principal ni copias de datos de otros worktrees.
- No detengas servidores que no sean los del worktree que cierras.
- No desbloquees un worktree cuyo proceso sigue vivo ni fuerces `git worktree remove`.
- No cierres una rama sin las dos evidencias del paso 3, aunque la persona diga que está fusionada: si no cuadran, pregunta.
- No archives ni desarchives sesiones.
