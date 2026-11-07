# US12 — Cancelar un pedido

- Épica: [EP04 — Pedidos del cliente](../ep-04-pedidos-cliente.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: cancelación dentro de 24 h); [TRACEABILITY](../../../TRACEABILITY.md) («Cancelar pedido ≤24 h»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (PATCH /orders/:id/cancel)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** cliente
- **Quiero** cancelar mi pedido
- **Para** no recibir una compra que ya no quiero

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Cancelar a tiempo

- **Dado** que el pedido se creó hace menos de 24 horas
- **Cuando** el cliente lo cancela
- **Entonces** el pedido pasa a Cancelado y su stock vuelve a estar disponible.

### Escenario 02 – Fuera de plazo

- **Dado** que el pedido se creó hace más de 24 horas
- **Cuando** el cliente intenta cancelarlo
- **Entonces** el sistema rechaza la cancelación.

## Fuera de alcance y pendientes

- El extorno real y sus plazos dependen del medio de pago (PBI-0007 del [backlog](../../../backlog.md)).
