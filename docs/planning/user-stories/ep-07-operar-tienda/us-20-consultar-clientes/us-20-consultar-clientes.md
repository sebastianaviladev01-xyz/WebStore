# US20 — Consultar clientes

- Épica: [EP07 — Operar la tienda](../ep-07-operar-tienda.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: clientes); [TRACEABILITY](../../../TRACEABILITY.md) («Clientes de guest visibles en Admin», «Cliente ≠ usuario»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: clientes, incluidos los creados por checkout guest)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** ver a los clientes de la tienda, también a los que compraron como invitados
- **Para** conocer a quién vendo

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Clientes del checkout

- **Dado** que un comprador terminó una compra, con o sin cuenta
- **Cuando** el administrador abre Clientes
- **Entonces** ve al cliente creado o actualizado por el checkout.
