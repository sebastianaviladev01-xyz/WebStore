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

### Escenario 03 – Botones de los banners

- **Dado** que un banner del hero tiene uno o dos botones
- **Cuando** el comprador lo ve
- **Entonces** el principal usa el color principal del tema y el secundario, el secundario; un enlace externo se abre en otra pestaña y lo anuncia a los lectores de pantalla.

> Añadido el 2026-11-23 por el lote 12 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0184 y PBI-0174; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-banners.spec.ts`.

### Escenario 04 – Avisos para los clientes

- **Dado** que el superadministrador publicó avisos en Contenido
- **Cuando** el comprador abre la tienda
- **Entonces** ve los avisos sobre la cabecera, cada uno con su enlace si lo tiene; si hay varios, rotan y se pueden pausar.

> Añadido el 2026-11-23 por el lote 15 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0175; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-contenido.spec.ts`.

### Escenario 05 – Imagen en «Compra por categoría»

- **Dado** que una categoría tiene imagen
- **Cuando** el comprador ve «Compra por categoría» en el inicio
- **Entonces** la tarjeta de esa categoría muestra su imagen; sin imagen, se ve como antes.

> Añadido el 2026-11-23 por el lote 11 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0162; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-categoria-imagen.spec.ts`.

### Escenario 06 – Productos destacados

- **Dado** que el backoffice marcó productos como destacados
- **Cuando** el comprador abre el inicio
- **Entonces** ve todos los destacados que tienen stock; si son más de cuatro, en un carrusel que se recorre con botones con nombre y respeta el movimiento reducido; si no hay ninguno con stock, la sección no sale.

> Añadido el 2026-11-24 por el lote 22 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0215; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: destacados, categorías, imágenes y listado»), sin especificación propia: lo prueban `frontend/tests/e2e/admin-destacados-y-categorias.spec.ts` y `destacados.rules.spec.mjs`. Los datos de ejemplo marcan los cuatro de siempre, así que la demo se ve igual.

### Escenario 07 – Avisos programados

- **Dado** que un aviso de Contenido tiene un «Desde» o un «Hasta»
- **Cuando** el comprador abre la tienda
- **Entonces** solo ve el aviso entre esas fechas; si pasa su «Hasta» con la página abierta, el aviso desaparece sin recargar.

> Añadido el 2026-11-24 por el lote 30 ([ADR-0027](../../../../adrs/0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md); PBI-0244; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Reunión del 2026-11-20: avisos programados»), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-contenido.spec.ts`, con el reloj simulado. Un aviso sin fechas se ve siempre, como en el escenario 04.

## Fuera de alcance y pendientes

- Queda el inicio actual (Daniel, 2026-11-20, PBI-0019); `/inicio-anterior` se quitó en el lote 16 (PBI-0193).
- Las imágenes del inicio se quedan (Daniel, 2026-11-20, PBI-0016).
- Productos destacados configurables (Daniel, revisión de la demo del 2026-11-17; PBI-0215): construidos en el lote 22 (Escenario 06). Los destacados «por periodo», que Daniel mencionó sin pedirlo, no entran.
