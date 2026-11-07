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
