---
name: sdd-implement
description: Etapa 5 del flujo SDD de WebStore. Implementa una tarea preparada de una feature siguiendo el ciclo TDD (rojo, verde, refactor) en las áreas obligatorias, verifica con los comandos reales del proyecto, compara capturas si toca la interfaz y registra la evidencia. Úsalo para ejecutar un bloque de tareas (una fase o un tramo) de tasks.md.
metadata:
  project: webstore
  stage: "5/7"
---

# Implementar una tarea con TDD

## Entrada

Argumentos: el `NNN-slug` de la feature y el bloque, que es una fase o un tramo de tareas (por ejemplo `NNN-slug fase 2`). Una sesión no ejecuta la feature completa.

## Lee primero

- La sección Traspaso de `docs/specs/features/NNN-slug/tasks.md` y las filas de las tareas del bloque
- Solo los apartados de `specification.md`, `planning.md` y los ADR que esas filas enlazan, leídos por secciones
- `docs/development/agent-execution.md`
- `docs/architecture/development-workflow.md` (sección del ciclo TDD)
- `docs/development/definition-of-ready.md` y `docs/development/definition-of-done.md`
- `AGENTS.md` del área que vas a tocar (`frontend/AGENTS.md` o `backend/AGENTS.md`)

## Pasos

1. Trabaja en el worktree de la feature, entrando por su ruta, en una sesión nueva por bloque (`docs/development/agent-execution.md`, apartado «Una sesión por bloque»). El bloque termina antes de cada tarea ⚠: esa tarea se prepara y se detiene con su paquete de revisión.
2. Comprueba que la tarea cumple la Definition of Ready. Si no la cumple, detente y di qué falta. Si `tasks.md` no tiene Traspaso ni la columna Nivel y esfuerzo, complétalo antes en un commit `docs` (`docs/development/agent-execution.md`, apartado «Traspaso»).
3. Resuelve la columna Nivel y esfuerzo de cada tarea en `.agents/execution-catalog.json` para tu herramienta, como indica su adaptador, y delega con un brief cerrado: archivos, tabla o casos, comandos y criterio de terminado. El agente principal revisa el diff y la evidencia y es el único que hace commits. Si una ejecución falla dos veces o falta una decisión, escala al nivel superior. Las tareas ⚠, los hitos y las decisiones de diseño no se delegan. Reglas en `docs/development/agent-execution.md`, apartados «Delegar por nivel y esfuerzo» y «Reglas de escalado».
4. Si la tarea toca una interfaz visible (plantillas, estilos, componentes o rutas), toma las capturas de **antes** sobre la punta de la rama, antes de cambiar nada (`docs/development/agent-execution.md`, apartado «Comparar capturas»).
5. Si el área tiene TDD obligatorio (STD-18; las capas y dónde vive cada prueba están en `docs/architecture/development-workflow.md`):
   1. **Rojo:** escribe el TEST indicado en la tarea y ejecútalo solo (`node --test <archivo>` desde `frontend/` o `backend/`). Confirma que falla por el motivo esperado; un error de sintaxis o de importación no cuenta.
   2. **Verde:** escribe el código mínimo para que pase.
   3. **Refactor:** mejora el código con todas las pruebas en verde.
6. Si vas a modificar código existente sin pruebas, escribe antes una prueba de caracterización que fije el comportamiento actual. En componentes y e2e, escribe las pruebas derivadas de los AC junto al código.
7. Las pruebas que modifican datos usan una copia del estado con `WEBSTORE_DATA_FILE` o un archivo temporal, nunca `backend/data.json` (STD-09).
8. Verifica con los comandos de la sección Comandos del `AGENTS.md` raíz, en el host y desde la raíz. Controles proporcionados (`docs/development/agent-execution.md`, apartado «Controles proporcionados»):
   - Por tarea que toca `frontend/`, `backend/` o `tools/`, en segundo plano: `npm run verify`.
   - `node tools/check-agents.mjs` si tocas `.agents/`, `.claude/skills/`, un `AGENTS.md` o un `CLAUDE.md`.
   - Las capturas de **después**, comparadas con las de antes, si la tarea toca una interfaz visible. Una diferencia no pedida es un fallo de la tarea.
   - La spec e2e concreta, si la tarea la toca, y el e2e completo solo si la columna E2E de la tarea lo marca o al cerrar la fase (`npm run test:e2e` desde `frontend/`), siempre en segundo plano.
   - `npm run audit:all` si cambian `package.json` o un `package-lock.json`.
   - Prettier sobre los archivos tocados, en el mismo commit.
9. Registra la evidencia en el mismo commit de la tarea: una fila breve en `verification.md` (una línea por control, con el SHA vacío, y en la primera, con qué se ejecutó: herramienta, modelo real, esfuerzo y si fue delegada) y la tarea marcada `hecha` en `tasks.md`, solo si la aceptación y la evidencia se cumplen. Los SHA se rellenan en un commit `docs` al cerrar la fase.
10. La última tarea del bloque actualiza la sección Traspaso de `tasks.md` en su mismo commit. Si una tarea se bloquea o se desbloquea, actualiza también la columna «Bloqueos y siguiente paso» de `docs/specs/features/README.md`.
11. Al cerrar el bloque, detén los servidores que levantaste, informa a la persona (commits, árbol limpio y Traspaso) y pide su aprobación. No empieces el bloque siguiente: se ejecuta en una sesión nueva cuando la persona lo aprueba. La aprobación de un bloque o de una tarea ⚠ se anota en `tasks.md` (quién y cuándo) y va en un commit de la rama (`docs/development/agent-execution.md`, apartado «Una sesión por bloque»).
12. Si la herramienta bloquea la escritura de la sesión, no escribas por la terminal: haz commit de lo que se pueda y continúa en una sesión nueva (`docs/development/agent-execution.md`, apartado «Bloqueo de escritura de la sesión»).

Continúa los pasos rutinarios y reversibles sin pedir aprobación en cada uno. Ante una acción de alto impacto (ver `development-workflow.md`), prepara diff, riesgos y pruebas, y espera la revisión humana.

## Salida

Código y pruebas del incremento, `tasks.md` actualizado, evidencia de ejecución (con la comparación de capturas si aplica) y Traspaso actualizado.

## No hacer

- No escribas el código antes que la prueba en áreas obligatorias.
- No presentes como aprobadas pruebas que no se ejecutaron, ni ocultes fallos de entorno.
- No cambies el diseño visual sin que la tarea lo pida, ni versiones capturas en el repositorio.
- No desactives reglas de ESLint, Sheriff ni `strict` para que pase un control.
- No hagas operaciones externas no autorizadas ni uses datos reales de clientes.
- No releas archivos completos ya leídos ni pegues logs o diffs largos en el chat.
- No archives ni desarchives sesiones para continuar un bloque.
- No abras un PR al cerrar un bloque o una fase ni hagas push sin que la persona lo pida: la feature se entrega en un solo PR, después de `sdd-verify` (`docs/architecture/development-workflow.md`, apartado «Un pull request por feature»).
