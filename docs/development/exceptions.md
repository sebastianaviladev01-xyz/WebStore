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

| Excepción | Ámbito | Cierre |
|---|---|---|
| [ADR-0037](../adrs/0037-cerrar-por-lotes-los-pendientes-que-no-dependen-de-terceros.md): cerrar por lotes los pendientes que no dependen de terceros, sin las etapas SDD por elemento | PBI-0197, PBI-0198, PBI-0276 a PBI-0283, PBI-0288 y PBI-0289, en el BFF, el backoffice y el storefront | Al fusionar el PR del lote 56. Responsable: Sebastián Avila |

## Excepciones cerradas

| Excepción | Ámbito | Cierre |
|---|---|---|
| [ADR-0035](../adrs/0035-construir-por-lotes-el-acceso-a-whatsapp.md): construir por lotes el acceso a WhatsApp, sin las etapas SDD | PBI-0241, en el BFF, el backoffice y el storefront | 2026-11-27, al fusionar el PR del lote 49 ([cierre](../adrs/0035-construir-por-lotes-el-acceso-a-whatsapp.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0033](../adrs/0033-construir-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-24.md): construir por lotes lo que salió de la reunión del 2026-11-24, sin las etapas SDD por elemento | PBI-0265 a PBI-0271 y los hallazgos de sus lotes (PBI-0272 a PBI-0275), en el backoffice, el BFF y el storefront | 2026-11-26, al fusionar el PR del lote 48 ([cierre](../adrs/0033-construir-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-24.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0032](../adrs/0032-cerrar-por-lotes-los-hallazgos-de-los-lotes-37-y-38.md): cerrar por lotes los hallazgos de los lotes 37 y 38, sin las etapas SDD por elemento | PBI-0256 a PBI-0262 y los hallazgos de sus lotes (PBI-0263 y PBI-0264), en el backoffice, las e2e, las herramientas de QA visual y la documentación del proceso | 2026-11-26, al fusionar el PR del lote 42 ([cierre](../adrs/0032-cerrar-por-lotes-los-hallazgos-de-los-lotes-37-y-38.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0031](../adrs/0031-cerrar-por-lotes-los-hallazgos-de-los-lotes-33-a-35.md): cerrar por lotes los hallazgos de los lotes 33 a 35, sin las etapas SDD por elemento | PBI-0252, PBI-0253 y PBI-0254 y los hallazgos de sus lotes (PBI-0256 a PBI-0262), en las herramientas de QA visual, las e2e y la guía de ejecución | 2026-11-25, al fusionar el PR del lote 39 ([cierre](../adrs/0031-cerrar-por-lotes-los-hallazgos-de-los-lotes-33-a-35.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0029](../adrs/0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md): cerrar por lotes los hallazgos de los lotes 28 a 31, sin las etapas SDD por elemento | PBI-0246, PBI-0247, PBI-0248 y PBI-0249 y los hallazgos de sus lotes (PBI-0252 a PBI-0255), en el storefront, el backoffice y el BFF | 2026-11-25, al fusionar el PR del lote 36 ([cierre](../adrs/0029-cerrar-por-lotes-los-hallazgos-de-los-lotes-28-a-31.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0027](../adrs/0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md): cerrar por lotes lo que salió de la reunión del 2026-11-20, sin las etapas SDD por elemento | PBI-0238, PBI-0239, PBI-0240, PBI-0243 y PBI-0244 y los hallazgos de sus lotes (PBI-0246 a PBI-0250), en el storefront, el backoffice y el BFF | 2026-11-24, al fusionar el PR del lote 32 ([cierre](../adrs/0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0025](../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md): cerrar por lotes lo que salió de la revisión de la demo, sin las etapas SDD por elemento | PBI-0211 a PBI-0224 y PBI-0226 y los hallazgos de sus lotes (PBI-0227 a PBI-0236), en el storefront, el backoffice y el BFF | 2026-11-24, al fusionar el [PR #86](https://github.com/sebastianaviladev01-xyz/WebStore/pull/86) ([cierre](../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0021](../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md): aplicar por lotes los cambios que pidió Daniel, sin las etapas SDD por elemento | PBI-0168 a PBI-0194, el resto del backlog que no depende de terceros (ampliación del 2026-11-23) y los hallazgos de sus lotes (PBI-0195 a PBI-0210), en el storefront, el backoffice y el BFF | 2026-11-23, al fusionar el PR del lote 18 ([cierre](../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md#cierre)). Responsable: Sebastián Avila |
| [ADR-0017](../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md): cerrar el backlog por lotes, sin las etapas SDD por elemento | Backlog abierto el 2026-11-14 y sus hallazgos, en el Storefront, el Admin y el BFF | 2026-11-15, con el PR del lote 09 ([cierre](../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md#cierre)). Responsable: Sebastián Avila |
