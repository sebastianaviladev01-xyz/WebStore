# Índice de features

Añade una fila al crear la carpeta de una feature. Al avanzar de etapa, actualiza su estado ([estados](../README.md#estados-de-una-feature)) y la columna de bloqueos.

| NNN | Slug | Historia | Estado | Bloqueos y siguiente paso | Última revisión |
|---|---|---|---|---|---|
| 001 | [`reorganizar-resumen-del-admin`](001-reorganizar-resumen-del-admin/specification.md) | Ninguna: pedido de Daniel del 2026-11-06 (estructura del dashboard de OpenCart) | verificada | [Verificación](001-reorganizar-resumen-del-admin/verification.md): `verify`, e2e (`34 passed`) y `audit:all` en verde sobre `f9598f3`; capturas finales idénticas a las aprobadas en ⚠ TASK-12; trazabilidad AC-01 a AC-14 completa. Firmas `Co-Authored-By` de cinco commits de la fase 2 quitadas antes del push. Pendiente: el PR de entrega hacia `dev` con `pr-create` y el hito de entrega después del merge | 2026-11-07 |

Lo que la demo ya implementa se hizo antes de adoptar este flujo: su evidencia está en la [trazabilidad](../../planning/TRACEABILITY.md) y en la [validación](../../../frontend/docs/VALIDATION.md), no en este índice.

## Siguiente trabajo del proyecto

**Por decidir por el equipo.** Un agente no lo elige: pregunta a la persona.

Para decidirlo, el equipo revisa:

- Las [decisiones pendientes](../../planning/PENDING-DECISIONS.md), entre ellas la priorización de alcance y precio, que actualiza las historias de usuario.
- El [backlog de mejoras pendientes](../../planning/backlog.md).
- Las [historias de usuario](../../planning/user-stories/user-stories.md).
