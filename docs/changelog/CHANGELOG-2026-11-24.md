# Cambios — 2026-11-24: lo que salió de la revisión de la demo, por lotes

Daniel y Walther revisaron la demo el 2026-11-17, y de esa revisión salieron PBI-0211 a PBI-0226 (PR #79). Sebastián Avila pidió cerrarlos todos el 2026-11-24, por lotes, y elegir la mejor solución cuando algo chocaba, salvo lo de terceros y la marca. Se entregaron en seis lotes por área, como excepción al flujo SDD ([ADR-0025](../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md)). Cada lote tuvo su rama, su PR y la auditoría de la sesión principal. Lo que la reunión no decidió se construyó con la opción más apegada a lo que dijeron Daniel y Walther, o con la más conservadora, y quedó como «Provisional, por confirmar con Daniel» en las [decisiones pendientes](../planning/PENDING-DECISIONS.md).

- **Mantenimientos del backoffice (lote 21, PR #81):** un registro de más de tres campos tiene su propia interfaz (Usuarios y Banners) y uno de hasta tres, una ventana emergente (Marcas, Clientes y Tarifas de envío); ningún formulario queda al costado de una lista. Las tarjetas de los roles ya no cuentan usuarios. En Tarifas de envío el distrito se elige de una lista y se quitó el ajuste porcentual.
- **Destacados y categorías (lote 22, PR #80):** la casilla «Es destacado» elige los destacados del inicio, en un carrusel si son más de cuatro; los datos de ejemplo marcan los cuatro de siempre. Categorías se ve como un árbol que se abre por niveles.
- **Dashboard, reclamaciones e inventario (lote 23, PR #82):** «Clientes web nuevos» en lugar de «Clientes nuevos» y sin «Pedidos por distrito»; la gestión de reclamaciones se queda como está; el stock sale del registro del producto y se gestiona solo en Inventario.
- **Imágenes y banners (lote 24, PR #83):** la imagen principal del producto y las del banner se cargan como archivo, y la tienda las pide al BFF por dirección ([ADR-0026](../adrs/0026-guardar-las-imagenes-cargadas-en-el-bff-y-servirlas-por-direccion.md), propuesta). El formulario del banner explica sus campos, calcula el tono de los controles al cargar la foto y lleva la vigencia con fecha y hora de Lima.
- **Campos, listado de productos y hallazgos (lote 25, PR #84):** los campos del backoffice usan el contorno del storefront; el listado de Productos lleva el precio con dos decimales y el SKU en su columna; la ventana del tema mide 1200 px. Además, la galería y la imagen de la categoría también se cargan como archivo y llegan por dirección, la ficha ya no avisa `NG02960`, Reclamaciones marca la abierta, y se retiraron `filtrarCategorias` y los escenarios de capturas rotos.
- **Cierre (lote 26):** el backlog, las decisiones pendientes, la trazabilidad, la funcionalidad, las historias de usuario y este historial al día, y el cierre de la excepción.

## Verificación

- Cada lote: `npm run verify` y `npm run test:e2e` completos, ejecutados por la sesión del lote o por la sesión principal; capturas antes y después cuando tocaba la interfaz, guardadas en `frontend/output/visual-qa/lote-NN-*/` del checkout principal (no se versionan).
- Con los lotes 21 a 24 juntos: 407 pruebas del frontend, 706 del BFF, 34 de arquitectura, el smoke test del contrato y 362 e2e, todo en verde.
- Al terminar el lote 25: 402 pruebas del frontend (cinco menos, por las de `filtrarCategorias`), 713 del BFF, 34 de arquitectura y el smoke test, en verde. Su e2e completo lo informa su PR.

## Lo que queda abierto

Las decisiones provisionales, por confirmar con Daniel, en las [decisiones pendientes](../planning/PENDING-DECISIONS.md), sobre todo PBI-0211 y PBI-0217; ADR-0026, propuesto; el cronograma (PBI-0225), que Sebastián prepara con Daniel y Walther; los hallazgos abiertos del lote 25 (PBI-0234 a PBI-0236); y lo que ya estaba fuera, con su motivo en el [backlog](../planning/backlog.md) ([cierre de ADR-0025](../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md#cierre)).
