# US19 — Gestionar pedidos

- Épica: [EP07 — Operar la tienda](../ep-07-operar-tienda.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: pedidos); [TRACEABILITY](../../../TRACEABILITY.md) («Pedidos visibles en Admin», «Pedidos con detalle en Admin», «Cancelar pedido ≤24 h»); [contrato del BFF](../../../../../backend/docs/BFF-CONTRACT.md) (Administración)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador o vendedor
- **Quiero** ver los pedidos con su detalle y cambiar su estado
- **Para** despacharlos

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Lista y detalle

- **Dado** que la tienda recibió pedidos
- **Cuando** el usuario abre Pedidos en el Admin
- **Entonces** ve los pedidos, puede filtrarlos por estado y ve el cliente, el contacto, la dirección, el distrito, la tienda de origen, las líneas y los totales.

### Escenario 02 – Cambiar el estado

- **Dado** que el usuario abre un pedido
- **Cuando** cambia su estado
- **Entonces** el pedido queda con el estado nuevo.

### Escenario 03 – Cancelar desde el Admin

- **Dado** que el usuario cambia un pedido a Cancelado
- **Cuando** guarda
- **Entonces** el stock reservado se libera; si después lo reactiva, el stock se vuelve a reservar.

### Escenario 04 – Detalle, fechas y términos

- **Dado** que el usuario filtra los pedidos por estado o abre uno
- **Cuando** mira el detalle
- **Entonces** el detalle es de un pedido de la lista filtrada; las fechas están en la hora de Lima, cualquiera sea la zona del navegador; y se ve cuándo aceptó el comprador los términos.

### Escenario 05 – Cancelación no confirmada

- **Dado** que el usuario elige «Cancelado» para un pedido
- **Cuando** responde «Cancelar» a la confirmación
- **Entonces** el pedido no cambia y el selector vuelve a mostrar su estado.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0023, PBI-0066, PBI-0067, PBI-0126 y PBI-0145), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.
