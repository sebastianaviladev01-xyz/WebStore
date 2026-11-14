---
name: ready-check
description: Comprueba si el entorno, el repositorio, el flujo SDD y el estado del proyecto permiten empezar a trabajar en WebStore, y responde «Listo para trabajar» o qué falta, con el enlace a cómo resolverlo. Úsalo cuando la persona pregunte si está todo listo (por ejemplo, «¿estamos listos para trabajar?» o «¿tienes todo listo para crear ADR, ejecutar features y asignar modelo y esfuerzo?»), al empezar el día o antes de una etapa SDD. No audita ni rediseña el flujo.
metadata:
  project: webstore
---

# Comprobar si todo está listo

## Entrada

Argumento opcional: `rápido`, que omite los controles del paso 4.

## Lee primero

- `AGENTS.md`, secciones «Orientación para agentes» y «Comandos».
- `docs/development/local-environment.md`, apartados «Requisitos del host», «Levantar y apagar el proyecto» y «Problemas frecuentes».
- `docs/specs/features/README.md`.
- El adaptador de tu herramienta en `.agents/adapters/` (solo el tuyo) y `.agents/execution-catalog.json`.

El flujo SDD + TDD está adoptado (`docs/architecture/development-workflow.md`). Este skill comprueba que se puede ejecutar; no lo evalúa ni lo rediseña.

## Pasos

Ejecuta todo desde la raíz del repositorio. Las comprobaciones de solo lectura pueden ir en paralelo.

1. **Host.** `node --version` cumple `engines` de `package.json`; `npm --version` es 10 o superior; `git --version`; `gh auth status`. Si `gh` no está autenticado, es `Aviso` mientras el repositorio no tenga remoto en GitHub, y `Falta` después.
2. **Repositorio.** La rama actual y `git status --porcelain`. Si existe `origin`, después de `git fetch --prune origin`, la distancia entre `dev` local y `origin/dev` (`git rev-list --left-right --count dev...origin/dev`); si no existe, anótalo como `Aviso`. Con `git worktree list`, los worktrees cuya rama ya es ancestro de `origin/dev`: son candidatos a `post-merge`.
3. **Dependencias.** Existen `node_modules/.bin/prettier` en la raíz y `frontend/node_modules/.bin/ng`. Si falta alguno, márcalo `Falta` con el comando `npm run setup`; no lo ejecutes. El BFF no tiene dependencias. `backend/data.json` no hace falta: el BFF lo crea desde el seed al arrancar.
4. **Controles**, salvo con `rápido`: `npm run verify` desde la raíz, en segundo plano y con la salida filtrada a la línea de resultado de cada paso. `npm run audit:all`, el e2e (`npm run test:e2e` desde `frontend/`) y la comparación de capturas solo se ejecutan si la persona los pide.
5. **Herramienta de IA.** Declara en qué herramienta trabajas (por ejemplo, Claude Code o Codex): lo sabes tú, no hace falta detectarlo.
   - Tiene entrada en `harnesses` del catálogo y su adaptador existe. Si no, márcalo `Falta`: sin adaptador no hay una forma acordada de fijar el modelo y el esfuerzo.
   - Ves las reglas y los skills como dice tu adaptador: `AGENTS.md` está en tu contexto y los skills de `.agents/README.md` están disponibles en tu herramienta.
   - Resuelve en el catálogo, para tu herramienta, el nivel y el esfuerzo de las tareas del siguiente bloque que señala el índice de features, si lo hay. Un nivel sin modelo o un esfuerzo no disponible que el bloque necesita es `Falta`; un modelo `provisional`, `Aviso`.
   - Di si tu herramienta puede delegar en subagentes con otro modelo. Si no puede, es `Aviso`, no `Falta`: el bloque se ejecuta en orden en la sesión principal.
   - Ejecuta `node tools/check-agents.mjs`: comprueba el catálogo, los punteros de `.claude/skills/` y los imports de los `CLAUDE.md`.
6. **Flujo SDD.** Existen las plantillas de `docs/specs/templates/` y `docs/adrs/0000-template.md`.
7. **Estado del proyecto.** Del índice de features: las que están en curso, sus bloqueos y el siguiente trabajo. Una feature en curso solo figura en el índice de su rama: lista también las ramas `feature/NNN-*` locales y de `origin`, y lee la fila de cada una con `git show <rama>:docs/specs/features/README.md`. Si figura «Por decidir», dilo y pregunta a la persona; no lo elijas.

## Salida

- Una tabla «Comprobación | Estado | Cómo resolverlo». El estado es `Listo`, `Falta`, `Aviso` (no impide trabajar, por ejemplo un worktree pendiente de `post-merge`) o `No ejecutado (motivo)`. Cada `Falta` enlaza al apartado del repositorio que lo resuelve, por ejemplo «Requisitos del host» o «Primer día».
- La evidencia del entorno: `node --version`, `npm --version` y los controles ejecutados.
- La herramienta declarada, si puede delegar en subagentes y los modelos provisionales que usaría el siguiente bloque, si los hay.
- El veredicto, en una línea: «Listo para trabajar» si no falta nada, o «Falta: …». Lo que no se ejecutó por `rápido` no cambia el veredicto, pero se nombra.
- Solo si los hay, «Huecos de documentación», aparte del veredicto: cada contradicción o enlace roto encontrado, con archivo y línea.

## No hacer

- No instales, construyas, levantes, apagues ni borres nada: ni `npm ci`, ni `npm run setup`, ni servidores de desarrollo. `npm run verify` construye en `dist/`, que git ignora, y está permitido. Si algo falta, indica el comando y dónde está documentado. Prepararlo es tarea del skill `onboarding` o de la persona.
- No propongas cambios al flujo, a los estándares ni a los skills. Un hueco real va en «Huecos de documentación».
- No cambies de rama ni hagas `pull`: solo `fetch`.
- No toques `backend/data.json` ni servicios externos.
