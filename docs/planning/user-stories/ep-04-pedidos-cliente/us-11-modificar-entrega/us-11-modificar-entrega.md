# US11 — Modificar la entrega de un pedido

- Épica: [EP04 — Pedidos del cliente](../ep-04-pedidos-cliente.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: modificación dentro de 24 h); [TRACEABILITY](../../../TRACEABILITY.md) («Modificar dirección y fecha ≤24 h»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: cambio de dirección/fecha durante la ventana de 24 h)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** cliente
- **Quiero** cambiar la dirección o la fecha de entrega de mi pedido
- **Para** recibirlo donde y cuando me conviene

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Cambiar la dirección

- **Dado** que el pedido se creó hace menos de 24 horas
- **Cuando** el cliente cambia la dirección a otro distrito
- **Entonces** el sistema guarda la dirección y recalcula el origen y el costo de envío.

### Escenario 02 – Cambiar la fecha

- **Dado** que el pedido se creó hace menos de 24 horas
- **Cuando** el cliente cambia la fecha de entrega
- **Entonces** el sistema guarda la fecha nueva.

### Escenario 03 – Fuera de plazo

- **Dado** que el pedido se creó hace más de 24 horas
- **Cuando** el cliente intenta cambiar la dirección o la fecha
- **Entonces** el sistema rechaza el cambio.

## Fuera de alcance y pendientes

- El MVP usa una dirección por pedido (PBI-0006 del [backlog](../../../backlog.md)).
