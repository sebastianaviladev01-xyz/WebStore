# Índice de features

Añade una fila al crear la carpeta de una feature. Al avanzar de etapa, actualiza su estado ([estados](../README.md#estados-de-una-feature)) y la columna de bloqueos.

| NNN | Slug | Historia | Estado | Bloqueos y siguiente paso | Última revisión |
|---|---|---|---|---|---|
| 001 | [`reorganizar-resumen-del-admin`](001-reorganizar-resumen-del-admin/specification.md) | Ninguna: pedido de Daniel del 2026-11-06 (estructura del dashboard de OpenCart) | en implementación | [Tareas](001-reorganizar-resumen-del-admin/tasks.md): fase 1 hecha (bloque 1, TASK-01 a TASK-07: reglas puras del Resumen con TDD), en la rama `feature/001-reorganizar-resumen-del-admin` sin push. Ninguna bloqueada; TASK-08 pide permiso antes de detener los servidores del checkout principal. ⚠ TASK-12 (cambio visual pedido) espera la revisión humana del bloque 2. Siguiente: aprobación de la persona y `sdd-implement` del bloque 2 (TASK-08 a TASK-11) en una sesión nueva sobre el worktree | 2026-11-07 |

Lo que la demo ya implementa se hizo antes de adoptar este flujo: su evidencia está en la [trazabilidad](../../planning/TRACEABILITY.md) y en la [validación](../../../frontend/docs/VALIDATION.md), no en este índice.

## Siguiente trabajo del proyecto

**Por decidir por el equipo.** Un agente no lo elige: pregunta a la persona.

Para decidirlo, el equipo revisa:

- Las [decisiones pendientes](../../planning/PENDING-DECISIONS.md), entre ellas la priorización de alcance y precio, que actualiza las historias de usuario.
- El [backlog de mejoras pendientes](../../planning/backlog.md).
- Las [historias de usuario](../../planning/user-stories/user-stories.md).
