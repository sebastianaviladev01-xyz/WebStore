# Funcionalidad — WebStore MVP

Implementación funcional del alcance **WebStore** consolidado a partir de las sesiones y reuniones del proyecto, con los cambios que pidió Daniel entregados el 2026-11-23 por lotes ([ADR-0021](../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); detalle en la [trazabilidad](TRACEABILITY.md#respuestas-de-daniel-lotes-11-a-20-2026-11-23)) y lo que salió de la revisión de la demo, entregado el 2026-11-24 por lotes ([ADR-0025](../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); detalle en la [trazabilidad](TRACEABILITY.md#revisión-de-la-demo-lotes-21-a-26-2026-11-24)), y lo que salió de la reunión del 2026-11-20, entregado el mismo 2026-11-24 por lotes ([ADR-0027](../adrs/0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md); detalle en la [trazabilidad](TRACEABILITY.md#reunión-del-2026-11-20-lotes-28-a-32-2026-11-24)). El workspace contiene dos aplicaciones Angular independientes, el storefront y el backoffice ([glosario](../architecture/glosario.md#aplicaciones)), y un BFF de prueba compartido para demostrar la arquitectura final sin exigir un backend productivo.

Cómo levantarlo y verificarlo: [README](../../README.md). Arquitectura: [docs/architecture](../architecture/README.md).

## Qué comprueba la validación contractual

`npm run validate:contract`, desde la raíz del repositorio, comprueba:

1. separación Storefront/Admin;
2. adapters HTTP obligatorios;
3. roles fijos superadmin/admin/vendedor, rutas protegidas por permiso y capa de aplicación sin `HttpClient`;
4. Admin → Storefront para productos/stock;
5. Storefront → Admin para pedidos/clientes/inventario;
6. CMS compartido, incluido logo gráfico, navegación lateral y toggles de páginas;
7. tarifas de envío compartidas;
8. registro, verificación, recuperación y revocación de cuentas;
9. autenticación y autorización administrativa por rol;
10. persistencia del libro de reclamaciones y contenido legal del CMS;
11. pruebas unitarias (`npm test`): árbol de categorías, tarifas para varios distritos (el ajuste porcentual se quitó en el lote 21, PBI-0217) y migración de roles.

Formato del código: `npm run format` aplica Prettier y `npm run format:check` lo verifica.


## Storefront

- Home y banners con vigencia (fecha y hora de Lima), cada uno con hasta dos botones (paleta primaria y secundaria); los enlaces externos se abren en otra pestaña.
- Productos destacados que elige el backoffice: todos los que tienen stock, en un carrusel si son más de cuatro; sin ninguno, la sección no sale.
- Avisos para los clientes en la parte superior, con enlace opcional, que rotan si hay varios. Cada uno puede llevar un «Desde» y un «Hasta»: solo se ven los vigentes.
- Categorías jerárquicas por nombre, sin dependencia de iconografía.
- Catálogo con filtros acordados: nombre, categoría (con su imagen, si la tiene) y un rango de precio con mínimo y máximo.
- Comparador de hasta 4 productos (`/comparar`), con la lista en la URL.
- PDP con precio, descripción, características y stock. Las fotos llegan por dirección del BFF (`/bff/images/...`), no dentro del JSON, y en el celular se carga la miniatura.
- Compra bloqueada cuando no hay stock.
- Confirmación al añadir: seguir comprando o ver el carrito, con productos sugeridos en un diálogo o, si la tienda lo elige, en un panel lateral.
- Carrito: agregar, cambiar cantidad, eliminar, valor de venta, IGV y subtotal.
- Checkout guest («Datos de tu compra»); crear cuenta no es obligatorio. «Finalizar compra» va al final, después de los datos de pago y de aceptar la versión vigente de los términos, que el pedido guarda con fecha y hora.
- Primera fecha de entrega según la configuración de la tienda (el mismo día, el día calendario siguiente o el siguiente día hábil, con hora de corte opcional), sin días no laborables.
- Una dirección por pedido o, si la tienda lo elige, una por producto, con el envío cobrado una vez por destino distinto.
- Datos de cliente y documento.
- Envíos por tabla origen → destino mantenida desde Admin.
- Métodos de pago demostrativos; proveedor definitivo permanece pendiente según las sesiones.
- Pedido transaccional: valida y descuenta stock en el BFF y registra cliente/pedido.
- Registro, login, verificación por código, recuperación, edición y eliminación de cuenta.
- Historial/detalle de pedidos, cancelación y cambio de dirección/fecha durante la ventana de 24 h.
- Contacto (varios correos, teléfonos y redes), información de envíos, privacidad y términos (con su versión vigente) administrables, pie armado con los accesos inferiores, además de libro de reclamaciones persistente con código de recepción.
- Estados vacíos, sin resultados, sin stock y 404, y un aviso de mantenimiento si el contenido nunca llega del BFF.
- Sin tuerca de temas: el tema solo se configura en el backoffice.
- Botón de WhatsApp abajo a la derecha, donde estaba la tuerca, si la tienda escribió su número en Contenido: abre la conversación en otra pestaña, con el mensaje inicial si lo hay. No aparece en el checkout ni tapa ningún control; en la ficha del celular sube sobre la barra de «Agregar al carrito».
- El color secundario del tema se ve en los botones secundarios, en el fondo con el puntero encima o con el foco, en la insignia «Oferta» y en el contador del carrito. El tema C lleva el negro de principal y el amarillo de secundario.

## Backoffice (proyecto `admin`)

- Dashboard con filtro de periodo (de hoy al año en curso; todas las cifras y el gráfico siguen el periodo), cifras plegables en tarjetas de color (ventas sin el envío), el gráfico de pedidos y «Clientes web nuevos» a todo el ancho (sin «Pedidos por distrito»), la distribución de ventas por categoría, últimos pedidos, alertas y actividad reciente.
- Campana de avisos: pedidos nuevos, reclamos nuevos y errores de compra.
- Mantenimientos estándar: un registro de más de tres campos tiene su propia interfaz y uno de hasta tres, una ventana emergente; ningún formulario va al costado de una lista. Los campos usan el contorno del storefront.
- Productos, con la casilla «Es destacado», la imagen y la galería cargadas como archivo, el precio con dos decimales, el SKU en su columna y la categoría elegida con búsqueda, en el registro y en el filtro. El stock no está en el registro: se gestiona en Inventario.
- Inventario único compartido con Storefront, el único lugar donde se cambia el stock; un producto nuevo empieza sin stock.
- Categorías jerárquicas y ordenables (orden explícito; fallback alfabético), en un árbol que se abre por niveles, con una imagen opcional de 100 × 100 px.
- Marcas, en una ventana emergente.
- Clientes, incluidos los creados por checkout guest, en una ventana emergente.
- Usuarios administrativos, en su propia interfaz; login y roles aplicados en frontend y BFF. Las tarjetas de los roles no cuentan usuarios.
- Reclamos con estado y respuesta del proveedor; la lista marca el abierto.
- Pedidos y estados.
- Banners en su propia interfaz, con las imágenes cargadas como archivo, fecha y hora de inicio y fin (que deben existir en el calendario), el tono de los controles calculado al cargar la foto y hasta dos botones.
- CMS: logo gráfico cargable/configurable, contacto múltiple, WhatsApp de la tienda (número con código de país y mensaje inicial, con «Probar»), avisos para los clientes (con «Desde» y «Hasta» opcionales), navegación lateral, accesos inferiores (pie), sugeridos en diálogo o panel lateral y versión de los términos.
- Contacto, Envíos, Privacidad y Términos con activación/desactivación efectiva mediante guards; al desactivarlas, tampoco son accesibles por URL directa.
- Tipografía única bloqueada en el MVP.
- Tabla configurable origen → destino, con el distrito elegido de una lista y sin ajuste porcentual.
- «Entregas y feriados» (superadministrador): días no laborables, primera fecha de entrega y una dirección por pedido o por producto.
- Listados en un solo panel, como la lista del SGC: título, «Exportar» (CSV o imprimir), filtros en una fila con «Buscar», «Limpiar» y «Agregar» a la derecha, «N°», estado como insignia, acciones de solo ícono, resumen por estado y paginación de 10, 25 o 50. Al crear un registro, el listado salta a su página.
- Páginas de registro como los formularios del SGC: «Regresar», estado, usuario y fecha, secciones con ícono, ayudas, contador, listas repetibles en tabla y «Guardar y continuar»; ruta de navegación en la barra superior.
- Borrados (y la cancelación de un pedido) confirmados con una ventana propia, con el nombre del registro.
- Temas con el código hexadecimal de cada color escrito o elegido con el selector, y una revisión de contraste que explica la relación y sugiere el color que cumple.
- Botones con su ícono a la izquierda, y el ícono del módulo junto al título de cada página.
- Tuerca de temas solo en el modo demo, con los tres temas predefinidos: en la barra superior, junto a la campana, y flotante solo en el acceso.
- Si falla la consulta al abrir un registro que el panel no tenía, aviso con «Reintentar» en lugar de «ya no existe»; si no se puede comprobar la sesión por un fallo pasajero, el acceso lo avisa con «Reintentar» y la sesión no se pierde.

### Roles

Roles fijos acordados el 05/11 (se asignan, no se editan), con los permisos de la reunión del 11/11 que aplicó el lote 07 y que Daniel confirmó el 2026-11-18 con un cambio, construido en el lote 11: el vendedor también gestiona Inventario y ve Pedidos (PBI-0170; [decisiones pendientes](PENDING-DECISIONS.md), «Permisos de los roles»):

- `superadmin`: todo, incluidos temas, contenido, entregas y feriados, el reinicio de la demo y la gestión de todos los usuarios.
- `admin`: toda la operación de la tienda (catálogo, inventario, clientes, pedidos, banners, tarifas y reclamaciones), elimina productos y gestiona a los vendedores sin eliminarlos. No configura temas ni contenido.
- `vendedor`: Dashboard, productos, inventario y pedidos. Crea productos y modifica todos sus campos, sin eliminarlos; gestiona el inventario y ve los pedidos sin cambiar su estado.

Los datos de versiones anteriores se migran solos: `owner` → `superadmin` y `catalog-maintainer` → `vendedor`.

Los guards del frontend mejoran la UX; el BFF de prueba repite autenticación y autorización. Para producción aún corresponde integrar identidad gestionada, rate limiting, auditoría y persistencia transaccional.

## Decisiones no cerradas

Lo que las fuentes no respondían se construyó con la opción más apegada a lo que dijo Daniel o con la más conservadora, y quedó marcado «Provisional, por confirmar con Daniel» hasta el 2026-11-27, cuando Sebastián Avila lo confirmó sin esperar a Daniel. Siguen abiertas las decisiones de terceros, de Daniel o de una persona. Ver [PENDING-DECISIONS.md](PENDING-DECISIONS.md).


## Evidencia

- [Trazabilidad](TRACEABILITY.md): requisito → implementación.
- [Contrato del BFF](../../backend/docs/BFF-CONTRACT.md).
- [Validación](../../frontend/docs/VALIDATION.md): pruebas ejecutadas y limitaciones.
- [Sistema visual](../../frontend/docs/VISUAL-SYSTEM.md): paleta, tipografía y tokens.
- [Decisiones pendientes](PENDING-DECISIONS.md).
