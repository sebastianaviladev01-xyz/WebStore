# US18 — Gestionar marcas

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: marcas); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de marcas»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: marcas)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** mantener la lista de marcas
- **Para** asignarlas a los productos

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Mantener marcas

- **Dado** que el administrador está en Marcas
- **Cuando** registra o edita una marca y guarda
- **Entonces** la marca queda disponible en la fuente única.

### Escenario 02 – Marca en uso

- **Dado** que una marca la usan productos
- **Cuando** el administrador la elimina
- **Entonces** no se elimina: el Admin dice cuántos productos la usan y el BFF lo rechaza.

### Escenario 03 – Marca inactiva

- **Dado** que una marca está inactiva
- **Cuando** el administrador elige la marca de un producto
- **Entonces** la marca inactiva no se ofrece, salvo que ya sea la del producto en edición.

### Escenario 04 – Un solo guardado

- **Dado** que el administrador pulsa dos veces «Guardar» en una marca nueva
- **Cuando** el primer guardado está en curso
- **Entonces** el botón dice «Guardando…» y se crea una sola marca.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0121 y PBI-0131; decisiones provisionales en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

## Notas

- Las fuentes no detallan más reglas de las marcas.
