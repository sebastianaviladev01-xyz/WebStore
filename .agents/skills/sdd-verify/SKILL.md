---
name: sdd-verify
description: Etapa 6 del flujo SDD de WebStore. Verifica una entrega y completa verification.md con la revisión, el estado documentado/configurado/ejecutado de cada control, los resultados reales de las pruebas, la comparación de capturas, el cumplimiento TDD, la trazabilidad y la Definition of Done. Úsalo cuando la implementación de una feature está terminada, antes de abrir su PR único.
metadata:
  project: webstore
  stage: "6/7"
---

# Verificar una entrega

## Entrada

Argumentos: el `NNN-slug` de la feature.

## Lee primero

- El diff de la rama respecto a su base
- `docs/specs/features/NNN-slug/specification.md`, `planning.md`, `tasks.md` y los ADR enlazados
- `docs/specs/templates/verification-template.md`
- `docs/development/definition-of-done.md` y `docs/development/pull-request-checklist.md`
- `docs/development/agent-execution.md` (apartados «Evidencia en el commit de la tarea» y «Comparar capturas»)
- La sección «Ejecución por tarea» de `verification.md`, si ya tiene filas

## Pasos

1. Copia la plantilla a `docs/specs/features/NNN-slug/verification.md` si no existe, y añade un `../` a cada enlace relativo.
2. Identifica la revisión: rama, commit, fecha y entorno (`node --version` y `npm --version` del host).
3. Parte de las filas de «Ejecución por tarea», que cada tarea registró en su commit. No repitas las ejecuciones ya registradas: ejecuta solo las finales sobre la punta de la rama, en segundo plano: `npm run verify` desde la raíz, el e2e completo (`npm run test:e2e` desde `frontend/`) y, si cambiaron dependencias, `npm run audit:all`. Registra para cada una el comando y el resultado real.
4. Si la feature toca la interfaz, comprueba que cada tarea marcada con capturas tiene su comparación registrada, y repite la comparación final de las rutas afectadas entre la base de la rama y su punta. Anota «Iguales» o los cambios esperados por AC; una diferencia no pedida es un fallo.
5. Completa tú la matriz Documentado / Configurado / Ejecutado. Lo que no se pudo ejecutar se marca `No ejecutado` con el motivo. El CI figura como `No ejecutado`: se ejecuta en el PR único de la feature, y su resultado lo anota el registro de la entrega.
6. Completa el cumplimiento TDD por área: ¿la prueba existía antes del código? Usa el historial de commits o el PR como evidencia.
7. Comprueba que cada tarea registró con qué se ejecutó (herramienta, modelo real y esfuerzo). Si falta, anótalo en «Riesgos remanentes y excepciones»; no lo deduzcas del catálogo.
8. Completa los resultados de las pruebas y la cobertura de los AC con la trazabilidad REQ → AC → TASK → commit → TEST → resultado, usando los SHA y resultados de «Ejecución por tarea».
9. Comprueba que los enlaces relativos de los documentos modificados resuelven, y que `backend/docs/BFF-CONTRACT.md` y `docs/planning/TRACEABILITY.md` reflejan el cambio si corresponde.
10. Marca la Definition of Done solo con lo que se cumple. Registra riesgos remanentes y excepciones.
11. Actualiza el estado en `docs/specs/features/README.md` a `verificada` cuando corresponda, con lo que quede pendiente en «Bloqueos y siguiente paso», y presenta el resultado para el hito de entrega, con las preguntas de una en una (`docs/architecture/development-workflow.md`, apartado «Hitos humanos»).
12. Haz commit de la verificación en la rama `feature/NNN-slug`. Cuando se apruebe el hito de entrega, registra quién y cuándo en `verification.md`, en un commit de la rama. Solo entonces corresponde el PR único de la feature, con el skill `pr-create`; tras su merge, `post-merge` y el registro de la entrega (`docs/architecture/development-workflow.md`, apartados «Un pull request por feature» y «Registro de la entrega»).

## Salida

`docs/specs/features/NNN-slug/verification.md`.

## No hacer

- No declares aceptación ni despliegue sin evidencia.
- No instales ni alteres servicios externos. Levantar los servidores locales (BFF, Storefront y Admin) está permitido: no son servicios externos. Detenlos al terminar.
- No uses `backend/data.json` para las comprobaciones que modifican datos: usa una copia con `WEBSTORE_DATA_FILE`.
- No copies cifras de cobertura ni marques casillas por intención.
- No abras el PR ni hagas push antes de que el hito de entrega esté aprobado y registrado.
- No marques como entregado lo que depende del merge. Déjalo en el Traspaso de `tasks.md`, en la fila «Tras la fusión del PR», con archivo y línea de cada mención, para el registro de la entrega (`docs/architecture/development-workflow.md`, apartado «Registro de la entrega»).
