# Alcance consolidado — WebStore

Este archivo representa el alcance WebStore resultante de las 8 fuentes, aplicando la decisión más reciente cuando una conversación evolucionó.

## Storefront

Home, catálogo, búsqueda/filtros por nombre/categoría/precio, detalle de producto, stock, carrito, IGV, checkout guest, cuenta opcional, verificación, recuperación, pedidos, modificación/cancelación dentro de 24 h, envíos configurables e información legal/general.

## Administración

Productos, inventario, categorías jerárquicas, marcas, clientes, usuarios/roles administrativos, pedidos, banners, CMS y tarifas de envío.

## Arquitectura

Dos aplicaciones Angular separadas que consumen una misma fuente de verdad mediante BFF. La demo incluye Mock BFF persistente para demostrar la integración antes del backend productivo.

## Fase posterior

SSR/SEO, integraciones reales de pago/facturación y decisiones de despliegue aún abiertas.
