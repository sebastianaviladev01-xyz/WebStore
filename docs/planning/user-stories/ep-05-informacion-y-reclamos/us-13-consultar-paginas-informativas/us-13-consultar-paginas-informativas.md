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

## Fuera de alcance y pendientes

- Los textos requieren revisión legal antes de publicarse a consumidores (PBI-0009 del [backlog](../../../backlog.md)).
