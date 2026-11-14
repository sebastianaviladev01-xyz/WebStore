# Definition of Done

Se aplica a tareas y entregas funcionales. Es obligatoria ([STD-13, STD-17 y STD-18](../architecture/standards.md)) y se comprueba en `verification.md` de la feature y en la revisión del diff.

- [ ] AC aplicables demostrados; comportamiento normal, límite y fallo cubiertos según el riesgo.
- [ ] En áreas con TDD obligatorio, las pruebas existían antes del código y la evidencia figura en el PR o en `verification.md`.
- [ ] `npm run verify` ejecutado desde la raíz, con resultado y revisión identificados. Si el cambio toca flujos de usuario, también `npm run test:e2e` desde `frontend/`; si cambia dependencias, `npm run audit:all`.
- [ ] Si cambia el contrato HTTP: [`BFF-CONTRACT.md`](../../backend/docs/BFF-CONTRACT.md), el smoke test del contrato y los adaptadores `Bff*Gateway` actualizados en el mismo cambio.
- [ ] Autorización por rol en el BFF, validación en servidor, confidencialidad y accesibilidad revisadas para el cambio.
- [ ] Si toca la interfaz: capturas antes y después en los anchos acordados, sin cambios visuales no pedidos ([STD-12](../architecture/standards.md)).
- [ ] Documentación, ADR y diagramas coherentes con la implementación.
- [ ] Trazabilidad REQ → AC → TASK → cambio → TEST → resultado completa.
- [ ] Sin secretos, hosts ni datos personales reales en Git ni en la evidencia; `backend/data.json` sin modificar por las pruebas.
- [ ] Excepciones justificadas y vigentes; los controles no ejecutados figuran como pendientes, no como aprobados.
- [ ] Revisión humana del hito correspondiente registrada en el artefacto de su etapa, en un commit de la rama de la feature.
- [ ] En una feature, todas las etapas están en su rama y se entregan en [un solo pull request](../architecture/development-workflow.md#un-pull-request-por-feature), que se abre con el hito de entrega aprobado.

La cantidad de pruebas no reemplaza la aceptación funcional. Un build local no acredita un despliegue: WebStore todavía no tiene ambientes desplegados.

Plantilla: [`verification-template.md`](../specs/templates/verification-template.md).
