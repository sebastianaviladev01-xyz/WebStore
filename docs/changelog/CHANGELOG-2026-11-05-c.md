# Paleta B, roles fijos y arquitectura limpia — 2026-11-05 (reunión del 05/11)

## Identidad visual

- Paleta B "Azul cobalto" en la tienda y en el Admin, definida en un único archivo (`src/styles/tokens.css`) con nombres semánticos para Tailwind. Se retiraron el borgoña, el bronce, los índigos, verdes y grises sueltos de todas las plantillas.
- El inicio tiene estructura propia, distinta de LG: hero en tarjeta contenida con imagen al lado, categorías como tarjetas de texto con la cantidad real de productos, beneficios en tarjetas claras y footer azul marino. Se mantienen el carrusel de hasta tres banners, el mega-menú, los destacados por categoría, las colecciones y las campañas.
- Tipografía única (Source Sans 3) con pesos hasta 600. El Admin ya no carga Noto Sans desde Google Fonts.
- Sin etiquetas en mayúsculas sobre los títulos; la etiqueta de cada campaña se muestra junto a su botón.
- Las ofertas usan el acento naranja; el 404 se rediseñó con la paleta.
- Los colores configurados desde el CMS se migran: los valores por defecto anteriores pasan a la paleta B y los personalizados se respetan.

## Admin

- Roles fijos `superadmin`, `admin` y `vendedor`: se asignan, no se editan. Rutas protegidas por permiso y menú filtrado por rol. Se migran los roles anteriores (`owner` → `superadmin`, `catalog-maintainer` → `vendedor`) y se agrega la cuenta demo del Administrador.
- El BFF valida cada colección por permiso, rechaza roles inexistentes, impide quedarse sin superadministrador o bloquearse a uno mismo, y cierra las sesiones de usuarios eliminados o desactivados.
- Pedidos con detalle: filtro por estado, cliente, contacto, dirección, distrito, tienda de origen, fecha de entrega, medio de pago, productos, totales y cambio de estado (cancelar pide confirmación y devuelve el stock).
- Tarifas de envío: un mismo precio para varios distritos a la vez y ajuste porcentual global o por origen, con vista previa de cuántas tarifas se afectan.
- Resumen con pedidos por atender, productos activos, stock bajo y pedidos recientes según el rol.
- La barra lateral es clara y está agrupada por área; la cabecera muestra el rol en español.
- Los mensajes de las reglas del BFF se muestran tal cual al guardar.

## Arquitectura y código

- Tienda: cuenta, pedidos, contenido, reclamaciones y checkout dependen de puertos del dominio (`ACCOUNT_GATEWAY`, `ORDERS_GATEWAY`, `CONTENT_GATEWAY`, `COMPLAINTS_GATEWAY`, `CHECKOUT_GATEWAY`). El HTTP vive solo en adaptadores y los errores del BFF llegan como `BffRequestError`.
- Admin: la sesión usa `ADMIN_AUTH_GATEWAY`; los roles y las tarifas masivas son funciones de dominio con pruebas.
- Se eliminaron adaptadores en memoria sin uso (uno de ellos llamaba a un método inexistente).
- Prettier agregado (`npm run format`, `npm run format:check`) y aplicado a todo el código; ya no quedan archivos minificados en una sola línea.
- `npm test` ejecuta las pruebas unitarias y forma parte de `validate:contract`.

## Errores previos corregidos en esta pasada

- La fuente configurada en el CMS se aplicaba sin comillas: por el "3" de "Source Sans 3" el CSS era inválido y la página caía a Times New Roman.
- El registro de clientes y el alta de usuarios del Admin validaban la contraseña con una expresión mal escapada que exigía una barra invertida literal, así que rechazaban contraseñas válidas.
- El estado de los pedidos se mostraba en inglés ("confirmed") en la tienda.
- Al repetir un distrito en la carga masiva se conservaba la última forma escrita en lugar de la primera.

## Verificación

- `npm run build:all`, `npm run validate:contract` y `npm run format:check` en verde.
- Admin en el navegador con el vendedor (menú limitado y bloqueo de `/usuarios`) y con el superadministrador (usuarios y roles, tarifas, pedidos).
- Tienda a 1024 y 375 px sin desborde horizontal; compra completa como invitado sobre una copia de los datos.

## Ideas de Sebastián de la segunda reunión

- Colecciones del inicio alternadas: texto a la izquierda y productos a la derecha, y en la siguiente al revés, con fondo suave.
- Aparición suave al hacer scroll en categorías, destacados, colecciones, campañas y beneficios (`shared/ui/reveal/reveal.directive.ts`). Respeta `prefers-reduced-motion`, no oculta nada sin JavaScript y no deja bloques ocultos si se salta por encima de ellos.
- Verificado a 1280 y 375 px: sin desborde horizontal, sin errores de consola en una carga normal; en móvil las tarjetas del carrusel de destacados aparecen al deslizarlas.

## Más cerca de la propuesta B

- Hero con dos botones ("Descubrir…" y "Ver todos los productos") y puntos tipo píldora con pausa bajo el texto; se quitaron el contador visible y las flechas, y el número de diapositiva se anuncia a lectores de pantalla. El hero es más bajo (400 px).
- Buscador plano sobre el fondo plomo.
- Pestañas de destacados como píldoras y subtítulo "Stock visible y precios con IGV incluido.".
- Fichas con "Marca · SKU", nombre de 17 px y relleno más compacto.
- Secciones con menos aire vertical y títulos de colección más contenidos.
- Se conservaron las mejoras propias: cantidad de productos por categoría, descripción corta, colecciones alternadas y aparición al hacer scroll.

## Inicio con estructura tipo LG y estilo propio (06/11)

- Hero amplio: la foto llena el banner, el texto va encima a la izquierda sobre un velo azul suave, con la etiqueta del banner, dos botones y dos beneficios del CMS (íconos de candado y camión). Los controles (puntos, anterior, pausa, siguiente) van en una píldora abajo a la derecha. Las fotos de estudio se funden con el fondo.
- Fila de accesos rápidos con íconos bajo el hero (`shared/ui/service-shortcuts`): solo servicios con página existente; Envíos y Contacto respetan su interruptor del CMS. "Destacados" baja a la sección `#destacados`.
- Solo en el inicio actual: `/inicio-anterior` conserva su hero y no muestra los accesos.
- Compra por categoría: sin el enlace "Ver todos los productos" (ya está en Productos destacados). Las tarjetas llenan el ancho y muestran cantidad, subcategorías ("incluye OLED"), precio "Desde S/ …" calculado del catálogo y una flecha; en celular van en dos columnas sin flecha. `/inicio-anterior` conserva sus tarjetas originales.
- Controles del banner: en lugar de un punto por banner (no escala si se agregan más), un contador "1 / N" y una sola barra de progreso que se llena en los 8 s de cada banner y se detiene con la pausa; junto a anterior, pausa y siguiente. El número también se anuncia a lectores de pantalla. `/inicio-anterior` conserva sus puntos.
- Corregido: una franja azul claro bajo la foto del banner. Las diapositivas comparten el alto de la más larga y la foto solo cubría el suyo; ahora cubre todo el banner.
- Corregido: la variante del inicio llegaba como `undefined` desde el router en `/`; ahora se normaliza a "actual".
- Corregido: en celular, las tarjetas de colección que entran desde un costado abrían scroll horizontal mientras esperaban; ahora entran desde abajo y la sección recorta el desborde.

## Cabecera ordenada (toda la tienda)

- Cada destino aparece una sola vez: la franja azul deja el mensaje del CMS y "Ayuda" (se quitó "Seguimiento de pedidos", que repetía la acción "Pedidos"); la navegación del CMS omite Inicio (es el logo), Productos (es "Todas las categorías") y Pedidos (ya está en la cabecera).
- Corregido: un enlace del menú superior del CMS que no fuera Pedidos o Envíos llevaba al inicio. Ahora reconoce Envíos, Contacto/Ayuda, Privacidad, Términos, Libro de reclamaciones y Cuenta, respeta los interruptores de cada página y oculta los que no tienen destino.
- "Tienda online" pasa a "Todas las categorías", como en la propuesta B; categorías en peso 500 y enlaces secundarios en gris.
- Buscador más ancho, cabecera algo más baja y franja con texto de 12 px.
- El ícono de Pedidos se ve desde 480 px (antes desde 1024 px).
- Cabecera en una fila, como la referencia (desde 1360 px): logo, categorías con su mega-menú, Envíos, buscador compacto e íconos solo con ícono (con su nombre al pasar el cursor). Pasa de 120 a 73 px de alto. Debajo de 1360 px, o si la navegación supera 7 entradas, vuelve a dos filas para que nada quede cortado. Los paneles del mega-menú siguen abriéndose a todo el ancho.
- `/inicio-anterior` conserva la cabecera previa para comparar ("Tienda online", "Seguimiento de pedidos", Inicio/Pedidos/Envíos, buscador angosto). La cabecera detecta la versión por los datos de la ruta y aplica `.ws-shell-previous`; sus estilos están en `home-previous.css`. El resto de la tienda usa la cabecera nueva.

## Cabecera azul de marca: probada y revertida

- Se probó la opción B (barra completa en azul con el mensaje del CMS debajo) y, a pedido de Sebastián, se volvió a la cabecera blanca de una fila con la franja azul arriba.

## Cabecera final: la cabecera ordenada

- Se probaron una fila al estilo LG, la barra azul (opción B) y la cabecera literal de la propuesta B; Sebastián eligió la cabecera ordenada: franja azul con el mensaje del CMS y Ayuda; logo, buscador ancho y centrado, y acciones Ingresar, Pedidos y Carrito (con texto desde 1280 px); debajo, "Todas las categorías", las categorías y Envíos en gris.
- Cada destino aparece una sola vez. `/inicio-anterior` conserva su cabecera original.
- Detalles de la propuesta B: sin línea entre la fila principal y la navegación, ícono de caja para Pedidos, buscador que llega hasta las acciones y "Todas las categorías" con el mismo peso que las categorías. El logo conserva su sombra y la fila principal sus 76 px, igual que en la versión original. Envíos termina alineado con el texto de Carrito. El buscador mide hasta 560 px (proporcionado a un catálogo chico) y queda centrado entre "WebStore" e "Ingresar", medido al trazo del texto y del ícono, con menos de 1 px de diferencia; se compensa el relleno del botón y el aire propio del ícono. En celular dice "Buscar productos", igual que en escritorio. **Cabecera cerrada.** Se probó centrarlo respecto de la página y se descartó. Se probó mover Envíos a la franja azul y se descartó.

- Banner del inicio (solo la versión actual): pegado a la cabecera y de borde a borde hasta pantallas de 1920 px, con el alto en la proporción del banner original (1520 × 520, mínimo 520 px; unos 657 px en una pantalla de 1920). En pantallas más grandes (2K, 4K) deja de crecer y queda centrado a 1920 px, como en LG, para que la foto no se estire. Se conserva el diseño original: la foto llena el banner y el velo azul suave va detrás del texto. El encuadre es el original subido lo mínimo (posición vertical 31,5 % en lugar de 32 %): el borde superior del televisor queda justo al límite de arriba, a 1 px del borde del banner, sin cortarse; antes, en 1920 px, quedaba cortado por 1 px. Se probaron 26 % y 30 % y se descartaron por mover demasiado la foto. El texto se alinea con el logo; los controles del carrusel (1 / 2, anterior, pausa y siguiente) van en la esquina inferior derecha del banner, con el mismo aire a la derecha y abajo (40 px; en celular, 16 y 16): la misma posición para cualquier banner, sin depender de la foto, como en LG. Se probaron alineados con Carrito (quedaban muy adentro en pantallas grandes) y ligados a la foto de la sala (al canasto y al borde de la mesa, que no servían para otros banners), y se descartaron. Se probaron en la esquina a 24, 32, 40 y 64 px, centrados en el borde de la mesa y bajo ese borde, y se descartaron; la cápsula es de vidrio sin borde y más transparente, como en LG: blanco al 50 % con un desenfoque mínimo (6 px), y oscura al 50 % en fotos oscuras; 40 px de alto y sin relleno, de modo que el círculo del hover de cada flecha toca los bordes de la cápsula y el último coincide con su extremo (el hover ya no crece), las flechas y la pausa tienen trazo grueso con puntas redondeadas (2,25 px), como en LG, y el contador "1 / 2" va a 14 px (antes 13), con los números centrados en la cápsula a la misma altura que las flechas (antes medio píxel más arriba) y 12 px de aire a cada lado de la barra (antes 7 y 16) y usa los colores de la aplicación: azul de marca profundo (≥ 4,6:1 sobre la madera; las flechas, en azul de marca, ≥ 3,3:1), con la barra de progreso en azul sobre un riel azul suave (contraste del contador ≥ 4,5:1 sobre la madera; antes la cápsula era blanca al 88 %). Se probaron el total del contador tenue hasta el último banner y los controles del inicio anterior (puntos y flechas finas) dentro de la cápsula, y se descartaron. Se probó más transparente (48 %) con íconos negros gruesos y se descartó; en la foto de la sala quedan alineados con el canasto del mueble. Se probaron a 24 px, a 64 px, en el lugar de la tarjeta original (unos 220 px) y alineados al canasto con un porcentaje, y se descartaron. En tablet y celular sigue siendo una tarjeta. Con el navegador al 80 % de zoom una pantalla de 1920 px se comporta como una más grande y el banner se ve centrado. Las imágenes de banner conviene subirlas de al menos 1920 px de ancho (la de ejemplo mide 1536 px).

- Banners del inicio más livianos: los dos usan WebP y tienen versión para celular de 768 px (campo "Imagen móvil" de Banners). Sala: 125 KB en escritorio (antes 233 KB en JPG) y 37 KB en celular. Refrigerador: 20 KB en escritorio (antes 87 KB) y 6 KB en celular. La foto de la sala se codificó desde su original sin pérdida. Los teléfonos (hasta 640 px) descargan la versión chica; el primer banner sigue cargando con prioridad alta y el segundo sin apuro. Las fichas de producto siguen usando sus JPG. Se cargaron en los datos de ejemplo del BFF (`data.json` y la semilla de `server.mjs`). Se quitó `assets/brand/living-room-v2.png` (2,3 MB), que no se usaba y se publicaba en la tienda y el admin. Pendiente: una foto de la sala de 2400 px o más, porque la actual (1536 px) se estira en pantallas de 1920.

- Tono de la foto por banner, como en LG: nuevo campo "Tono de la foto" en Banners del admin (Clara u Oscura, por defecto Clara; `imageTone` en el BFF). Con Oscura, en escritorio los controles del carrusel pasan a vidrio oscuro (tinta al 58 %) con íconos, contador y barra en blanco, y el cambio se anima al pasar de un banner a otro. En celular no cambia, porque ahí los controles van sobre el fondo claro del texto. Los banners actuales quedan en Clara, así que hoy no se ve ninguna diferencia. La prueba del BFF comprueba que el tono llega a la tienda.

- Banner del refrigerador: el producto va centrado en la mitad derecha del contenido, entre el final del bloque de texto y el borde de Carrito, así acompaña al texto (en 1920 queda a unos 150 px del título; pegado a Carrito dejaba unos 550 px de azul vacío). Vale para cualquier foto de estudio, que conviene subir recortada al producto. En las fotos de ambiente, como la sala, el velo se mantiene como estaba (se probó reforzarlo abajo a la izquierda para ocultar la planta del mueble y se descartó); en su lugar sube el contraste del texto: los beneficios pasan al color de texto principal (de 6,4–7,8:1 a 10–12:1 sobre la foto) y, en escritorio, la descripción y los beneficios llevan un halo muy suave del azul del velo que los separa de lo que se ve detrás. La foto del banner se recortó al refrigerador y su fondo pasó a blanco puro, así ya no se nota el rectángulo tenue que dejaba el fondo casi blanco (`fridge-banner.webp`, 22 KB, y `fridge-banner-mobile.webp`, 6 KB; las fichas de producto siguen con su JPG). Hover de los controles del carrusel con un tono azul de la marca (antes blanco, casi invisible sobre la cápsula clara).

- Cabecera (solo la versión actual): "Envíos" lleva un ícono de camión en el azul de la marca y el mismo color y peso que las categorías, así se lee como enlace y no como un dato suelto (antes iba en gris claro); sigue alineado con Carrito. La flecha de "TV & Audio" va tenue en reposo y se enciende al pasar el mouse o al abrir el menú, para que no parezca un adorno distinto al resto de la fila. `/inicio-anterior` conserva su "Envíos" gris sin ícono y su flecha entera. Quedan fuera del código: más entradas en la fila de categorías (dependen del catálogo) y un logo propio (decisión de marca).

- Admin, Tarifas de envío: buscador por distrito u origen que no distingue tildes ni mayúsculas ("jesus maria" encuentra "Jesús María") y se combina con el filtro por origen; el listado va en páginas de 25 con Anterior/Siguiente y el resumen "Mostrando 26–50 de 80 tarifas (de 1600 en total)", que se anuncia a lectores de pantalla. Los distritos se ordenan con los números en orden natural ("Comas 2" antes que "Comas 10"). Probado con una copia de los datos con 1.600 tarifas (8 orígenes × 200 distritos); `tools/shipping-rates.test.mjs` cubre búsqueda, orden y paginación.

- Foto de la sala en alta resolución: el original nuevo (3072 × 2048 px, misma escena y mismo encuadre que la anterior) se publica como `living-room-v3.webp` de 2560 px (293 KB) y `living-room-v3-768.webp` para celular (45 KB). En 1920 px la foto ya no se estira: se muestra al 75 % de su tamaño, así que se ve nítida, y el marco del televisor sigue a 1 px del borde. El PNG original (12 MB) se movió a `design/originals/` para que no se publique con la tienda; las versiones v2 del banner se retiraron (la ficha de producto sigue usando `living-room-v2.jpg`).

- Banner del refrigerador con foto de ambiente: la cocina nueva (3966 × 1586 px) se publica como `kitchen-fridge.webp` de 2560 px (137 KB) y `kitchen-fridge-mobile.webp` de 1100 px (38 KB), como foto de ambiente con el mismo velo y diseño que la sala. Nuevo campo en Banners del admin, "Posición vertical de la foto (%)", que aparece en las fotos de ambiente (`imageFocusY` en el BFF; sin valor, 31,5 como la sala): la cocina usa 56 para que el refrigerador quede apoyado en el piso. En pantallas de 1600 px o más el refrigerador es más alto que el banner y se recorta un poco por arriba (unos 26 px de 675 en 1920); en 1366 px y menos se ve entero. Texto sobre la foto con contraste de 6,7:1 o más. El PNG original pasó a `design/originals/` y la foto de estudio recortada del banner se retiró (las fichas de producto siguen con la suya). La prueba del BFF comprueba que la posición llega a la tienda y se limita a 0–100.

- Revisión completa de tienda y Admin (ver `VALIDATION.md`). Correcciones: en celular, Productos, Clientes y Tarifas del Admin ya no se desbordan (las rejillas usan una columna que no crece más que la pantalla y las tarjetas contienen sus textos para lectores de pantalla); en Productos, categoría, marca y "Activo" se deshabilitan desde el formulario y no desde la plantilla, lo que quita el aviso de Angular (mismo comportamiento para el Vendedor); la ficha de producto declara la proporción real de sus fotos (4:3) y las miniaturas de la galería usan la foto de 480 px; las miniaturas de Banners del Admin usan la versión de celular y el Admin apaga el aviso de desarrollo NG0913, porque ahí mostrar fotos grandes en miniatura es lo esperado.

- Sala nueva y banner de lavadoras: la sala se cambió por una foto nueva con otra composición (3966 × 1586 px), publicada como `living-room-v4.webp` de 2560 px (216 KB) y `living-room-v4-mobile.webp` (64 KB). La versión de celular es un recorte del lado derecho para que el televisor quede entero también en 360 px. Usa una posición vertical de 45 %, y el marco del televisor queda con margen arriba en todos los anchos. Se agregó un tercer banner del hero, "Lavadoras" (`bn-5`, `laundry-washer.webp` de 176 KB y su versión de celular de 48 KB), con posición 60 % para que la lavadora quede apoyada en el piso en 1920 px. Lleva al catálogo de Electrohogar, igual que el del refrigerador. Su texto ("Tu ropa, lista sin complicaciones.") no promete datos de producto y se puede cambiar desde Banners del Admin. El hero queda con 3 banners activos, que es el máximo, así que para activar otro hay que desactivar uno. El texto se mide en 4,9:1 o más sobre las tres fotos, de 1024 a 1920 px. Los PNG originales pasaron a `design/originals/` y la sala v3 se retiró.

- Inicio, espacios de accesos y categorías (mismo diseño, sin cambiar colores ni elementos): los íconos de acceso rápido quedan a 28 px del banner y a 64 px de "Compra por categoría", así que se leen como dos grupos sin necesidad de línea; antes eran 32 y 52 px. Las tarjetas de categoría dejan 56 px antes de Destacados, y antes eran 8 px. En celular quedan 40 px antes del título y 40 px antes de Destacados, y antes eran 32 y 0 px. El inicio anterior no cambia.

- Destacados con pestañas subrayadas (solo la versión actual): se reemplazaron las píldoras, porque la activa en azul relleno era lo que más pesaba de la sección y competía con los botones del banner. La pestaña activa va en negrita con una línea azul sobre una línea fina a todo el ancho, alineada con la grilla y con "Ver todos los productos". Mejoras sobre la versión anterior: las pestañas no se mueven al elegir una (se reserva el ancho de la negrita), el contorno de foco con teclado se ve completo (antes lo recortaba el desplazamiento), cambian de color al pasar el mouse, miden 48 px de alto, y el grupo se anuncia como "Filtrar productos destacados".

- Subtítulo de Destacados: "Tecnología elegida por su diseño y desempeño, con precios que ya incluyen IGV." Mantiene el tono de la versión anterior y el dato del IGV, sin prometer "disponibilidad inmediata": el único producto de Cocina (Microondas EasyCook) tiene stock 0. En escritorio cabe en una línea.

- Categoría "TV & Audio" renombrada a "TV y audio", igual que el banner. Se cambió en los datos de demo, la semilla del BFF, el menú lateral por defecto y la prueba del BFF; se ve igual en la cabecera, las tarjetas de categoría, las pestañas y el inicio anterior. Es contenido, así que también se puede cambiar desde Categorías del Admin.

- Beneficios antes del pie (solo la versión actual): las tarjetas ocupan todo el ancho y quedan alineadas con la cabecera y con la grilla de Destacados. Antes la grilla dejaba una quinta columna vacía en escritorio, y las cuatro tarjetas terminaban unos 250 px antes del borde. Hay 4 por fila en escritorio (1200 px o más), 2 en tablet y 1 en celular. Como los beneficios se editan desde el Admin, las columnas siguen a la cantidad: con 3 beneficios hay 3 columnas y no queda ningún hueco. Las tarjetas también quedaron más bajas, porque los textos se cortan en menos líneas.

- Beneficios con textos concretos que la tienda cumple: "Compra como invitado" (no necesitas crear una cuenta para hacer tu pedido), "Envío según tu distrito" (el costo depende del distrito y se despacha desde la tienda más cercana, como dice el checkout), "Stock a la vista" (cada producto muestra cuántas unidades quedan) y "Libro de reclamaciones" (respuesta en un máximo de 15 días hábiles). Reemplazan a "Compra segura", "Despacho coordinado", "Disponibilidad visible" y "Atención cercana", que eran frases genéricas. Los íconos de la primera y la cuarta tarjeta pasan a ser una persona y un documento, los mismos de los accesos rápidos. En el banner, debajo de los botones, ahora dice "Compra como invitado · Envío según tu distrito" con el ícono de persona; en celular los dos van uno debajo del otro. Son contenido, así que se ven en los dos inicios y se editan desde Contenido del Admin. Pendiente: que Walther o Daniel confirmen el plazo de 15 días hábiles.

- Pie de página con más aire (en toda la tienda menos en el inicio anterior):
  - En la columna de la marca, el logo, la descripción y el contacto estaban pegados: los márgenes `mt-4` y `mt-6` no se aplicaban porque el reinicio global de párrafos los anula. Ahora van con 16 px y 24 px de separación.
  - Arriba hay 72 px en vez de 64.
  - La franja legal queda más cerca del final: 32 px debajo en vez de 64, que dejaban el texto flotando sobre el fondo oscuro.
  - Los enlaces pasan a 14 px con 14 px de separación, y el texto legal a 13 px.
  - En celular: 48 px arriba y 28 px abajo.

- Márgenes de párrafos y títulos en toda la tienda: el reinicio `h1–h4, p { margin-block-start: 0 }` estaba fuera de una capa de CSS, así que le ganaba a las utilidades de Tailwind y anulaba los `mt-*` de unos 40 párrafos y títulos. Ahora está en `@layer base`, como el resto del reinicio, y esos márgenes se aplican como se escribieron. El cambio se ve sobre todo entre el título y el subtítulo de cada página, que antes estaban pegados:
  - Catálogo, Envíos, Contacto, Libro de reclamaciones y Pedidos: 16 px.
  - Carrito, Checkout, Registro y Login: 12 px.
  - Ficha de producto: 24 px.
  - Página 404: 20 px.

  Se revisaron 19 páginas a 1366 y 390 px, antes y después: no hay desbordes y los dos inicios quedan igual. Otros estados que usan los mismos márgenes, como el detalle y la confirmación de pedido o los mensajes de error, no se capturaron uno por uno.

- Filtros del catálogo en escritorio: el botón "Ver N productos" es para cerrar el panel de filtros en celular, pero aparecía también en escritorio, pegado al último filtro o a "Limpiar filtros". Pasaba porque el estilo de los botones azules (`.ws-btn-primary`) se declara después y le ganaba a la regla que lo oculta. Ahora esa regla usa `.ws-catalog-filters .ws-filter-apply`. En escritorio los filtros se aplican al cambiarlos, sin botón, y en celular el botón sigue a todo el ancho, 24 px debajo. Revisado en Todos los productos y en TV y audio, a 1366, 1024 y 390 px; es el único botón de la tienda con este problema.

- Un solo "Limpiar filtros" en el catálogo: en escritorio aparecía dos veces, en el panel (negro subrayado) y junto al conteo de productos (azul). Queda solo el del panel, al lado de los filtros que limpia, y sirve igual en escritorio y en celular. Usa el mismo estilo de enlace azul que "Ver todos los productos" y mide 44 px de alto para tocarlo con el dedo; el texto queda a 20 px del último filtro. Si una búsqueda no da resultados, sigue visible en el panel.

- Paneles que acompañan al scroll, revisados en toda la tienda y el Admin. Se probaron haciendo scroll paso a paso a 1920×950, 1366×650, 1280×560/600 y 1024×700:
  - **Se mantienen (son intencionales y funcionan):** la cabecera fija, los filtros del catálogo, el resumen del carrito y del checkout (así "Confirmar pedido" está siempre a la vista, como en las tiendas grandes), la barra "Agregar al carrito" de la ficha en celular y la cabecera del panel de filtros en celular.
  - **Corregido:** el resumen del carrito y del checkout quedaba fijo a 112 px, pero la cabecera mide 123 px, así que se metía 11 px debajo de ella y cortaba el título "Resumen del pedido". Ahora usa la misma distancia que los filtros (`--ws-sticky-top`: 150 px).
  - **Pantallas bajas:** los filtros y el resumen ya no pueden quedar cortados por abajo. Si no caben, se desplazan por dentro, y en 1280×560 "Confirmar pedido" sigue alcanzable.
  - **Corregido en el Admin:** el menú lateral mide 784 px. En pantallas de 650 o 600 px de alto, sus últimas opciones quedaban fuera de la vista hasta llegar al final de la página. Ahora el menú se desplaza por dentro.
  - **Quitado:** el "fijo" del formulario de Banners no funcionaba, porque lo anulaba `.admin-card`, y tampoco convenía, porque mide 1136 px y el botón Guardar quedaría fuera de la vista.

- Tarjetas de producto sin huecos: el nombre reservaba siempre dos líneas (46 px) y la descripción también (42 px), así que con nombres y descripciones de una línea quedaban unos 33 px vacíos bajo el nombre y otros 21 px bajo la descripción. Ahora el texto ocupa lo que necesita, con 8 px entre nombre y descripción y 12 px hasta el stock. El precio y los botones siguen alineados abajo en cada fila. Revisado en el catálogo y en Destacados, a 1366 y 390 px; el inicio anterior conserva sus medidas.

- Destacados sin productos agotados: el inicio ya no destaca lo que no se puede comprar. Destacados, sus pestañas y las colecciones muestran solo productos con stock, y una pestaña de categoría aparece solo si hay algo disponible. Hoy "Cocina" no aparece en las pestañas porque su único producto (Microondas EasyCook) tiene stock 0; vuelve sola cuando haya stock. La tarjeta de Cocina en "Compra por categoría" se mantiene y lleva al catálogo, donde el producto figura como agotado.

- Banner en tablet (601–900 px): la foto usa la misma proporción del banner (5:2) en vez de un alto fijo de 260 px, así que se ve entera: el televisor completo y la lavadora y el refrigerador apoyados en el piso. En celular sigue a 220 px.

- Pedidos y checkout, revisados con un pedido real en una copia de los datos (los datos de demo no se tocaron):
  - **Fechas sin segundos:** "6 nov. 2026, 4:39 p. m.".
  - **Plurales correctos:** "2 productos" en vez de "2 producto(s)".
  - **Confirmación:** ícono dibujado en vez del carácter ✓, y el plazo real: "Durante las próximas 24 horas puedes cambiar la dirección o la fecha de entrega, o cancelar el pedido". Antes decía "dentro de las reglas del flujo".
  - **Detalle del pedido:** muestra hasta cuándo se puede modificar (fecha y hora). Usa "Valor de venta" e "IGV (18%)" como el checkout, y "Si cancelas, el plazo del extorno depende del medio de pago que usaste" en lugar de una nota interna sobre la reunión.
  - **Pedido no encontrado:** ahora ofrece "Iniciar sesión".
  - **Checkout:** los medios de pago se llaman "Tarjeta de crédito o débito", "Yape / Plin" y "Transferencia bancaria", con una sola nota: "Tienda de demostración: el pago se simula y no se realiza ningún cobro". Antes cada opción decía "pasarela demo; proveedor pendiente de decisión" o "flujo demostrativo".

- Libro de reclamaciones: al enviar con campos vacíos, cada campo dice qué falta (por ejemplo, "Cuéntanos qué pasó (al menos 10 caracteres)"). Antes solo se marcaban en rojo, sin texto.

- Admin:
  - Plurales correctos en Productos ("1 foto", "2 fotos"), Usuarios y Tarifas.
  - Los botones "×" para eliminar clientes y productos ahora dicen "Eliminar" y nombran el elemento para lectores de pantalla; el de clientes no tenía nombre accesible.
  - El botón para quitar una foto usa un ícono dibujado.
  - Las 12 pantallas, revisadas a 1440 y 390 px: sin desbordes ni errores de consola.

## Versión anterior del inicio, para comparar

- `/inicio-anterior` muestra el inicio tal como estaba antes de alinearlo con la propuesta B: hero con un botón y la etiqueta del banner, contador y flechas, buscador con borde, pestañas subrayadas y medidas anteriores de fichas y secciones.
- Reutiliza la misma página y el mismo hero con una variante (`HomeVariant`) que llega por los datos de la ruta; los estilos anteriores están acotados en `src/styles/home-previous.css`, así el inicio actual no cambia.
- No está enlazada en el menú. Para retirarla al decidir: borrar la ruta, `home-previous.css` y la variante.

## Revisión de funcionamiento (recorrido completo)

Corregido tras recorrer cada pantalla guardando datos sobre una copia de `data.json`:

- Crear producto: la miniatura era obligatoria sin mostrar mensaje, así que "Guardar" no hacía nada. Ahora es opcional y usa la imagen principal.
- Los guardados del Admin devuelven `true`/`false` en vez de lanzar errores; ninguna página deja errores sin manejar en consola y los formularios solo se limpian si se guardó.
- Contenido y Reclamaciones confirman el guardado ("Configuración publicada en la tienda.", "Atención guardada.").
- Estados de reclamos y ubicaciones de banners en español (antes "received", "hero").
- La tienda olvida los tokens de pedidos de invitado que el BFF ya no reconoce (404), en lugar de reintentarlos en cada visita.
- Verificar cuenta sin correo muestra cómo continuar; se quitó el espacio antes del punto en "enviado a correo.".
- Avisos de error del checkout y de banners anunciados a lectores de pantalla (`role="alert"`).
