# US23 — Configurar el contenido de la tienda

- Épica: [EP08 — Configurar el contenido](../ep-08-configurar-contenido.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: CMS); [TRACEABILITY](../../../TRACEABILITY.md) («Logo gráfico configurable», «Color principal configurable», «Contacto configurable», «Header/footer configurables», «Navegación superior configurable», «Navegación lateral configurable», «Tipografía única por defecto», «Contenido legal editable»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: CMS)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** administrador
- **Quiero** configurar el logo, el color, el contacto, la navegación, el pie de página y las páginas informativas
- **Para** adaptar la tienda sin cambiar el código

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Identidad

- **Dado** que el administrador está en Contenido
- **Cuando** carga un logo, o indica su URL, y cambia el color principal
- **Entonces** la tienda muestra el logo y el color nuevos.

### Escenario 02 – Navegación, contacto y pie

- **Dado** que el administrador está en Contenido
- **Cuando** cambia la navegación superior o lateral, el mensaje superior, el contacto o el pie de página
- **Entonces** la tienda los muestra en su cabecera, su menú lateral y su pie.

### Escenario 03 – Tipografía única

- **Dado** que el administrador está en Contenido
- **Cuando** revisa la tipografía
- **Entonces** la ve como un campo de solo lectura: el MVP usa una sola tipografía.

### Escenario 04 – Páginas informativas

- **Dado** que el administrador está en Contenido
- **Cuando** edita el texto de Contacto, Envíos, Privacidad o Términos, o activa o desactiva una de ellas
- **Entonces** la tienda publica el texto nuevo y respeta la activación.

### Escenario 05 – Guardado que falla

- **Dado** que el administrador editó el contenido y el guardado falla (por ejemplo, un logo demasiado pesado)
- **Cuando** mira el formulario
- **Entonces** lo escrito se conserva, el motivo sale junto a «Guardar configuración» y «Actualizar» no lo reescribe. El logo se reduce antes de guardarse.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0119 y PBI-0125), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

## Fuera de alcance y pendientes

- Está pendiente revisar si Contenido equivale a la configuración de OpenCart (PBI-0015 del [backlog](../../../backlog.md)).
- La paleta por defecto está pendiente de confirmar (PBI-0014 del [backlog](../../../backlog.md)).
