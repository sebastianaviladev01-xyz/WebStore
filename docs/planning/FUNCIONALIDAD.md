# Funcionalidad — WebStore MVP

Implementación funcional del alcance **WebStore** consolidado a partir de las sesiones/reuniones adjuntas al proyecto. El workspace contiene dos aplicaciones Angular independientes y un Mock BFF compartido para demostrar la arquitectura final sin exigir un backend productivo.

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
11. pruebas unitarias (`npm test`): árbol de categorías, tarifas para varios distritos y ajuste porcentual, y migración de roles.

Formato del código: `npm run format` aplica Prettier y `npm run format:check` lo verifica.


## Storefront

- Home y banners con vigencia.
- Categorías jerárquicas por nombre, sin dependencia de iconografía.
- Catálogo con filtros acordados: nombre, categoría y precio.
- PDP con precio, descripción, características y stock.
- Compra bloqueada cuando no hay stock.
- Confirmación al añadir: seguir comprando o finalizar.
- Carrito: agregar, cambiar cantidad, eliminar, valor de venta, IGV y subtotal.
- Checkout guest; crear cuenta no es obligatorio.
- Datos de cliente y documento.
- Envíos por tabla origen → destino mantenida desde Admin.
- Métodos de pago demostrativos; proveedor definitivo permanece pendiente según las sesiones.
- Pedido transaccional: valida y descuenta stock en el BFF y registra cliente/pedido.
- Registro, login, verificación por código, recuperación, edición y eliminación de cuenta.
- Historial/detalle de pedidos, cancelación y cambio de dirección/fecha durante la ventana de 24 h.
- Contacto, información de envíos, privacidad y términos administrables, además de libro de reclamaciones persistente con código de recepción.
- Estados vacíos, sin resultados, sin stock y 404.

## Admin

- Dashboard.
- Productos.
- Inventario único compartido con Storefront.
- Categorías jerárquicas y ordenables (orden explícito; fallback alfabético).
- Marcas.
- Clientes, incluidos los creados por checkout guest.
- Usuarios administrativos, login y roles aplicados en frontend y BFF.
- Reclamos con estado y respuesta del proveedor.
- Pedidos y estados.
- Banners con fecha de inicio/fin.
- CMS: logo gráfico cargable/configurable, color, contacto, mensaje superior, navegación superior/lateral y footer.
- Contacto, Envíos, Privacidad y Términos con activación/desactivación efectiva mediante guards; al desactivarlas, tampoco son accesibles por URL directa.
- Tipografía única bloqueada en el MVP.
- Tabla configurable origen → destino.

### Roles

Roles fijos acordados el 05/11 (se asignan, no se editan):

- `superadmin`: todo, incluida la gestión de usuarios.
- `admin`: toda la operación de la tienda, sin gestionar usuarios.
- `vendedor`: resumen, ficha de productos existentes, inventario y estado de pedidos. No crea ni elimina productos ni cambia SKU, precio, categoría, marca o estado activo.

Los datos de versiones anteriores se migran solos: `owner` → `superadmin` y `catalog-maintainer` → `vendedor`.

Los guards del frontend mejoran la UX; el Mock BFF repite autenticación y autorización. Para producción aún corresponde integrar identidad gestionada, rate limiting, auditoría y persistencia transaccional.

## Decisiones no cerradas

No se resolvieron arbitrariamente los asuntos que las reuniones dejaron abiertos. Ver [PENDING-DECISIONS.md](PENDING-DECISIONS.md).


## Evidencia

- [Trazabilidad](TRACEABILITY.md): requisito → implementación.
- [Contrato del BFF](../../backend/docs/BFF-CONTRACT.md).
- [Validación](../../frontend/docs/VALIDATION.md): pruebas ejecutadas y limitaciones.
- [Sistema visual](../../frontend/docs/VISUAL-SYSTEM.md): paleta, tipografía y tokens.
- [Decisiones pendientes](PENDING-DECISIONS.md).
