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
- **Entonces** las fechas son días de Lima; un fin anterior al inicio se rechaza en el campo «Fin»; el tope de tres principales activos cuenta solo los que coinciden en fechas; y un enlace externo (`https://…`) lleva a esa dirección en otra pestaña (desde el lote 12, PBI-0174).

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0128; decisión provisional en [decisiones pendientes](../../../PENDING-DECISIONS.md): el 2026-11-18 Daniel pidió abrir los enlaces externos en otra pestaña, PBI-0174, sin cambios en el tope), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts` y `frontend/tests/e2e/storefront-banners.spec.ts`.

### Escenario 04 – Dos botones

- **Dado** que el administrador edita un banner
- **Cuando** completa el texto y el enlace de uno o de los dos botones
- **Entonces** el principal usa el color principal del tema y el secundario, el secundario; un botón a medias o con más de 40 caracteres se rechaza, y un enlace externo se abre en otra pestaña.

> Añadido el 2026-11-23 por el lote 12 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0184 y PBI-0174; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/admin-guardado-y-datos.spec.ts` y `storefront-banners.spec.ts`.
