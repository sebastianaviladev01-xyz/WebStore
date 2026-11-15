# US10 — Consultar mis pedidos

- Épica: [EP04 — Pedidos del cliente](../ep-04-pedidos-cliente.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: pedidos); [TRACEABILITY](../../../TRACEABILITY.md) («Historial/detalle», «Pedidos protegidos»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (GET /orders y GET /orders/:id)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** cliente
- **Quiero** consultar el historial y el detalle de mis pedidos
- **Para** saber en qué estado está mi compra

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Con cuenta

- **Dado** que el cliente inició sesión
- **Cuando** abre sus pedidos
- **Entonces** ve los pedidos de su cuenta y los que hizo con su correo verificado.

### Escenario 02 – Como invitado

- **Dado** que el cliente compró como invitado en este dispositivo
- **Cuando** abre sus pedidos
- **Entonces** ve el detalle de sus pedidos gracias al token guardado en el dispositivo. Solo se guarda el token de los pedidos hechos como invitado (lote 04, PBI-0104).

### Escenario 03 – Pedido ajeno

- **Dado** que alguien intenta abrir un pedido sin ser su dueño ni tener su token
- **Cuando** lo solicita
- **Entonces** el sistema responde como si el pedido no existiera.

### Escenario 04 – Al cerrar sesión

- **Dado** que el cliente compró con la sesión iniciada
- **Cuando** cierra sesión, elimina su cuenta o inicia sesión otra persona en el mismo navegador
- **Entonces** sus pedidos ya no se ven en «Mis pedidos» ni en el detalle, y el navegador no guarda su token.

> Añadido el 2026-11-14 por el lote 04 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0104), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-carrito-checkout.spec.ts`.
