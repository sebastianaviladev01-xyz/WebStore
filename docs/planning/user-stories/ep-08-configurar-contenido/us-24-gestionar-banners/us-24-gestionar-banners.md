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
