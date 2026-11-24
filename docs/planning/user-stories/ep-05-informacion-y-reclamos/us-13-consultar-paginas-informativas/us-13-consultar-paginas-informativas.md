# US13 — Consultar las páginas informativas

- Épica: [EP05 — Información y reclamos](../ep-05-informacion-y-reclamos.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Storefront: información legal/general); [TRACEABILITY](../../../TRACEABILITY.md) («Contacto/Envíos/Privacidad/Términos», «Contenido legal editable»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Storefront y Admin: páginas administrables con activación y desactivación efectiva)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** comprador
- **Quiero** leer las páginas de Contacto, Envíos, Privacidad y Términos
- **Para** conocer cómo opera la tienda y mis derechos

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Página activa

- **Dado** que el Admin activó una página informativa
- **Cuando** el comprador la abre
- **Entonces** ve el texto publicado desde el CMS.

### Escenario 02 – Página desactivada

- **Dado** que el Admin desactivó una página informativa
- **Cuando** el comprador intenta abrirla, también por URL directa
- **Entonces** la tienda no la muestra.

### Escenario 03 – Contacto, pie y versión de los términos

- **Dado** que el superadministrador configuró varios correos, teléfonos y redes, los accesos inferiores y una versión nueva de los términos
- **Cuando** el comprador abre Contacto, Términos o mira el pie
- **Entonces** ve todos los datos de contacto (las redes se abren en otra pestaña), el pie armado con los accesos inferiores y, bajo el título de Términos, «Versión N · publicada el DD/MM/AAAA».

> Añadido el 2026-11-23 por el lote 15 y el 20 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0169, PBI-0185 y PBI-0205; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-contenido.spec.ts`.

### Escenario 04 – Aviso de mantenimiento

- **Dado** que el contenido de la tienda nunca llegó del BFF
- **Cuando** el comprador abre la tienda
- **Entonces** ve un aviso de mantenimiento con «Reintentar» en lugar de la tienda; si el contenido ya había llegado, un fallo al recargarlo lo conserva.

> Añadido el 2026-11-23 por el lote 15 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0182; decisiones provisionales, por confirmar con Daniel, en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-contenido.spec.ts`.

## Fuera de alcance y pendientes

- Los textos requieren revisión legal antes de publicarse a consumidores (PBI-0009 del [backlog](../../../backlog.md)).
