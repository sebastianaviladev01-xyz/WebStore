# Excepciones a los estándares

Se aplica a cualquier desviación de un [estándar](../architecture/standards.md) o aplazamiento de un control condicionado. Es obligatoria ([STD-16 y STD-17](../architecture/standards.md)).

Cada excepción se registra como ADR a partir de [`0000-template.md`](../adrs/0000-template.md) y se enlaza desde el plan, el PR y la verificación de la feature. Los datos se reparten así en las secciones del ADR:

| Sección del ADR | Debe quedar registrado |
|---|---|
| Contexto | Regla y ámbito: STD afectado, feature o aplicación (Storefront, Admin o BFF) y motivo concreto. Riesgo: consecuencia, quién se expone y alternativas evaluadas (en la tabla de opciones). |
| Decisión | Qué se permite y qué sigue prohibido. Compensación: límite, aislamiento u otra comprobación verificable. |
| Consecuencias | Vigencia: responsable y fecha límite o disparador de revisión. Aprobación: revisor y fecha. Cierre: evidencia de corrección y ADR sustituto cuando corresponda. |

Una excepción no sirve para publicar secretos, versionar `backend/data.json`, saltarse la autorización del BFF ni cambiar el diseño visual sin pedido. Las limitaciones propias del BFF de prueba (sin identidad gestionada, rate limiting, auditoría ni persistencia transaccional) no son excepciones: son su alcance declarado en [`backend/architecture.md`](../../backend/architecture.md). Antes de usarlo con datos reales debe existir el BFF productivo.

## Excepciones vigentes

Ninguna.

## Excepciones cerradas

| Excepción | Ámbito | Cierre |
|---|---|---|
| [ADR-0025](../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md): cerrar por lotes lo que salió de la revisión de la demo, sin las etapas SDD por elemento | PBI-0211 a PBI-0224 y PBI-0226 y los hallazgos de sus lotes (PBI-0227 a PBI-0236), en el storefront, el backoffice y el BFF | 2026-11-24, al fusionar el [PR #86](https://github.com/sebastianaviladev01-xyz/WebStore/pull/86) ([cierre](../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0021](../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md): aplicar por lotes los cambios que pidió Daniel, sin las etapas SDD por elemento | PBI-0168 a PBI-0194, el resto del backlog que no depende de terceros (ampliación del 2026-11-23) y los hallazgos de sus lotes (PBI-0195 a PBI-0210), en el storefront, el backoffice y el BFF | 2026-11-23, al fusionar el PR del lote 18 ([cierre](../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0017](../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md): cerrar el backlog por lotes, sin las etapas SDD por elemento | Backlog abierto el 2026-11-14 y sus hallazgos, en el Storefront, el Admin y el BFF | 2026-11-15, con el PR del lote 09 ([cierre](../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md#cierre)). Responsable: Sebastián Avila |
