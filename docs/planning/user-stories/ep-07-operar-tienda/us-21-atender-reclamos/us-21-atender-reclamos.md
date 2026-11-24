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

### Escenario 03 – Reclamo abierto a la vista

- **Dado** que el administrador abre un reclamo de la lista
- **Cuando** mira la lista o trabaja en una pantalla de menos de 1280 px
- **Entonces** la lista marca el reclamo abierto (también para un lector de pantalla) y, en la pantalla angosta, la vista baja al detalle y el foco pasa a su título.

> Añadido el 2026-11-24 por el lote 25 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0223 y PBI-0232; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: reclamaciones»), sin especificación propia: lo prueba `frontend/tests/e2e/admin-listados.spec.ts`. La gestión de reclamaciones se queda como estaba (lote 23).

## Fuera de alcance y pendientes

- El envío de la respuesta por correo, con evidencia de entrega, está pendiente (PBI-0012 del [backlog](../../../backlog.md)).
