# 004. Ajustes de la tienda — Especificación

- Feature: `004-ajustes-de-la-tienda`
- Historia de usuario: ninguna como origen. Sale de [PBI-0035](../../../planning/backlog.md) (diálogo al agregar al carrito), [PBI-0036](../../../planning/backlog.md) (textos de la compra), [PBI-0037](../../../planning/backlog.md) (fondo de la tienda) y [PBI-0038](../../../planning/backlog.md) (panel y campos del checkout), priorizados en las reuniones del equipo (Daniel, Walther y Sebastián; notas pegadas el 2026-11-11 y de nuevo el 2026-11-12). Sebastián Avila la eligió como siguiente feature el 2026-11-12. Modifica el Escenario 01 de [US04 — Agregar un producto al carrito](../../../planning/user-stories/ep-02-comprar/us-04-agregar-al-carrito/us-04-agregar-al-carrito.md)
- Estado: aprobada
- Fecha: 2026-11-12
- Hito de alcance: aprobado por Sebastián Avila el 2026-11-12, con las cinco [decisiones del hito](#decisiones-del-hito-de-alcance) (D1 a D5; D3 se reabrió y se volvió a responder ese mismo día)

## Problema y actores

En la revisión de la tienda publicada, Daniel pidió cuatro ajustes del camino de compra, con un mismo criterio: el cliente «quiere comprar rápido» y no debe dudar ni esperar.

1. **Diálogo al agregar al carrito.** Hoy ofrece «Seguir comprando», «Ver carrito» y «Finalizar compra», y el botón principal es «Finalizar compra». Daniel quiere solo «Seguir comprando» y «Ver carrito», con «Ver carrito» como principal: el cliente debe revisar el carrito (cantidades o productos repetidos) antes de seguir.
2. **Textos de la compra.** «Finalizar compra» es el pago, porque la compra termina al pagar; el paso previo, desde el carrito, es «Confirmar pedido», como propuso Walther. Hoy el carrito dice «Continuar al checkout» y el checkout termina en «Confirmar pedido»: los nombres están al revés de lo acordado.
3. **Fondo de la tienda.** El lienzo plomo (`#F3F5F8` en B) hace que los componentes de la tienda parezcan deshabilitados. Daniel quiere uno más claro o blanco, aunque «tampoco me gustaría que sea 100 % blanco», y pidió comparar las dos opciones «para ver si nos quedamos con un color más ligero de fondo o directamente le pondríamos todo blanco». La tarea que se le asignó a Sebastián fue «Aclara el color del fondo y compara una opción más clara con el blanco».
   - La queja es de la tienda, no del Admin. Sobre el plomo, Daniel dijo «Eso funciona, ¿sabes dónde? En el dashboard», y que el problema «no tiene nada que ver con ser limpio»: en el Admin el plomo le parece bien.
4. **Checkout.** Los datos del checkout van hoy directamente sobre el lienzo plomo, separados por líneas. Daniel los quiere en su propio panel, con campos limpios que resalten solo el borde exterior y una animación limpia y rápida.

Actores: el comprador, invitado o con cuenta. Los roles del Admin no intervienen: el lienzo del Admin conserva el plomo (D3). El `superadmin` ve el fondo nuevo de la tienda en la vista previa de Temas.

Aplicaciones afectadas (D3):

- **Storefront**: el diálogo, el carrito y el checkout, y el lienzo de todas las páginas, que pasa a leer un token propio del lienzo de la tienda.
- **BFF**: calcula ese token en el mapa de cada tema y mide su contraste.
- **Admin**: solo la vista previa de Temas, que muestra el lienzo de la tienda, y su copia de las reglas de los temas. Su propio lienzo no cambia.

El contrato del BFF solo crece: `tokens` tiene una clave más, sin cambios incompatibles.

## Alcance

**Incluye:**

- El diálogo al agregar al carrito con dos opciones, «Seguir comprando» y «Ver carrito», y «Ver carrito» como botón principal.
- Los textos del botón del carrito que lleva al checkout («Confirmar pedido»), del botón del checkout que crea el pedido («Finalizar compra») y del título de la página del checkout, en pantalla y en el navegador («Finalizar compra») (D1). La ruta `/checkout` no cambia.
- Un fondo de la tienda más claro, con el tono intermedio entre el plomo actual y el blanco como valor por defecto en los temas predefinidos A, B y C (D2). Se aplica con un token propio del lienzo de la tienda: el «fondo principal» de los temas no cambia y el Admin conserva el plomo (D3). Se conserva la separación visual de tarjetas, campos y buscador, y el contraste AA.
- El token del lienzo de la tienda en el mapa de cada tema, con sus pares de contraste, y la vista previa de Admin → Temas pintada con él (D3).
- Capturas comparadas del tono intermedio y del blanco (`#FFFFFF`), con A, B y C, para que Daniel elija el valor final antes de cerrar la feature (D2).
- Los datos del checkout (datos del cliente, entrega y método de pago) en un solo panel con el mismo aspecto que el resumen del pedido, separados por su línea (D4).
- Campos del checkout con contorno, sin relleno, que al enfocarse resaltan el borde exterior con una transición corta. Solo en el checkout (D5).
- Accesibilidad de lo que cambia (STD-11) y capturas antes y después con los tres temas (STD-12).
- Actualizar lo que describe el comportamiento que cambia: el Escenario 01 de US04, la fila «Confirmación al agregar al carrito» de la [trazabilidad](../../../planning/TRACEABILITY.md), el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md) (lienzo, tablas de contraste y checkout) y las filas «Textos del carrito y del checkout» y «Fondo de la tienda» de las [decisiones pendientes](../../../planning/PENDING-DECISIONS.md).

**Excluye:**

- Productos sugeridos de la misma categoría al agregar al carrito ([PBI-0039](../../../planning/backlog.md)): en la reunión se dejó para más adelante («puede ser para el backlog»).
- La aceptación de los términos y condiciones antes de comprar ([PBI-0040](../../../planning/backlog.md)). En la reunión no se dejó para después: Daniel dijo que son importantes como protección legal ante Indecopi. Queda fuera de esta feature porque necesita el texto legal revisado (decisión pendiente «Revisión legal final») y cambios en el BFF para registrar la aceptación con el pedido.
- Cambiar la ruta `/checkout` y los demás textos del camino de compra («Procesando…», «Volver al carrito», «Seguir comprando») (D1).
- Un checkout en varios pasos o un paso de pago separado (D1): el pago sigue simulado detrás de `CheckoutGateway` y la pasarela es una decisión pendiente ([PBI-0002](../../../planning/backlog.md)); pedidos y pagos tienen prioridad baja.
- Cambios en las validaciones, los datos que pide el checkout, la cotización del envío o la creación del pedido.
- Los campos con contorno en los formularios de la tienda fuera del checkout (ingresar, registro, verificar, recuperar, perfil, detalle del pedido y libro de reclamaciones): quedan como hoy y se anotan en el backlog como [PBI-0047](../../../planning/backlog.md) (D5).
- Los temas propios ya guardados: conservan sus cinco colores (ver casos límite).
- El lienzo del Admin y el «fondo principal» (`colors.background` y `--ws-bg`) de los temas predefinidos: no cambian (D3).
- En el Admin, todo lo que no sea la vista previa de Temas (D3).
- Un sexto color editable, «fondo de la tienda», en el formulario de Temas (D3, alternativa D descartada).
- La página «Gracias por tu compra» y su «Seguir comprando».

## Requisitos

| ID | Requisito | Origen | Prioridad |
|---|---|---|---|
| REQ-01 | Al agregar un producto al carrito, el diálogo de confirmación ofrece solo «Seguir comprando» y «Ver carrito»; «Ver carrito» es el botón principal y ya no hay «Finalizar compra» | PBI-0035; Daniel, reunión | Alta |
| REQ-02 | «Seguir comprando» cierra el diálogo y deja al comprador donde estaba; «Ver carrito» lo lleva a `/carrito`. Igual desde la tarjeta de producto y desde la ficha | PBI-0035; comportamiento actual | Alta |
| REQ-03 | El botón del carrito que lleva al checkout dice «Confirmar pedido» y el botón del checkout que crea el pedido dice «Finalizar compra». El título de la página del checkout también pasa de «Checkout» a «Finalizar compra», en el encabezado y en el título del navegador («WebStore | Finalizar compra»). La ruta `/checkout` y los demás textos no cambian | PBI-0036; Daniel y Walther, reunión; D1 | Media |
| REQ-04 | «Finalizar compra» solo nombra el paso que crea el pedido y paga; no aparece en el diálogo ni en el carrito | PBI-0036 | Media |
| REQ-05 | El lienzo de la tienda, con los temas predefinidos, pasa por defecto a un tono intermedio entre el plomo actual y el blanco: A `#FAFAFB`, B `#F9FAFC` y C `#F9F9FA` (D2). El valor final lo elige Daniel con la comparación de REQ-13 | PBI-0037; Daniel, reunión; D2 | Alta |
| REQ-06 | Con el fondo nuevo, las tarjetas, los paneles, los campos y el buscador de la cabecera siguen distinguiéndose del fondo y de la cabecera | **Propuesto**: el buscador usa hoy el color del lienzo como relleno | Alta |
| REQ-07 | Los pares de contraste sobre el lienzo de la tienda (texto, texto secundario, enlace y foco) se miden con el token nuevo y cumplen AA en A, B y C, y el sistema visual publica los valores nuevos | [STD-11](../../../architecture/standards.md); feature [002](../002-temas-configurables/specification.md) | Alta |
| REQ-08 | En el checkout, los datos del cliente, la entrega y el método de pago están en un solo panel con el aspecto del resumen del pedido (superficie, borde, radio de 14 px y su relleno), y los pasos siguen separados por su línea (D4) | PBI-0038; Daniel, reunión; D4 | Alta |
| REQ-09 | Los campos del checkout tienen contorno y no relleno; al enfocarlos se resalta el borde exterior en el color de foco del tema, con una transición corta que no hace esperar. Los demás formularios de la tienda no cambian (D5) | PBI-0038; Daniel, reunión; D5 | Alta |
| REQ-10 | Los campos del checkout conservan su etiqueta asociada, sus mensajes de error y el foco visible; con `prefers-reduced-motion` no hay transición | [STD-11](../../../architecture/standards.md) | Alta |
| REQ-11 | El flujo de compra no cambia: los mismos datos, validaciones, cotización del envío, estados del botón («Procesando…», deshabilitado sin envío cotizado) y creación del pedido | **Propuesto**: pedidos y pagos tienen prioridad baja; solo se piden cambios de texto y de aspecto | Alta |
| REQ-12 | Fuera de lo pedido, la tienda conserva su diseño con los tres temas | [STD-12](../../../architecture/standards.md) | Alta |
| REQ-13 | La implementación entrega capturas comparadas del lienzo de la tienda con el tono intermedio y con el blanco (`#FFFFFF`), con A, B y C, en escritorio y móvil. Daniel elige con ellas el valor final antes de cerrar la feature, y ese valor es el que queda en los temas predefinidos | PBI-0037; tarea asignada en la reunión («compara una opción más clara con el blanco»); D2 | Alta |
| REQ-14 | El lienzo de la tienda sale de un token propio del mapa del tema, que calcula el BFF: en A, B y C toma el valor de REQ-05. En todo tema propio es igual a su «fondo principal», también si comparte la base de un predefinido (el token no forma parte de la escala neutra heredada), así que ningún tema propio cambia | Daniel, reunión (el plomo «funciona» en el dashboard); D3 | Alta |
| REQ-15 | El lienzo del Admin conserva el «fondo principal» del tema (el plomo en A, B y C); la vista previa de Admin → Temas, que es una tienda en miniatura, muestra el lienzo de la tienda | Daniel, reunión; D3 | Alta |

## Criterios de aceptación

Ningún AC sale de una historia de usuario como origen. AC-01 reemplaza el Escenario 01 de US04, que se actualiza con esta feature. El resto sale de PBI-0035 a PBI-0038 o de lo que dijo Daniel en la reunión; los que fijan una regla que no dijo nadie están marcados como **propuesto**.

### AC-01 — Diálogo al agregar al carrito

- Cubre: REQ-01
- Origen: PBI-0035; reemplaza US04, Escenario 01

**Dado** un producto con stock
**Cuando** el comprador lo agrega al carrito desde su tarjeta o desde su ficha
**Entonces** la tienda muestra la confirmación «Producto agregado» con solo dos botones, «Seguir comprando» y «Ver carrito», en ese orden; «Ver carrito» tiene el estilo de botón principal y no hay ningún botón «Finalizar compra».

### AC-02 — Opciones del diálogo

- Cubre: REQ-02
- Origen: PBI-0035; comportamiento actual

**Dado** el diálogo de confirmación abierto en la ficha de un producto
**Cuando** el comprador elige «Seguir comprando» o pulsa Escape
**Entonces** el diálogo se cierra, el comprador sigue en la misma página y el contador del carrito muestra el producto agregado.
**Y cuando** elige «Ver carrito», llega a `/carrito`, que muestra el producto con su cantidad.

### AC-03 — Botón del carrito

- Cubre: REQ-03, REQ-04
- Origen: PBI-0036; D1

**Dado** un carrito con productos
**Cuando** el comprador abre `/carrito`
**Entonces** el botón principal del resumen dice «Confirmar pedido» y lleva a `/checkout`; «Seguir comprando» sigue debajo, y la página no muestra «Continuar al checkout» ni «Finalizar compra».

### AC-04 — Botón del checkout

- Cubre: REQ-03, REQ-04, REQ-11
- Origen: PBI-0036; D1

**Dado** el checkout con los datos completos y el envío cotizado
**Cuando** el comprador mira el resumen del pedido
**Entonces** el botón que crea el pedido dice «Finalizar compra» y debajo sigue «Volver al carrito».
**Y cuando** lo pulsa, el botón muestra «Procesando…», se crea el pedido como hoy y el comprador llega a «Gracias por tu compra».
**Y dado** el envío sin cotizar, **entonces** el botón está deshabilitado, como hoy.

### AC-16 — Título del checkout

- Cubre: REQ-03
- Origen: Daniel, reunión; D1

**Dado** un carrito con productos
**Cuando** el comprador llega a `/checkout` desde «Confirmar pedido» del carrito o escribiendo la ruta
**Entonces** el encabezado principal (`h1`) de la página dice «Finalizar compra» y el título del navegador, «WebStore | Finalizar compra»; la ruta sigue siendo `/checkout`.
**Y** la página no muestra «Checkout» en su título.
**Y dado** el carrito vacío, **entonces** el título también es «Finalizar compra», sobre el estado vacío de hoy.

### AC-05 — Fondo más claro en la tienda

- Cubre: REQ-05, REQ-14
- Origen: PBI-0037; D2; D3

**Dado** el tema activo A, B o C
**Cuando** el comprador abre cualquier página de la tienda
**Entonces** el lienzo de la página tiene el fondo nuevo de la tienda para ese tema: por defecto, a mitad de camino entre el de hoy y el blanco, A `#FAFAFB` (antes `#F4F4F6`), B `#F9FAFC` (antes `#F3F5F8`) y C `#F9F9FA` (antes `#F2F3F5`), o el valor que elija Daniel con la comparación de AC-14. La tienda lo pinta desde el primer momento, sin parpadeo, como en la feature 002.
**Y** con el BFF sin responder, la tienda usa el fondo nuevo de B como respaldo (el token nuevo en `tokens.css`).
**Y dado** un tema propio activo, comparta o no la base de un predefinido, **entonces** el lienzo de la tienda es su «fondo principal», igual que hoy (D3).

### AC-15 — El Admin conserva el plomo

- Cubre: REQ-15
- Origen: Daniel, reunión; D3

**Dado** el tema activo A, B o C
**Cuando** un usuario del Admin abre el login, el Resumen o cualquier otra página
**Entonces** el lienzo del Admin es el «fondo principal» del tema, igual que hoy (`#F4F4F6`, `#F3F5F8` y `#F2F3F5`).
**Y cuando** el `superadmin` abre Admin → Temas, los temas A, B y C siguen mostrando su «fondo principal» de siempre, y la vista previa de cada tema (la tienda en miniatura) se pinta con el lienzo de la tienda de ese tema.

### AC-06 — Componentes distinguibles

- Cubre: REQ-06
- Origen: **propuesto**

**Dado** el fondo nuevo, con cada tema
**Cuando** el comprador ve el inicio, el catálogo, la ficha, el carrito y el checkout, en escritorio (1440 px) y en móvil (375 px)
**Entonces** las tarjetas, el resumen del pedido, el panel del checkout y los campos muestran su borde frente al fondo; la cabecera se separa del contenido; y el buscador de la cabecera, en reposo, sigue viéndose como un campo (relleno o borde distinto de la cabecera blanca).
**Y** esto se cumple también con el valor final que elija Daniel, sea el tono intermedio o el blanco (AC-14).

### AC-07 — Contraste

- Cubre: REQ-07
- Origen: STD-11; feature 002

**Dado** el token del lienzo de la tienda de A, B y C
**Cuando** se miden con la fórmula de WCAG 2.1 el texto, el texto secundario, el enlace y el foco sobre ese token
**Entonces** todos alcanzan su mínimo (4.5:1 el texto y 3:1 el foco), y el sistema visual publica los valores nuevos.
**Y dado** un tema propio, **entonces** esos pares valen lo mismo que los del «fondo principal», así que las reglas de guardado no cambian (**propuesto**: los pares nuevos solo avisan).

### AC-08 — Panel del checkout

- Cubre: REQ-08
- Origen: PBI-0038; D4

**Dado** un carrito con productos
**Cuando** el comprador abre `/checkout` en escritorio y en móvil
**Entonces** «1. Datos del cliente», «2. Entrega» y «3. Método de pago» aparecen dentro de un solo panel con el mismo aspecto que el resumen del pedido (superficie, borde, radio de 14 px y relleno de 28 px, 22 px en móvil), separados entre sí por su línea como hoy; el panel va al lado del resumen en escritorio y encima de él en móvil, y ningún paso queda directamente sobre el lienzo.
**Y** no hay un panel por paso ni espacio vertical añadido entre los pasos (D4).

### AC-09 — Campos con contorno

- Cubre: REQ-09, REQ-10
- Origen: PBI-0038; Daniel, reunión

**Dado** el checkout
**Cuando** el comprador ve los campos en reposo
**Entonces** cada campo tiene un contorno fino en el color de borde del tema y fondo de superficie, sin relleno gris ni línea inferior.
**Y cuando** enfoca un campo con el ratón o con Tab, el contorno se resalta (más grueso y en el color de foco del tema) y la etiqueta sube al borde, en una transición de 200 ms o menos (**propuesto** el límite; el criterio es el del equipo: «la rapidez va antes que el efecto»).
**Y dado** un campo inválido y tocado, **entonces** el contorno y el mensaje usan el color de error, como hoy.

### AC-10 — Movimiento reducido y teclado

- Cubre: REQ-10
- Origen: STD-11

**Dado** el navegador con `prefers-reduced-motion: reduce`
**Cuando** el comprador enfoca un campo del checkout
**Entonces** el contorno cambia sin transición.
**Y** recorrer el checkout con Tab pasa por los campos, el método de pago y los botones en el orden de hoy, con el foco visible.

### AC-11 — Compra completa

- Cubre: REQ-11
- Origen: **propuesto**

**Dado** un invitado con un producto en el carrito
**Cuando** va de la ficha al carrito con «Ver carrito», del carrito al checkout con el botón del carrito, completa sus datos, elige Miraflores y Yape / Plin, y pulsa el botón del checkout
**Entonces** se crea el pedido con el mismo total que hoy (producto más envío), el pedido aparece en «Mis pedidos» y el Admin lo recibe, como en el e2e de compra actual.

### AC-12 — Temas

- Cubre: REQ-05, REQ-08, REQ-09, REQ-12
- Origen: feature 002

**Dado** el tema activo A, B o C, o un tema elegido con la tuerca del modo demo
**Cuando** el comprador abre el carrito y el checkout
**Entonces** el botón principal del diálogo, el panel, los contornos y el foco de los campos usan los tokens del tema, sin colores fijos.

### AC-13 — Sin cambios fuera de lo pedido

- Cubre: REQ-12
- Origen: STD-12

**Dado** las capturas de la tienda antes de la feature, con los tres temas, en escritorio y móvil (inicio, catálogo, ficha, diálogo, carrito y checkout)
**Cuando** se comparan con las de después
**Entonces** solo cambian el color del lienzo (y del relleno del buscador, si hace falta para AC-06), los botones del diálogo, los textos de D1 (los dos botones y el título del checkout), el panel del checkout y el aspecto de sus campos. Los textos, el contenido y el resto del diseño no cambian, y no hay desborde horizontal ni errores de consola.
**Y dado** las capturas del Admin antes y después con A, B y C (login, Resumen y Temas, en escritorio y móvil), **entonces** solo cambia el fondo de la vista previa de Temas; el lienzo del Admin no cambia (D3).

### AC-14 — Comparación con el blanco

- Cubre: REQ-13
- Origen: PBI-0037; tarea asignada en la reunión; D2

**Dado** el lienzo de la tienda con el tono intermedio y el mismo lienzo con `#FFFFFF`
**Cuando** la implementación prepara la comparación, con A, B y C, en escritorio (1440 px) y en móvil (375 px), del inicio, el catálogo, la ficha, el carrito y el checkout
**Entonces** hay un par de capturas por pantalla, tema y ancho (tono intermedio y blanco, con la misma ruta y los mismos datos), presentadas juntas para que Daniel elija.
**Y** la feature no se cierra hasta que Daniel elige el valor final; ese valor queda registrado con su fecha en esta especificación, en la verificación y en el sistema visual, y es el que llevan los temas predefinidos.

**Valor final (2026-11-13):** Daniel eligió el **tono intermedio** (A `#FAFAFB`, B `#F9FAFC` y C `#F9F9FA`), con la hoja de comparación de ⚠ TASK-06. Lo comunicó Sebastián Avila en la sesión principal el 2026-11-13 («Daniel eligió el tono intermedio, continúa con el bloque 7»). Es el valor por defecto de D2, así que el código no cambia (⚠ TASK-07). Queda registrado también en la [verificación](verification.md); el sistema visual lo recoge TASK-09.

## Datos y contrato

Ningún dato nuevo se guarda en el navegador ni en el estado del BFF: el token se calcula al leer, como los demás. El checkout no cambia su contrato. El [contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md) solo crece: `tokens` de cada `Tema` y `theme.css` llevan una clave más.

| Campo u operación | Regla | Roles | Origen |
|---|---|---|---|
| Token del lienzo de la tienda (nombre en el plan, por ejemplo `--ws-store-bg`) en el mapa de cada tema (`TOKENS_DEL_TEMA` pasa de 30 a 31) | En A, B y C: por defecto, la mitad del camino hacia el blanco desde su «fondo principal», canal a canal y redondeado: A `#FAFAFB`, B `#F9FAFC` y C `#F9F9FA` (D2); valor final según AC-14. En un tema propio: igual a su «fondo principal», comparta o no la base de un predefinido; el token no entra en la escala neutra que se hereda (D3) | Comprador (lectura pública de `theme.css`); `superadmin` (Temas) | REQ-05, REQ-14 |
| Respaldo en `frontend/src/styles/tokens.css` | El token con el valor de B; coincide con el mapa de B del BFF (TEST-18 de la feature 002) | — | REQ-05 |
| `colors.background` y `--ws-bg` de los temas predefinidos | No cambian: siguen siendo el lienzo del Admin y la base de la herencia de la escala neutra | — | REQ-15 |
| Pares de contraste sobre el lienzo de la tienda (`PARES_DE_CONTRASTE`) | Se añaden texto, texto secundario, enlace y foco sobre el token; se miden y cumplen su mínimo en A, B y C | — | REQ-07 |
| Decisión de arquitectura | Un token nuevo en el mapa del tema amplía [ADR-0011](../../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md): se registra como ADR en la etapa `sdd-decide` | — | D3 |
| Temas propios guardados (`appearance.customThemes`) | No cambian sus colores | `superadmin` | Casos límite |
| `POST /bff/checkout/orders` | Sin cambios: el checkout envía lo mismo | Comprador | REQ-11 |

Términos: «Carrito», «Checkout», «Pedido», «Tema», «Tema predefinido» y «Tema propio», en el [glosario](../../../architecture/glosario.md). «Lienzo» es el fondo de la página: hoy `--ws-bg` (clase `canvas`; «fondo principal» en el tema) en las dos aplicaciones; con esta feature, la tienda pasa al token propio de su lienzo y el Admin sigue con `--ws-bg` (D3).

## Interfaz

Cambio visual **pedido** por Daniel en la reunión, solo en los elementos de la tabla. Se contrasta con el [sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md), que hoy describe la tienda como «estructura neutra sobre un lienzo plomo», y se toman capturas antes y después con A, B y C ([STD-12](../../../architecture/standards.md)).

| Pantalla o ruta | Cambio esperado | Cambio visual pedido |
|---|---|---|
| Diálogo «Producto agregado» (tarjeta y ficha) | Dos botones; «Ver carrito» principal (relleno), «Seguir comprando» secundario | Sí |
| Carrito (`/carrito`) | El botón principal del resumen pasa de «Continuar al checkout» a «Confirmar pedido» (D1) | Sí (solo el texto) |
| Checkout (`/checkout`) | El título pasa de «Checkout» a «Finalizar compra», en la página y en el navegador (D1); un solo panel para los tres pasos, con el aspecto del resumen (D4); campos con contorno solo aquí (D5); y el botón que crea el pedido pasa de «Confirmar pedido» a «Finalizar compra» (D1) | Sí |
| Lienzo de todas las páginas de la tienda | Fondo más claro: tono intermedio por defecto, valor final elegido por Daniel entre el tono intermedio y el blanco (D2, AC-14) | Sí |
| Buscador de la cabecera (escritorio y cajón móvil) | Solo si con el fondo nuevo deja de verse como campo (AC-06) | Sí, condicionado |
| Admin → Temas (vista previa) | La tienda en miniatura se pinta con el lienzo de la tienda de cada tema (D3) | Sí (solo el fondo de la vista previa) |
| Resto del Admin (login, Resumen y demás páginas) | Sin cambios: conserva el plomo, que según Daniel funciona en el dashboard (D3) | No |
| Resto de pantallas y componentes | Sin cambios | No |

## Integraciones

Ninguna. El pago sigue simulado ([PBI-0002](../../../planning/backlog.md)).

## Casos límite y fallos

| Caso | Comportamiento esperado | REQ/AC |
|---|---|---|
| Producto agregado desde la tarjeta del catálogo o del inicio | Mismo diálogo que desde la ficha (un solo componente) | REQ-01, AC-01 |
| Diálogo a 375 px | Los dos botones caben sin desborde; el principal se reconoce | REQ-01, AC-13 |
| Cerrar el diálogo con Escape o clic fuera | Equivale a «Seguir comprando» | REQ-02, AC-02 |
| Carrito vacío | El carrito y el checkout muestran su estado vacío de hoy, sin botones de compra | REQ-11 |
| Envío sin tarifa para el distrito o fallo al cotizar | Aviso de hoy dentro del panel; el botón del checkout sigue deshabilitado | REQ-11, AC-04 |
| Error del BFF al crear el pedido (por ejemplo, stock insuficiente) | Mensaje de hoy en el resumen; el botón vuelve a su texto | REQ-11 |
| Resumen del pedido fijo al hacer scroll en pantallas bajas | El botón del checkout sigue a la vista, como hoy | REQ-11 |
| Fondo casi igual a la superficie blanca, o igual si Daniel elige el blanco | Las tarjetas, los paneles y la cabecera se separan por su borde; el buscador conserva un relleno o un borde que lo distinga de la cabecera blanca, y si en las capturas deja de verse como campo se ajusta su relleno (AC-06) | REQ-06, AC-06, AC-14 |
| Fondo más claro que `surface-subtle` (`#F6F8FA` en B) | Las zonas que usan `subtle` (colecciones alternadas, fondo de las fotos) pasan a verse algo más oscuras que el lienzo; se revisa en las capturas | REQ-12, AC-13 |
| Tema propio que copió la base de un predefinido (fondo, superficie y contraste) | No cambia: el «fondo principal» de los predefinidos sigue igual, así que sigue heredando la escala neutra, y su lienzo de la tienda es su propio fondo (el plomo de la base). Con ese tema activo, la tienda se ve más oscura que con su predefinido; para aclararla, el `superadmin` cambia el fondo del tema (D3) | REQ-12, REQ-14 |
| Tema propio creado desde el formulario (parte de los colores del tema activo, con el plomo como fondo) | Igual que la fila anterior: su tienda usa ese plomo salvo que el `superadmin` cambie el fondo | REQ-14 |
| Tema propio activo | La tienda y el Admin se ven igual que hoy: el lienzo de la tienda es su «fondo principal» | REQ-14, AC-05 |
| Tema propio oscuro (el guardado lo permite si cumple el contraste bloqueante) | Su lienzo de la tienda es su fondo, así que el contraste es el mismo que ya se midió al guardarlo | REQ-07, REQ-14 |
| Vista previa del modo demo con otro tema | Muestra el fondo nuevo de la tienda para ese tema predefinido | AC-12 |
| `theme.css` en caché con el fondo anterior | Se revalida en cada carga (`no-cache` y `ETag`), así que el fondo nuevo aparece al publicar la versión | AC-05 |

## Hechos, supuestos y decisiones pendientes

**Hechos** (verificables en el repositorio):

- El diálogo es un solo componente, [`agregar-al-carrito.dialog.ts`](../../../../frontend/src/app/features/vitrina/presentation/agregar-al-carrito.dialog.ts), que abren la tarjeta de producto y la ficha. Tiene «Seguir comprando» (cierra), «Ver carrito» (`mat-button`, a `/carrito`) y «Finalizar compra» (`mat-flat-button`, el principal, a `/checkout`).
- El carrito ([`carrito.page.ts`](../../../../frontend/src/app/features/carrito/presentation/carrito.page.ts)) tiene en el resumen «Continuar al checkout» (principal) y «Seguir comprando».
- El checkout ([`checkout.page.ts`](../../../../frontend/src/app/features/checkout/presentation/checkout.page.ts)) es una sola página: «1. Datos del cliente», «2. Entrega» y «3. Método de pago» van sobre el lienzo, separados por una línea (`ws-checkout-step`), y el resumen del pedido va en una tarjeta blanca (`ws-order-summary`) con «Confirmar pedido» («Procesando…» al enviar) y «Volver al carrito». El título es «Checkout»; encima tiene la etiqueta «Finalizar compra» (`ws-eyebrow`), oculta con `display: none` desde que se quitaron las etiquetas sobre los títulos. Con el título nuevo (D1) esa etiqueta repite el texto: si se deja o se quita lo decide el plan.
- La ruta del checkout tiene el título del navegador «WebStore | Checkout» ([`app.routes.ts`](../../../../frontend/src/app/app.routes.ts)), y el e2e [`storefront-navegacion.spec.ts`](../../../../frontend/tests/e2e/storefront-navegacion.spec.ts) comprueba ese título y el encabezado «Checkout», como `storefront-checkout.spec.ts`.
- No hay un paso de pago separado: el método de pago se elige en el mismo checkout y el pago se simula («Tienda de demostración: el pago se simula y no se realiza ningún cobro»).
- Los diez campos del checkout usan la apariencia por defecto de `mat-form-field` (rellena, con línea inferior). El catálogo ya usa `appearance="outline"` en sus filtros. Otros formularios de la tienda (cuenta, reclamaciones, detalle del pedido) usan la apariencia por defecto.
- El lienzo es `--ws-bg` (clase `canvas`), uno de los cinco colores del tema («fondo principal»): `#F4F4F6` en A, `#F3F5F8` en B y `#F2F3F5` en C ([`temas-predefinidos.mjs`](../../../../backend/src/domain/temas/temas-predefinidos.mjs) y [`tokens.css`](../../../../frontend/src/styles/tokens.css)).
- `tokens.css` lo importan la tienda y el Admin, y el Admin también pinta su lienzo con `--ws-bg` (su `styles.css` y el login): cambiar el «fondo principal» de un predefinido cambia las dos aplicaciones.
- La vista previa de Admin → Temas ([`vista-previa-tema.component.ts`](../../../../frontend/projects/admin/src/app/features/temas/presentation/vista-previa-tema.component.ts)) es una tienda en miniatura (franja, cabecera «Mi tienda», tarjeta, botones) pintada sobre `bg-canvas` con los tokens del tema.
- El BFF calcula 30 tokens por tema (`TOKENS_DEL_TEMA`) y mide 15 pares de contraste (`PARES_DE_CONTRASTE`); solo los dos pares sobre el fondo principal y el secundario bloquean el guardado de un tema propio. Un tema propio oscuro se puede guardar si cumple esos pares.
- El buscador de la cabecera (escritorio y cajón móvil) usa `bg-canvas` como relleno sobre la cabecera blanca ([`app.layout.ts`](../../../../frontend/src/app/layout/app.layout.ts)).
- Un tema propio hereda la escala neutra de un predefinido cuando su fondo, su superficie y su contraste coinciden con los de ese predefinido (sistema visual, «Base neutra»).
- Dependen de los textos actuales los e2e [`storefront-carrito.spec.ts`](../../../../frontend/tests/e2e/storefront-carrito.spec.ts), [`storefront-checkout.spec.ts`](../../../../frontend/tests/e2e/storefront-checkout.spec.ts) y [`storefront-modo-demo.spec.ts`](../../../../frontend/tests/e2e/storefront-modo-demo.spec.ts); del fondo de B, [`storefront-temas.spec.ts`](../../../../frontend/tests/e2e/storefront-temas.spec.ts), [`admin-temas.spec.ts`](../../../../frontend/tests/e2e/admin-temas.spec.ts) y pruebas del BFF (`temas-predefinidos.test.mjs`, `normalizar-estado.test.mjs`, `migracion-temas.test.mjs` y el smoke del contrato).
- US04, Escenario 01, la [trazabilidad](../../../planning/TRACEABILITY.md) y [`SOURCE-COMPLIANCE.md`](../../../../frontend/docs/SOURCE-COMPLIANCE.md) (revisión del 2026-11-05) describen el diálogo con tres opciones.
- El sistema visual fija el criterio de movimiento del equipo: «la rapidez va antes que el efecto», y en el camino de compra las animaciones no deben hacer esperar.

**Supuestos** (se asumen hasta que se confirmen):

- «Ver carrito» como principal significa el estilo de botón relleno (`mat-flat-button`) que hoy tiene «Finalizar compra», con «Seguir comprando» como botón de texto.
- «Campos limpios que resalten solo el borde exterior» es la apariencia con contorno de Material (`outline`), la que ya usa el catálogo, con los tokens del tema.
- `SOURCE-COMPLIANCE.md` es un registro fechado de la revisión del 2026-11-05: se le añade una nota en lugar de reescribirlo.
- PBI-0039 queda fuera porque en la reunión se dejó para más adelante. PBI-0040 queda fuera por sus dependencias (texto legal revisado y cambios en el BFF), no por un acuerdo de la reunión. Sebastián puede cambiar las dos cosas.

**Decisiones pendientes** (bloquean el trabajo que dependa de ellas):

- Texto exacto de cada botón ([decisiones pendientes](../../../planning/PENDING-DECISIONS.md), «Textos del carrito y del checkout»): resuelta en el hito (D1); la fila de las decisiones pendientes se cierra con la feature.
- Fondo blanco o tono más claro ([decisiones pendientes](../../../planning/PENDING-DECISIONS.md), «Fondo de la tienda»): el tono intermedio es el valor por defecto (D2); el valor final lo elige Daniel con la comparación de AC-14 antes de cerrar la feature. La fila de las decisiones pendientes se cierra entonces. **Resuelta el 2026-11-13:** Daniel eligió el tono intermedio ([AC-14](#ac-14--comparación-con-el-blanco)); la fila «Fondo de la tienda» la cierra TASK-09.
- Cómo se aplica el fondo nuevo y si alcanza al Admin: resuelta en el hito (D3). Necesita un ADR que amplíe ADR-0011, que se escribe en la etapa `sdd-decide`; no bloquea el plan.
- [PBI-0043](../../../planning/backlog.md) (modelo de datos de Daniel): no bloquea, porque la feature no cambia datos de negocio.

## Preguntas abiertas

Ninguna. Las cinco preguntas del hito están resueltas en [Decisiones del hito de alcance](#decisiones-del-hito-de-alcance) (D1 a D5).

1. **P1 — Textos de los botones.** Resuelta: D1.
2. **P2 — Fondo.** Resuelta: D2.
3. **P3 — Alcance del fondo.** Resuelta: D3 (reabierta y vuelta a responder el 2026-11-12).
4. **P4 — Panel del checkout.** Resuelta: D4.
5. **P5 — Campos con contorno.** Resuelta: D5.

## Decisiones del hito de alcance

Las preguntas se presentaron de una en una el 2026-11-12, con sus alternativas y la recomendación. Sebastián Avila respondió en la sesión principal; la respuesta a P3 reabierta la dio también en la sesión de la especificación. Eligió la recomendada en las cinco.

| ID | Pregunta | Decisión | Alternativas descartadas |
|---|---|---|---|
| D1 | ¿Qué textos llevan los botones del carrito y del checkout? (P1) | Alternativa A, la recomendada, elegida por Sebastián Avila el 2026-11-12: el botón del carrito que lleva al checkout pasa a «Confirmar pedido» y el botón del checkout que crea el pedido, a «Finalizar compra». Los demás textos («Procesando…», «Volver al carrito», «Seguir comprando») y la ruta `/checkout` no cambian, y el checkout sigue siendo una sola página. **Ajustada el 2026-11-12 por pedido de Sebastián Avila, adoptando en parte la alternativa B:** el título de la página del checkout también pasa de «Checkout» a «Finalizar compra», en el encabezado y en el título del navegador (AC-16). Motivo, de la reunión: viendo otra tienda, Daniel dijo «Proceder al checkout… así lo usan en gringo. Pero acá estamos en Latinoamérica», y «la compra finaliza cuando pagas», que es este paso | B (cambiar también el título del checkout) se descartó al principio y se adoptó después, por el ajuste del 2026-11-12; C: dividir el checkout en dos pasos, datos con «Confirmar pedido» y pago con «Finalizar compra» (reorganiza el checkout con pedidos y pagos en prioridad baja y la pasarela pendiente, PBI-0002); D: «Pagar» en el checkout (promete un cobro que en la demo no ocurre, y con transferencia no se paga al pulsar) |
| D2 | ¿El fondo pasa a blanco o a un tono más claro? (P2) | Alternativa A, la recomendada, elegida por Sebastián Avila el 2026-11-12: un tono intermedio como valor por defecto, a mitad de camino entre el fondo actual y el blanco en cada tema predefinido: A `#FAFAFB`, B `#F9FAFC` y C `#F9F9FA`. Con estos valores el contraste sobre el fondo mejora y cumple AA (texto secundario: A 6.30 → 6.64, B 5.85 → 6.11 y C 6.16 → 6.50; texto de B 16.35 → 17.09). Ampliada el 2026-11-12 a pedido de Sebastián Avila, para cumplir la tarea de la reunión («compara una opción más clara con el blanco»): **el valor final lo confirma Daniel** con capturas comparadas del tono intermedio y del blanco, con A, B y C, antes de cerrar la feature (REQ-13, AC-14). **Valor final, 2026-11-13:** Daniel eligió el tono intermedio con la comparación de ⚠ TASK-06, comunicado por Sebastián Avila en la sesión principal; los valores de esta decisión quedan como definitivos ([AC-14](#ac-14--comparación-con-el-blanco)) | B: blanco `#FFFFFF` como valor por defecto (el fondo queda igual que las tarjetas y la cabecera, el buscador pierde su relleno y Daniel no lo quería «100 % blanco»; sigue en la comparación); C: no fijar valor por defecto hasta la comparación (obliga a planificar dos caminos) |
| D3 | ¿El fondo nuevo es el de los temas, para la tienda y el Admin, o solo para la tienda? (P3) | Alternativa B, la recomendada, elegida por Sebastián Avila el 2026-11-12: un token propio del lienzo de la tienda en el mapa de cada tema, calculado por el BFF (en A, B y C, el valor de D2; en todo tema propio, su «fondo principal», así que los temas propios no cambian). El «fondo principal» de los temas no cambia, así que el Admin conserva el plomo; la vista previa de Temas se pinta con el token; se añaden los pares de contraste sobre él; y el token se registra en un ADR que amplía ADR-0011, en la etapa `sdd-decide`. Historia: el mismo día se había elegido A, y Sebastián la reabrió porque contradecía la reunión. Sobre el plomo, Daniel dijo «Eso funciona, ¿sabes dónde? En el dashboard» y que el problema «no tiene nada que ver con ser limpio» | A: cambiar el «fondo principal» de los temas (el Admin pierde el plomo que Daniel aprobó); C: aclarar el fondo con CSS solo en la tienda (aclara también los temas propios, puede bajar de AA en un tema propio oscuro sin medirse y la vista previa deja de ser fiel); D: un sexto color editable, «fondo de la tienda» (cambia el modelo de cinco colores, el formulario, el contrato de `colors` y los datos guardados; desproporcionado para esta feature); pintar el lienzo del Admin con `subtle` (no conserva el plomo exacto y deja de mostrar el fondo de los temas propios) |
| D4 | ¿Un solo panel con los tres pasos del checkout o un panel por paso? (P4) | Alternativa A, la recomendada, elegida por Sebastián Avila el 2026-11-12: un solo panel con los tres pasos, con el mismo aspecto que el resumen del pedido (superficie, borde, radio de 14 px y relleno de 28 px, 22 px en móvil), y los pasos separados por su línea dentro del panel | B: un panel por paso (alarga el checkout con tres rellenos y dos huecos más, sobre todo en móvil, y se aparta del criterio de «comprar rápido» sin que se pidiera) |
| D5 | ¿Los campos con contorno van solo en el checkout o en toda la tienda? (P5) | Alternativa A, la recomendada, elegida por Sebastián Avila el 2026-11-12: solo en los diez campos del checkout. Los demás formularios de la tienda (ingresar, registro, verificar, recuperar, perfil, detalle del pedido y libro de reclamaciones) quedan como hoy, con la apariencia por defecto, y se anotan en el backlog como mejora propuesta ([PBI-0047](../../../planning/backlog.md)) | B: todos los formularios de la tienda con la apariencia con contorno por defecto (cambia unas siete páginas que no se pidieron y multiplica las capturas que comparar con A, B y C) |

## Referencias

- [Backlog: PBI-0035 a PBI-0040 y PBI-0047](../../../planning/backlog.md)
- [US04 — Agregar un producto al carrito](../../../planning/user-stories/ep-02-comprar/us-04-agregar-al-carrito/us-04-agregar-al-carrito.md) y [US06 — Comprar como invitado](../../../planning/user-stories/ep-02-comprar/us-06-comprar-como-invitado/us-06-comprar-como-invitado.md)
- [Feature 002: Temas configurables](../002-temas-configurables/specification.md)
- [ADR-0011: Guardar los temas como recurso propio del BFF](../../../adrs/0011-guardar-los-temas-como-recurso-propio-del-bff.md)
- [Decisiones pendientes](../../../planning/PENDING-DECISIONS.md)
- [Sistema visual](../../../../frontend/docs/VISUAL-SYSTEM.md)
- [Contrato del BFF](../../../../backend/docs/BFF-CONTRACT.md)
- [Estándares](../../../architecture/standards.md)
- [Glosario](../../../architecture/glosario.md)
- [Trazabilidad](../../../planning/TRACEABILITY.md)
