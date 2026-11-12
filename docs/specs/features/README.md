# Índice de features

Añade una fila al crear la carpeta de una feature. Al avanzar de etapa, actualiza su estado ([estados](../README.md#estados-de-una-feature)) y la columna de bloqueos.

| NNN | Slug | Historia | Estado | Bloqueos y siguiente paso | Última revisión |
|---|---|---|---|---|---|
| 001 | [`reorganizar-resumen-del-admin`](001-reorganizar-resumen-del-admin/specification.md) | Ninguna: pedido de Daniel del 2026-11-06 (estructura del dashboard de OpenCart) | entregada | [PR #4](https://github.com/sebastianaviladev01-xyz/WebStore/pull/4) fusionado en `dev` (`304dcc5`) con el CI en verde; [hito de entrega](001-reorganizar-resumen-del-admin/verification.md#hito-de-entrega) aceptado por Sebastián Avila el 2026-11-07. Sin siguiente paso: las mejoras están en el backlog (PBI-0027 a PBI-0029) | 2026-11-07 |
| 002 | [`temas-configurables`](002-temas-configurables/specification.md) | Ninguna: [PBI-0030](../../planning/backlog.md), priorizado en las reuniones del equipo (notas pegadas el 2026-11-11, PR #10) | planificada | Alcance aprobado por Sebastián Avila el 2026-11-11 (D1 a D7). [Plan](002-temas-configurables/planning.md) con el hito de arquitectura aprobado por Sebastián Avila el 2026-11-11, con la alternativa A en las [cuatro preguntas](002-temas-configurables/planning.md#respuestas-del-hito). ADR en propuesta desde `sdd-decide` el 2026-11-11: [ADR-0010](../../adrs/0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md) (hoja de estilos del tema), [ADR-0011](../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md) (temas como recurso del BFF, permiso `themes.manage` y cálculo de tokens) y [ADR-0012](../../adrs/0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md) (modo demo y cookie de vista previa, amplía STD-08). Depende de PBI-0043 sin bloquear. Siguiente paso: aprobación de los ADR por Sebastián Avila y, después, `sdd-tasks` | 2026-11-11 |

Lo que la demo ya implementa se hizo antes de adoptar este flujo: su evidencia está en la [trazabilidad](../../planning/TRACEABILITY.md) y en la [validación](../../../frontend/docs/VALIDATION.md), no en este índice.

## Siguiente trabajo del proyecto

**Por decidir por el equipo.** Un agente no lo elige: pregunta a la persona.

Orientación de la reunión del equipo (notas pegadas el 2026-11-11): lo primero son los temas configurables ([PBI-0030](../../planning/backlog.md)), antes de la gestión de banners; después vienen los ajustes priorizados del Admin y de la tienda (PBI-0031, PBI-0032 y PBI-0035 a PBI-0038). El orden exacto y el cronograma los fija el equipo.

Para decidirlo, el equipo revisa:

- Las [decisiones pendientes](../../planning/PENDING-DECISIONS.md), entre ellas la priorización de alcance y precio, que actualiza las historias de usuario.
- El [backlog de mejoras pendientes](../../planning/backlog.md).
- Las [historias de usuario](../../planning/user-stories/user-stories.md).
