# Índice de features

Añade una fila al crear la carpeta de una feature. Al avanzar de etapa, actualiza su estado ([estados](../README.md#estados-de-una-feature)) y la columna de bloqueos.

| NNN | Slug | Historia | Estado | Bloqueos y siguiente paso | Última revisión |
|---|---|---|---|---|---|
| 001 | [`reorganizar-resumen-del-admin`](001-reorganizar-resumen-del-admin/specification.md) | Ninguna: pedido de Daniel del 2026-11-06 (estructura del dashboard de OpenCart) | en implementación | [Tareas](001-reorganizar-resumen-del-admin/tasks.md): las tres fases hechas (TASK-01 a TASK-14: reglas puras del Resumen con TDD, `?pedido=` en Pedidos, Resumen reorganizado aprobado, e2e y documentos), en la rama `feature/001-reorganizar-resumen-del-admin` sin push. Ninguna bloqueada. Siguiente: `sdd-verify` en una sesión nueva y después el PR de entrega hacia `dev` | 2026-11-07 |

Lo que la demo ya implementa se hizo antes de adoptar este flujo: su evidencia está en la [trazabilidad](../../planning/TRACEABILITY.md) y en la [validación](../../../frontend/docs/VALIDATION.md), no en este índice.

## Siguiente trabajo del proyecto

**Por decidir por el equipo.** Un agente no lo elige: pregunta a la persona.

Para decidirlo, el equipo revisa:

- Las [decisiones pendientes](../../planning/PENDING-DECISIONS.md), entre ellas la priorización de alcance y precio, que actualiza las historias de usuario.
- El [backlog de mejoras pendientes](../../planning/backlog.md).
- Las [historias de usuario](../../planning/user-stories/user-stories.md).
