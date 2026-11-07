# US21 — Atender reclamos

- Épica: [EP07 — Operar la tienda](../ep-07-operar-tienda.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [TRACEABILITY](../../../TRACEABILITY.md) («Libro de reclamaciones»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: reclamos con estado y respuesta del proveedor)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** ver los reclamos recibidos y registrar su estado y la respuesta de la tienda
- **Para** atenderlos dentro del plazo

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Bandeja de reclamos

- **Dado** que se registraron reclamos en la tienda
- **Cuando** el administrador abre Reclamaciones
- **Entonces** ve cada reclamo con su estado.

### Escenario 02 – Responder

- **Dado** que el administrador abre un reclamo
- **Cuando** cambia su estado y registra la respuesta
- **Entonces** el sistema guarda el estado y la respuesta.

## Fuera de alcance y pendientes

- El envío de la respuesta por correo, con evidencia de entrega, está pendiente (PBI-0012 del [backlog](../../../backlog.md)).
