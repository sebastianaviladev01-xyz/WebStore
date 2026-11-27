# PRODUCT

> Inferido de las nueve fuentes del proyecto (nota-1 a nota-8 y la reunión del 05/11). No surge de una entrevista; conviene que el equipo lo revise.

## Qué es

WebStore es una tienda en línea estándar que Simplesoft ofrece a comercios peruanos de tecnología y electrohogar. Tiene dos aplicaciones separadas que comparten un BFF como única fuente de verdad:

- **Tienda (storefront)**: catálogo, carrito, checkout como invitado o con cuenta, pedidos modificables durante 24 horas, páginas legales y Libro de Reclamaciones.
- **Admin (backoffice)**: catálogo, inventario, pedidos, clientes, contenido (CMS), banners, tarifas de envío, reclamaciones y usuarios con roles fijos.

## Para quién

- **Comprador en Lima**: entra desde el celular o la computadora a buscar un televisor, una lavadora o un monitor. Quiere ver precio con IGV, stock real y costo de envío a su distrito antes de pagar, y poder comprar sin crear una cuenta.
- **Equipo de la tienda**:
  - el superadministrador configura la tienda y sus usuarios;
  - el administrador opera el día a día;
  - el vendedor mantiene fichas e inventario y despacha pedidos.

## Superficies y modo

| Superficie | Modo | Éxito |
|---|---|---|
| Inicio, catálogo, ficha | Persuade | El comprador encuentra el producto y lo agrega al carrito |
| Carrito, checkout, pedidos | Operate | Compra sin fricción y entiende costos y entrega |
| Páginas legales, reclamaciones | Read | Entiende sus derechos y deja constancia |
| Admin | Operate | El equipo actualiza stock, precios y pedidos sin errores |

## Acuerdos de marca

- Identidad propia: la referencia de LG solo sirve como patrón de tienda grande. No se copian su composición, marca, campañas ni recursos, para evitar problemas legales.
- Tres temas predefinidos desde el 2026-11-11: A violeta, B "Azul cobalto" con acento naranja quemado y lienzo plomo (activo al instalar) y C grafito y ámbar, el de Ecom. La reunión del 05/11 pidió paletas sin beige, verde ni morado; el violeta volvió con el tema A, que Daniel aceptó ([decisiones pendientes](PENDING-DECISIONS.md), «Confirmación de la paleta»).
- Una sola tipografía: Source Sans 3.
- Categorías sin íconos.
- Tono cercano y claro en español peruano; precios en soles con IGV incluido.

## Restricciones

- Primero una SPA funcional; SSR y SEO quedan para una fase posterior.
- Hasta tres banners en el hero.
- Envío calculado según distrito, desde la tienda más cercana.
- Pedidos modificables o cancelables durante 24 horas.
- Pendientes de decisión: pasarela de pago, facturación electrónica, correo transaccional, multi-tenant y revisión legal. El modelo de tarifas de envío (tabla origen → distrito) quedó cerrado en la reunión del 05/11. Ver `docs/planning/PENDING-DECISIONS.md`.
