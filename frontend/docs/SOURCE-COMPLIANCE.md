# Cumplimiento respecto de las 9 fuentes del proyecto

Se revisaron `nota-1.txt` a `nota-8.txt` y la reunión del 05/11 (transcripción y resúmenes) como conjunto de reuniones/transcripciones/resúmenes.

## Regla de consolidación

Las fuentes mezclan WebStore con otros frentes (gestor de reservas, ERP/CRM, ID Shield y planificación comercial). Este entregable se mide contra **los acuerdos funcionales y técnicos consolidados que corresponden a WebStore**; los pendientes conocidos están en la sección "Estado".

Cuando una reunión posterior modifica una idea anterior, prevalece la decisión posterior explícita. Ejemplos:

- filtros técnicos avanzados discutidos inicialmente → MVP final limitado a nombre, categoría y precio;
- categorías inicialmente consideradas hardcoded → decisión posterior: categorías/productos/inventario deben ser gestionables;
- SSR/SEO → acordado para fase posterior, no para la primera entrega funcional.

## Incluido

- Storefront y Admin separados.
- Productos, categorías, marcas e inventario gestionables.
- Usuarios/cuentas del cliente y clientes de compra guest diferenciados; contraseñas derivadas, códigos temporales y sesiones revocables.
- Carrito, IGV, checkout, métodos de pago demo y pedidos.
- Stock transaccional compartido.
- Modificación/cancelación de pedido dentro de 24 horas.
- Tabla de envíos origen/destino.
- Banners con vigencia.
- CMS de logo gráfico (URL o carga de imagen), color, contacto, navegación superior/lateral, header/footer y accesos.
- Tipografía única para el MVP.
- Login administrativo y roles fijos superadmin/admin/vendedor (asignables, no editables) con restricciones tanto en UI como en BFF.
- Pedidos en el Admin con detalle (cliente, contacto, dirección, distrito, origen, líneas y totales) y cambio de estado.
- Tarifas de envío: un mismo precio para varios distritos y ajuste porcentual por origen o global (inquietud de Walther sobre inflación y carga manual). *Nota (lote 25):* el ajuste porcentual se quitó en el lote 21 ([ADR-0025](../../docs/adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md), PBI-0217): Daniel y Walther coincidieron en que no aplica y el precio se cambia tarifa por tarifa. El precio para varios distritos sigue vigente.
- Contacto, envíos, privacidad y términos editables/activables/desactivables realmente (incluido acceso directo por URL), más libro de reclamaciones persistente y gestionable.
- Identidad visual propia (paleta B azul cobalto, tipografía única, estructura de inicio distinta de LG), aplicada a la tienda y al Admin; ver `VISUAL-SYSTEM.md`.
- Arquitectura Angular desacoplada y orientada a BFF.

## Evidencia de cierre

- `TRACEABILITY.md`: cada requisito final → implementación concreta.
- `BFF-CONTRACT.md`: endpoints, autenticación, autorización y convenciones.
- `VALIDATION.md`: compilación, contrato, interacciones, consola y responsive.
- `VISUAL-SYSTEM.md`: dirección visual propia, tokens, tipografía, motion y assets.
- `output/visual-qa/compliance-final/`: capturas verificadas de Storefront y Admin.

La revisión final no se limita a presencia de archivos: el smoke BFF comprueba flujos bidireccionales; Chrome comprueba UI, permisos e interacciones; y las dos aplicaciones compilan con chequeo estricto de tipos.

## No incluido deliberadamente por no existir decisión cerrada

- comparador de productos;
- proveedor definitivo de pasarela;
- facturación electrónica integrada;
- despliegue multi-tenant vs on-premise definitivo;
- múltiples direcciones por producto;
- SSR/SEO productivo en esta fase.

## Temas de las fuentes que no pertenecen a WebStore

No forman parte de este artefacto: gestor de reservas/citas de Mónica, chatbot/n8n, Agenda Pro, funcionalidades específicas de ID Shield, ni módulos ERP/CRM que no fueron incluidos en el mínimo estándar WebStore. Se conservan como contexto de producto, pero implementarlos aquí mezclaría alcances que las propias sesiones separaron.

## Estado (revisión del 2026-11-05)

Una auditoría posterior detectó que la declaración anterior de cumplimiento total no era correcta. Corregido:

- el checkout desde el Storefront fallaba siempre con `INSUFFICIENT_STOCK` (el BFF esperaba `productId` y el carrito envía `product`);
- "Mis pedidos" y el detalle del pedido quedaban vacíos tras recargar la página;
- cancelar un pedido no liberaba el stock reservado;
- los pedidos podían listarse por correo y cancelarse sin autorización;
- el origen del envío estaba fijo en "Lima Centro" en lugar de salir de la tabla origen → destino.

También resuelto:

- botón de tres puntos siempre visible en cada ficha (Ver detalle, Más de la categoría, Copiar enlace), sin depender del hover;
- el diálogo de "producto agregado" ofrece Seguir comprando, Ver carrito y Finalizar compra;
- el carrito persiste al recargar y se concilia con el catálogo vigente (precio, stock, productos retirados).

Recorrido del Admin en el navegador (2026-11-05):

- galería de fotos por producto (Admin) y en la ficha (Storefront);
- el Admin no cargaba sin sesión: el guard llamaba a `inject()` después de un `await` (NG0203);
- las vistas previas de imágenes del Admin fallaban porque los assets se publicaban en `/src/assets`;
- un guardado cualquiera del Admin sobrescribía el stock vendido en la tienda mientras estaba abierto; ahora hay control de revisión.

Todavía abiertos frente a las sesiones:

- paleta: Walther eligió B, la que está aplicada; falta la opinión de Daniel;
- tarifas: el modelo origen → distrito quedó aprobado (unos 1.600 valores); el listado del Admin no tiene búsqueda ni paginación para ese volumen;
- permisos exactos del rol vendedor: se implementó como ficha de productos existentes, inventario y estado de pedidos; confirmar con el equipo;
- prototipo Figma: sigue mostrando marca y campañas de LG y más de tres paneles; falta la limpieza acordada y los frames de carrito/checkout.

Los asuntos explícitamente abiertos en las reuniones no se cuentan como faltantes ni se presentan como integraciones productivas terminadas.

## Reunión del 05/11 — aplicado

- Paleta B en tienda y Admin desde un único archivo de tokens; sin beige, verde ni violeta.
- Distancia visual de LG para evitar problemas legales: hero contenido en tarjeta, categorías de texto sin íconos, beneficios en tarjetas claras, footer azul marino, sin activos ni textos de LG.
- Tipografía única (Source Sans 3), pesos hasta 600; se quitó la carga de Noto Sans en el Admin.
- Roles fijos superadmin/admin/vendedor; solo el superadministrador gestiona usuarios.
- Admin: vista de pedidos con detalle y tarifas masivas.
- Arquitectura limpia: la capa de aplicación de ambas apps depende de puertos; el HTTP vive en adaptadores. Código formateado con Prettier.
- Errores previos encontrados y corregidos en esta pasada: la fuente configurada se aplicaba sin comillas y la página caía a Times New Roman; el registro de clientes y el alta de usuarios del Admin validaban la contraseña con una expresión mal escapada (`\\d`) y rechazaban contraseñas válidas; los pedidos mostraban el estado en inglés.

## Segunda reunión del 05/11 — revisión de propuestas (Walther y Sebastián)

Confirmado:

- Paleta B. Walther la prefiere por su azul moderno y limpio; descartó C porque sus colores son iguales a los de la UPN.
- Estructura del Admin (General, Catálogo, Ventas, Tienda, Accesos) y roles superadministrador, administrador y vendedor.
- Tarifas de envío como tabla origen → distrito, con unos 1.600 valores. Este enfoque servirá de base para casos de prueba y reglas de negocio.
- El inicio no se considera una copia de LG.

Abierto (ver `PENDING-DECISIONS.md`): opinión de Daniel, relación con OpenCart, posible cambio de imágenes, la página 404 y la priorización, que afecta alcance y precio. Walther pidió priorizar los ajustes visuales con Daniel; Sebastián decidió aplicar sus dos ideas (colecciones alternadas y aparición al hacer scroll), que quedan para revisar con Daniel.

## Nota del 2026-11-13 — diálogo de «producto agregado» (feature 004)

Tras la reunión del 11/11, la feature [004](../../docs/specs/features/004-ajustes-de-la-tienda/specification.md) (PBI-0035) dejó el diálogo de «producto agregado» con dos botones, «Seguir comprando» y «Ver carrito» (el principal), sin «Finalizar compra». El carrito dice «Confirmar pedido» y el checkout, «Finalizar compra». Se entregó con el [PR #26](https://github.com/sebastianaviladev01-xyz/WebStore/pull/26). La revisión del 2026-11-05 no se reescribe: describe el diálogo de esa fecha.
