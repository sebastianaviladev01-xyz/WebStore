# Definition of Ready

Se aplica a cada tarea antes de empezar trabajo que dependa de ella. Es obligatoria ([STD-17](../architecture/standards.md)) y se comprueba en `tasks.md`, que enlaza la evidencia de estas condiciones.

- [ ] Problema, actor, alcance y REQ/AC acordados (hito de alcance aprobado).
- [ ] La tarea tiene un resultado revisable, un responsable y dependencias identificadas.
- [ ] Contrato del BFF, datos y permisos por rol afectados están definidos al nivel necesario.
- [ ] Riesgos, decisiones críticas y necesidad de ADR o revisión humana están resueltos antes de la acción dependiente. Ninguna depende de un tema abierto de [`PENDING-DECISIONS.md`](../planning/PENDING-DECISIONS.md) sin decisión registrada.
- [ ] En áreas con TDD obligatorio ([STD-18](../architecture/standards.md)), el TEST que se escribe primero está identificado en `tasks.md`.
- [ ] Si la tarea toca la interfaz, se sabe qué pantallas y anchos se capturan antes y después ([STD-12](../architecture/standards.md)).
- [ ] Entorno, herramientas y datos de prueba sintéticos están disponibles (una copia de `backend/data.json` con `WEBSTORE_DATA_FILE` si la tarea modifica datos), o prepararlos forma parte explícita de la tarea.
- [ ] Se sabe cómo comprobar el resultado, incluidos los casos de fallo pertinentes.

Una decisión pendiente que cambia la arquitectura, el contrato o el comportamiento impide considerar preparada la tarea afectada. El trabajo independiente puede continuar.

Plantilla: [`tasks-template.md`](../specs/templates/tasks-template.md).
