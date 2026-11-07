# Validación del entregable

Fecha de cierre: **2026-11-05**.

## Resultado

La implementación cubre los acuerdos finales aplicables a WebStore consolidados de `nota-1.txt` a `nota-8.txt`. Las decisiones que las fuentes dejaron abiertas continúan identificadas —sin inventar una definición— en `PENDING-DECISIONS.md`.

## Compilación y tipos

- `npm run build:all` → **OK**.
  - Storefront: 399,52 kB iniciales / 105,52 kB estimados transferidos.
  - Admin: 357,81 kB iniciales / 95,49 kB estimados transferidos.
- `npm run typecheck:storefront` → **OK**.
- `npm run typecheck:admin` → **OK**.
- Ambos bundles permanecen dentro de los presupuestos configurados.

## Contrato y reglas de negocio

`npm run validate:contract` → **OK**, incluido el cálculo comprobado de 15 días hábiles para el plazo interno de atención del Libro de Reclamaciones.

La validación incluye:

1. separación Storefront/Admin y adapters HTTP;
2. catálogo, inventario, checkout, clientes y pedidos compartidos;
3. registro, código temporal, sesión, recuperación y revocación de cuentas;
4. autenticación administrativa y roles fijos `superadmin`/`admin`/`vendedor` en el BFF (colecciones visibles por rol, `403` por colección, rol inválido `400`, último superadministrador `409`);
5. restricciones del vendedor: sin crear ni eliminar productos y sin cambiar precio;
6. reclamo persistente y recepción administrativa;
7. CMS, logo, navegación, toggles y contenido legal;
8. campañas y tarifas de envío compartidas.

El smoke test usa un puerto y archivo temporal aislados; no modifica `backend/data.json`.

## Pruebas adicionales

- `npm run check:syntax` → **OK**.
- `npm test` → **11/11 OK**: árbol de categorías (orden, jerarquía, ciclos), tarifas para varios distritos, ajuste porcentual, búsqueda sin tildes, orden natural y paginación de tarifas, y migración de `data.json` con roles anteriores.
- `npm run format:check` → **OK** (Prettier).
- `node tools/qa/cdp-interaction-qa.mjs` → **OK**: hero, pausa, tabs, mega-menú, drawer móvil, filtros, foco, Escape y backdrop.
- `node tools/qa/cdp-admin-qa.mjs` → **OK** (06/11): Superadministrador con Reclamaciones; Vendedor solo ve Resumen, Productos, Inventario y Pedidos, y al abrir `/usuarios` vuelve al inicio.
- `node tools/qa/cdp-console-qa.mjs` → **OK**: Storefront y Admin renderizados sin excepciones, errores ni advertencias de consola.
- Detector DOM de Impeccable sobre Home y acceso Admin finales → **0 hallazgos**.
- `npm audit --audit-level=moderate` → **0 vulnerabilidades**.

## Revisión completa del 06/11

Pasada sobre una copia de los datos (`WEBSTORE_DATA_FILE`), sin tocar `backend/data.json`:

- Tienda: 19 páginas (inicio, inicio anterior, catálogo con filtro y búsqueda, dos fichas, carrito, checkout, pedidos, cuenta, páginas informativas, libro de reclamaciones y 404) en 1440 y 390 px → **sin errores ni advertencias de consola y sin desborde horizontal**. `cdp-visual-qa` en 6 anchos (1440 a 360 px) sobre 20 rutas → sin desborde.
- Admin: las 12 pantallas como Superadministrador en 1440 y 390 px → **sin errores ni advertencias y sin desborde**; como Vendedor, categoría, marca y "Activo" del producto quedan deshabilitados.
- `cdp-console-qa` e `cdp-interaction-qa` → OK (hero, transición, pestañas, mega-menú, menú móvil y filtros).

Se corrigió en esta pasada: desborde de 11–25 px en celular en Productos, Clientes y Tarifas del Admin (columna de la rejilla sin límite y un texto para lectores de pantalla fuera de su tarjeta), aviso de Angular por `[disabled]` con formularios reactivos en Productos, proporción declarada de la foto en la ficha de producto (800 × 600, 4:3) y miniaturas de la galería, que ahora usan la foto de 480 px.

## Responsive y revisión visual

Chrome renderizó el Home a 1440, 1280, 1024, 768, 390 y 360 px. En las seis medidas:

- `scrollWidth === clientWidth`;
- shell y contenido renderizados;
- precio y jerarquía comercial visibles;
- sin overflow horizontal.

También se revisaron visualmente registro, libro de reclamaciones, acceso administrativo y Dashboard autenticado en escritorio/móvil. La evidencia está en `output/visual-qa/compliance-final/`.

## Sistema visual y rendimiento perceptual

- Paleta B azul cobalto con acento naranja quemado y lienzo plomo; todos los pares de texto cumplen AA (ver `VISUAL-SYSTEM.md`).
- Una sola familia local, Source Sans 3 Variable, en Storefront y Admin.
- Miniaturas específicas de 480 px (9–33 KB) para cards, accesos y carrito; originales reservados al detalle.
- Carga diferida en imágenes no críticas y prioridad exclusiva para el LCP.
- Movimiento discreto y desactivable mediante `prefers-reduced-motion`.

## Límite honesto del 100 %

El 100 % se refiere a los **acuerdos cerrados del alcance WebStore demostrable**. No convierte en decisiones cerradas la pasarela definitiva, facturación electrónica, correo transaccional, despliegue multi-tenant/on-premise, SSR productivo ni otros puntos que las sesiones dejaron pendientes. El BFF cuenta lunes a viernes y permite configurar feriados/días no laborables con `WEBSTORE_NON_WORKING_DATES`; el calendario requiere mantenimiento operativo antes de producción. El envío de respuestas del Libro de Reclamaciones y la validación jurídica de textos/plazos todavía requieren canal y revisión humanos. Tampoco sustituye una auditoría legal o un pentest.

## Pasada del 05/11 (paleta B, roles fijos, arquitectura limpia)

- `npm run build:all` → **OK**, sin advertencias.
- `npm run validate:contract` → **OK** (estructura, 9 pruebas unitarias y smoke del BFF).
- Navegador, Admin: el vendedor ve Resumen, Productos, Inventario y Pedidos; `/usuarios` lo devuelve al Resumen; en Productos no ve "Nuevo producto". El superadministrador ve los 12 módulos, los tres roles con su cantidad de usuarios, las tarifas con el formulario masivo y la vista de pedidos.
- Navegador, tienda: inicio a 1024 px y 375 px; catálogo, carrito y checkout a 375 px sin desborde horizontal; fuente Source Sans 3 aplicada.
- Compra completa como invitado sobre una copia de `data.json` (no se tocó el archivo real): pedido confirmado, detalle con token de invitado, cancelación con estado "Cancelado".
- Consola del Admin en pestaña nueva: sin errores.
