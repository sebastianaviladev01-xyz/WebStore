# US14 — Registrar un reclamo en el Libro de Reclamaciones

- Épica: [EP05 — Información y reclamos](../ep-05-informacion-y-reclamos.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [TRACEABILITY](../../../TRACEABILITY.md) («Libro de reclamaciones»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: libro de reclamaciones persistente con código de recepción); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (POST /complaints)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** registrar un reclamo en el Libro de Reclamaciones y recibir una constancia
- **Para** dejar constancia y saber cuándo me deben responder

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Registro del reclamo

- **Dado** que el comprador completa el formulario del Libro de Reclamaciones con datos válidos
- **Cuando** lo envía
- **Entonces** el sistema guarda el reclamo y entrega una constancia con un código `REC-AAAA-xxxxx` y la fecha límite de respuesta.

### Escenario 02 – Plazo de respuesta

- **Dado** que se registró un reclamo
- **Cuando** el sistema calcula la fecha límite
- **Entonces** la fecha es 15 días hábiles después, contando de lunes a viernes y sin los feriados configurados.

### Escenario 03 – Formulario inválido

- **Dado** que falta un dato obligatorio
- **Cuando** el comprador envía el formulario
- **Entonces** el sistema no registra el reclamo.

## Fuera de alcance y pendientes

- El formulario, el plazo y los textos requieren revisión legal (PBI-0009 del [backlog](../../../backlog.md)).
- El calendario de días no laborables está pendiente (PBI-0010 del [backlog](../../../backlog.md)).
- Está pendiente confirmar que la tienda asume el plazo que anuncia el inicio (PBI-0017 del [backlog](../../../backlog.md)).
