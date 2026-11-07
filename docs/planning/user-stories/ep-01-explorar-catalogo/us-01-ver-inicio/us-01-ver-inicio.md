# US01 — Ver el inicio de la tienda

- Épica: [EP01 — Explorar el catálogo](../ep-01-explorar-catalogo.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: Home); [TRACEABILITY](../../../TRACEABILITY.md) («Banners con vigencia», «Máximo de tres banners hero», «Home de e-commerce completo», «Categorías sin exigir iconos»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront: Home y banners con vigencia; categorías jerárquicas por nombre)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** ver en el inicio las campañas vigentes, los productos destacados y las categorías de la tienda
- **Para** llegar rápido a lo que busco

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Banners vigentes en el hero

- **Dado** que el Admin publicó banners con fecha de inicio y fin
- **Cuando** el comprador abre el inicio
- **Entonces** el hero muestra solo los banners vigentes, como máximo tres.

### Escenario 02 – Categorías sin íconos

- **Dado** que la tienda tiene categorías publicadas
- **Cuando** el comprador las ve en el inicio
- **Entonces** cada categoría se muestra por su nombre y descripción, sin exigir un ícono.

## Fuera de alcance y pendientes

- Qué estructura de inicio queda está pendiente (PBI-0019 del [backlog](../../../backlog.md)).
- Las imágenes del inicio están pendientes de revisión (PBI-0016 del [backlog](../../../backlog.md)).
