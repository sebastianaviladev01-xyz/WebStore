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
- **Entonces** los precios, el IGV, el envío y el total se recalculan en el servidor; no se usan los montos que envía el navegador. Si el total que vio el comprador ya no es el vigente, el pedido no se registra: la tienda avisa qué cambió y muestra el total actualizado antes de cobrar (lote 04, PBI-0106).

### Escenario 04 – Stock insuficiente

- **Dado** que un producto del carrito ya no tiene stock suficiente
- **Cuando** el comprador confirma la compra
- **Entonces** el pedido no se registra y el stock no cambia. La tienda vuelve a pedir el catálogo y, al volver a entrar al checkout, ya no muestra el error anterior (lote 04, PBI-0064).

### Escenario 05 – Términos y condiciones

- **Dado** que el comprador está en el checkout
- **Cuando** intenta finalizar la compra sin marcar «Acepto los términos y condiciones»
- **Entonces** el pedido no se envía y la tienda pide aceptarlos; al aceptarlos, el pedido guarda la fecha y hora de la aceptación.

### Escenario 06 – Doble envío

- **Dado** que el comprador pulsa dos veces «Finalizar compra», o la petición se repite
- **Cuando** la tienda envía el pedido
- **Entonces** se registra un solo pedido y el stock baja una sola vez.

### Escenario 07 – Datos de entrega

- **Dado** que el comprador deja vacíos la provincia, el departamento o la fecha, o elige una fecha anterior a hoy en Lima
- **Cuando** intenta finalizar la compra
- **Entonces** cada campo muestra su mensaje y el pedido no se envía. La fecha propuesta es dos días después de hoy, contados con la fecha de Lima.

> Añadido el 2026-11-14 por el lote 04 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0040, PBI-0063, PBI-0086 y PBI-0096; los términos son una decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md); el 2026-11-20 Daniel pidió guardar también la versión aceptada, PBI-0177), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-carrito-checkout.spec.ts`.

## Fuera de alcance y pendientes

- Los métodos de pago son demostrativos: la pasarela definitiva está pendiente (PBI-0002 del [backlog](../../../backlog.md)).
- La facturación electrónica está pendiente (PBI-0003 del [backlog](../../../backlog.md)).
- El MVP usa una dirección por pedido (PBI-0006 del [backlog](../../../backlog.md)).
