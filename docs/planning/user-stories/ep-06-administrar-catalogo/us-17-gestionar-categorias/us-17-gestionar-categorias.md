# US17 — Gestionar categorías jerárquicas

- Épica: [EP06 — Administrar el catálogo](../ep-06-administrar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: categorías jerárquicas); [TRACEABILITY](../../../TRACEABILITY.md) («Gestión de categorías», «Subcategorías/niveles», «Orden explícito o alfabético»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: categorías jerárquicas y ordenables)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** organizar las categorías en niveles y ordenarlas
- **Para** que el comprador navegue el catálogo con facilidad

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Subcategorías

- **Dado** que existe una categoría
- **Cuando** el administrador crea otra dentro de ella
- **Entonces** el Admin muestra la lista jerárquica.

### Escenario 02 – Sin ciclos

- **Dado** que el administrador asigna como padre de una categoría a una de sus descendientes
- **Cuando** guarda
- **Entonces** el Admin y el BFF rechazan la jerarquía.

### Escenario 03 – Orden

- **Dado** que el administrador definió un orden para las categorías
- **Cuando** la tienda las muestra
- **Entonces** respeta ese orden y, sin orden explícito, las ordena alfabéticamente.
