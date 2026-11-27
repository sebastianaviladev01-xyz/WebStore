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

- **Dado** que el comprador deja vacíos la provincia, el departamento o la fecha, o elige una fecha anterior a la primera permitida
- **Cuando** intenta finalizar la compra
- **Entonces** cada campo muestra su mensaje y el pedido no se envía. La fecha propuesta es la primera fecha de entrega de la tienda (desde el lote 17, escenario 08).

> Añadido el 2026-11-14 por el lote 04 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0040, PBI-0063, PBI-0086 y PBI-0096; los términos son una decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md); el 2026-11-20 Daniel pidió guardar también la versión aceptada, PBI-0177), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-carrito-checkout.spec.ts`.

### Escenario 08 – Primera fecha de entrega

- **Dado** que la tienda configuró la primera fecha de entrega (el mismo día, el día calendario siguiente o el siguiente día hábil, con hora de corte opcional en hora de Lima)
- **Cuando** el comprador abre el checkout o elige una fecha anterior
- **Entonces** el campo propone la primera fecha permitida y no acepta una anterior; el BFF la vuelve a validar sin contar sábados, domingos ni días no laborables cuando la regla es de días hábiles.

> Añadido el 2026-11-23 por el lote 17 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0178; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/storefront-carrito-checkout.spec.ts` y `admin-entregas-y-feriados.spec.ts`.

### Escenario 09 – Versión de los términos

- **Dado** que el comprador acepta los términos en el checkout
- **Cuando** finaliza la compra
- **Entonces** el pedido guarda la versión aceptada y la fecha y hora con segundos; si los términos cambiaron mientras compraba, la tienda avisa, desmarca la casilla y pide aceptarlos otra vez.

> Añadido el 2026-11-23 por el lote 17 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0177; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-checkout.spec.ts`.

### Escenario 10 – «Finalizar compra» al final

- **Dado** que el comprador está en el checkout («Datos de tu compra»)
- **Cuando** llena sus datos, la entrega y el pago
- **Entonces** la casilla de términos y «Finalizar compra» quedan al final, después del método de pago; en el celular, después del resumen con el total.

> Añadido el 2026-11-23 por el lote 16 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0190; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-checkout.spec.ts`.

### Escenario 11 – Una dirección por producto

- **Dado** que la configuración de la tienda eligió una dirección por producto
- **Cuando** el comprador envía algún producto a otra dirección
- **Entonces** el envío se cobra una vez por cada dirección distinta y el resumen lo desglosa; el pedido guarda la dirección de cada línea. Si una dirección de línea no es válida, el campo de esa línea se marca. Con una dirección por pedido, el checkout es el de siempre.

> Añadido el 2026-11-23 por el lote 19 y el 18 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0006 y PBI-0209; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-direcciones-por-producto.spec.ts`.

## Fuera de alcance y pendientes

- Los métodos de pago son demostrativos: la pasarela definitiva está pendiente (PBI-0002 del [backlog](../../../backlog.md)).
- La facturación electrónica está pendiente (PBI-0003 del [backlog](../../../backlog.md)).
- Por defecto, una dirección por pedido; la configuración de la tienda puede elegir una por producto (escenario 11, PBI-0006).
