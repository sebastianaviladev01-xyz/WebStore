# US06 — Comprar como invitado

- Épica: [EP02 — Comprar](../ep-02-comprar.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: checkout guest, cuenta opcional, envíos configurables); [TRACEABILITY](../../../TRACEABILITY.md) («Compra guest», «Cliente ≠ usuario», «Pedido creado y consultable», «Tabla envío origen → destino», «Gestión de inventario»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: checkout guest, datos de cliente y documento, envíos, métodos de pago demostrativos, pedido transaccional); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (POST /checkout/orders)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** comprar sin crear una cuenta, indicando mis datos, mi distrito, la fecha de entrega y el método de pago
- **Para** terminar la compra sin fricción

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Compra sin cuenta

- **Dado** que el comprador tiene productos con stock en el carrito y no inició sesión
- **Cuando** completa sus datos y su documento, la dirección, la fecha de entrega y el método de pago, y confirma
- **Entonces** se crea el pedido, se descuenta el stock y se crea o actualiza el cliente, visible en el Admin.

### Escenario 02 – Costo de envío por distrito

- **Dado** que el comprador está en el checkout
- **Cuando** elige el distrito de entrega
- **Entonces** el costo de envío sale de la tabla origen → destino, desde la tienda de origen con la tarifa más baja para ese distrito.

### Escenario 03 – Montos calculados en el servidor

- **Dado** que el comprador confirma la compra
- **Cuando** el BFF registra el pedido
- **Entonces** los precios, el IGV, el envío y el total se recalculan en el servidor; no se usan los montos que envía el navegador.

### Escenario 04 – Stock insuficiente

- **Dado** que un producto del carrito ya no tiene stock suficiente
- **Cuando** el comprador confirma la compra
- **Entonces** el pedido no se registra y el stock no cambia.

## Fuera de alcance y pendientes

- Los métodos de pago son demostrativos: la pasarela definitiva está pendiente (PBI-0002 del [backlog](../../../backlog.md)).
- La facturación electrónica está pendiente (PBI-0003 del [backlog](../../../backlog.md)).
- El MVP usa una dirección por pedido (PBI-0006 del [backlog](../../../backlog.md)).
