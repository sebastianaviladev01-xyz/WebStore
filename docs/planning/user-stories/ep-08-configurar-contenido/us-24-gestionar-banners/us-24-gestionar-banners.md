# US24 — Gestionar banners

- Épica: [EP08 — Configurar el contenido](../ep-08-configurar-contenido.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: banners); [TRACEABILITY](../../../TRACEABILITY.md) («Banners con vigencia», «Máximo de tres banners hero»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: banners con fecha de inicio/fin)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** publicar banners con fecha de inicio y fin
- **Para** promocionar campañas durante un periodo

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Vigencia

- **Dado** que el administrador crea un banner con fecha de inicio y fin
- **Cuando** la tienda se abre
- **Entonces** el banner solo se muestra mientras está vigente.

### Escenario 02 – Máximo en el hero

- **Dado** que hay más de tres banners vigentes para el hero
- **Cuando** el comprador abre el inicio
- **Entonces** el hero muestra como máximo tres.

### Escenario 03 – Vigencia y enlaces

- **Dado** que el administrador registra un banner con fechas y un enlace
- **Cuando** lo guarda
- **Entonces** las fechas son días de Lima (desde el lote 24, fecha y hora de Lima: Escenario 06); un fin anterior al inicio se rechaza en el campo «Fin»; el tope de tres principales activos cuenta solo los que coinciden en fechas; y un enlace externo (`https://…`) lleva a esa dirección en otra pestaña (desde el lote 12, PBI-0174).

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0128; decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md): el 2026-11-18 Daniel pidió abrir los enlaces externos en otra pestaña, PBI-0174, sin cambios en el tope), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts` y `frontend/tests/e2e/storefront-banners.spec.ts`.

### Escenario 04 – Dos botones

- **Dado** que el administrador edita un banner
- **Cuando** completa el texto y el enlace de uno o de los dos botones
- **Entonces** el principal usa el color principal del tema y el secundario, el secundario; un botón a medias o con más de 40 caracteres se rechaza, y un enlace externo se abre en otra pestaña.

> Añadido el 2026-11-23 por el lote 12 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0184 y PBI-0174; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/admin-guardado-y-datos.spec.ts` y `storefront-banners.spec.ts`.

### Escenario 05 – Registro propio e imágenes como archivo

- **Dado** que el administrador crea o edita un banner
- **Cuando** pulsa «Agregar» o «Editar»
- **Entonces** el banner se registra en su propia interfaz; la imagen de escritorio y, opcional, la del celular se cargan como archivo, se ven las actuales y se pueden reemplazar. No hay campo para escribir una URL, y el BFF rechaza una URL nueva.

> Añadido el 2026-11-24 por el lote 21 y el 24 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0211 y PBI-0214; [ADR-0026](../../../../adrs/0026-guardar-las-imagenes-cargadas-en-el-bff-y-servirlas-por-direccion.md); decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: banners»), sin especificación propia: lo prueban `frontend/tests/e2e/admin-mantenimientos.spec.ts` y `admin-imagenes-y-banners.spec.ts`.

### Escenario 06 – Campos claros y vigencia con hora

- **Dado** que el administrador carga la imagen de un banner
- **Cuando** completa el formulario
- **Entonces** «Controles del carrusel sobre la foto» (antes, «Tono de la foto») se calcula con la esquina de la imagen donde van los controles y se puede corregir; «Cómo se ajusta la foto» (antes, «Presentación de imagen») y los botones («lo que dice» y «adónde lleva») tienen ayudas; y la vigencia lleva fecha y hora de Lima: el inicio cuenta desde el comienzo del minuto y el fin hasta su final.

> Añadido el 2026-11-24 por el lote 24 ([ADR-0025](../../../../adrs/0025-cerrar-por-lotes-lo-que-salio-de-la-revision-de-la-demo.md); PBI-0221; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Revisión de la demo: banners»), sin especificación propia: lo prueban `tono-de-foto.rules.spec.mjs`, `banner-vigencia.rules.test.mjs` y `frontend/tests/e2e/admin-imagenes-y-banners.spec.ts`.
