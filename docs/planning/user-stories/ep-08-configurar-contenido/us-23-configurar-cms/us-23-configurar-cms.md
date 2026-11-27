# US23 — Configurar el contenido de la tienda

- Épica: [EP08 — Configurar el contenido](../ep-08-configurar-contenido.md)
- Índice: [Historias de usuario](../../user-stories.md)
- Fuentes: [SCOPE](../../../SCOPE.md) (Administración: CMS); [TRACEABILITY](../../../TRACEABILITY.md) («Logo gráfico configurable», «Color principal configurable», «Contacto configurable», «Header/footer configurables», «Navegación superior configurable», «Navegación lateral configurable», «Tipografía única por defecto», «Contenido legal editable»); [FUNCIONALIDAD](../../../FUNCIONALIDAD.md) (Admin: CMS)
- Implementación en la demo: la evidencia está en las filas citadas de la [trazabilidad](../../../TRACEABILITY.md)

## Descripción

- **Como** superadministrador (desde el lote 07, Contenido es configuración de la tienda: PBI-0013, confirmado por Daniel el 2026-11-18 en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Permisos de los roles»)
- **Quiero** configurar el logo, el contacto, la navegación, el pie de página y las páginas informativas (los colores, en Temas)
- **Para** adaptar la tienda sin cambiar el código

## Criterios de aceptación

Derivados de las fuentes citadas. Cada escenario se convierte en el `AC` del mismo número al especificar la feature ([relación con las historias](../../../../specs/README.md#relación-con-las-historias-de-usuario)).

### Escenario 01 – Identidad

- **Dado** que el superadministrador está en Contenido
- **Cuando** carga un logo, o indica su URL
- **Entonces** la tienda muestra el logo nuevo. Los colores ya no se cambian en Contenido sino en Temas, desde la feature 002 (temas A, B y C y temas propios).

> Corregido el 2026-11-27 por la auditoría de las reuniones: el escenario seguía diciendo que Contenido cambia el color principal. El logo es la única imagen que aún acepta URL; desde la revisión de la demo del 2026-11-17 las demás se cargan como archivo (PBI-0214), y cargar el logo como archivo queda registrado en PBI-0289.

### Escenario 02 – Navegación, contacto y pie

- **Dado** que el superadministrador está en Contenido
- **Cuando** cambia los avisos, la navegación lateral, el contacto o el pie de página (desde el lote 15, escenario 07)
- **Entonces** la tienda los muestra en su cabecera, su menú lateral y su pie.

### Escenario 03 – Tipografía única

- **Dado** que el superadministrador está en Contenido
- **Cuando** revisa la tipografía
- **Entonces** la ve como un campo de solo lectura: el MVP usa una sola tipografía.

### Escenario 04 – Páginas informativas

- **Dado** que el superadministrador está en Contenido
- **Cuando** edita el texto de Contacto, Envíos, Privacidad o Términos, o activa o desactiva una de ellas
- **Entonces** la tienda publica el texto nuevo y respeta la activación.

### Escenario 05 – Guardado que falla

- **Dado** que el administrador editó el contenido y el guardado falla (por ejemplo, un logo demasiado pesado)
- **Cuando** mira el formulario
- **Entonces** lo escrito se conserva, el motivo sale junto a «Guardar configuración» y los datos que llegan del BFF no lo reescriben (desde el lote 07 ya no hay «Actualizar» en la cabecera). El logo se reduce antes de guardarse.

> Añadido el 2026-11-14 por el lote 06 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0119 y PBI-0125), sin especificación propia: lo prueba `frontend/tests/e2e/admin-guardado-y-datos.spec.ts`.

## Fuera de alcance y pendientes

- Para la primera versión de la demo basta con lo que hay (Daniel, 2026-11-20); lo demás que tiene OpenCart se evaluará en el backlog funcional (PBI-0015, cerrada en el lote 18).
- La paleta quedó decidida el 2026-11-11: tres temas, A, B y C, con B activo al instalar ([decisiones pendientes](../../../PENDING-DECISIONS.md), «Confirmación de la paleta»; PBI-0014, cerrada).

### Escenario 06 – Aviso de la navegación superior

- **Dado** que el superadministrador escribe en «Navegación superior» un texto que la tienda no reconoce (por ejemplo, «Despachos») o que lleva a una página desactivada
- **Cuando** sale del campo o sigue escribiendo
- **Entonces** el campo avisa qué textos no se mostrarán y por qué, sin impedir guardar.

> Añadido el 2026-11-15 por el lote 07 ([ADR-0017](../../../../adrs/0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md); PBI-0153). Daniel confirmó el aviso el 2026-11-20 y aclaró que la navegación superior es para avisos generales a los clientes (PBI-0175). Lo prueba `admin-listados.spec.ts`. Los campos de Contenido no cambian (PBI-0141, «Alcance de Contenido del Admin»); el 2026-11-18 Daniel pidió varios correos, teléfonos y redes sociales (PBI-0169).

### Escenario 07 – Listas de contacto y avisos

- **Dado** que el superadministrador está en Contenido
- **Cuando** agrega hasta 5 correos, 5 teléfonos, 8 redes, 5 avisos con su enlace opcional o hasta 24 accesos inferiores
- **Entonces** el backoffice valida cada dato y la tienda los muestra en su pie, en Contacto y sobre la cabecera. Los avisos sustituyen a la antigua navegación superior y al mensaje superior.

> Añadido el 2026-11-23 por el lote 15 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0169, PBI-0175 y PBI-0185; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/admin-contenido.spec.ts` y `storefront-contenido.spec.ts`.

### Escenario 08 – Entregas y feriados

- **Dado** que el superadministrador abre «Entregas y feriados»
- **Cuando** agrega o quita días no laborables, elige la primera fecha de entrega o elige una dirección por pedido o por producto
- **Entonces** el BFF lo guarda y la tienda lo aplica en su siguiente carga: en el plazo de los reclamos, en la fecha mínima del checkout y en las direcciones del checkout.

> Añadido el 2026-11-23 por el lote 17 y el 19 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0183, PBI-0178 y PBI-0006; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/admin-entregas-y-feriados.spec.ts` y `admin-direcciones-por-producto.spec.ts`.

### Escenario 09 – Sugeridos y tema

- **Dado** que el superadministrador configura la tienda
- **Cuando** elige cómo se muestran los sugeridos al agregar al carrito o cambia el tema
- **Entonces** los sugeridos salen en el diálogo (por defecto) o en un panel lateral; el tema solo se cambia en el backoffice: el storefront no tiene tuerca.

> Añadido el 2026-11-23 por el lote 16 y el 14 ([ADR-0021](../../../../adrs/0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md); PBI-0179 y PBI-0188; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md)), sin especificación propia: lo prueban `frontend/tests/e2e/admin-contenido.spec.ts` y `storefront-modo-demo.spec.ts`.

### Escenario 10 – Avisos programados

- **Dado** que el superadministrador está en Contenido
- **Cuando** da a un aviso un «Desde», un «Hasta» o los dos, en hora de Lima
- **Entonces** el backoffice muestra si el aviso está «Programado», «Vigente» o «Vencido», y no guarda un «Hasta» que no sea posterior al «Desde».

> Añadido el 2026-11-24 por el lote 30 ([ADR-0027](../../../../adrs/0027-cerrar-por-lotes-lo-que-salio-de-la-reunion-del-2026-11-20.md); PBI-0244; decisiones de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md), «Reunión del 2026-11-20: avisos programados»), sin especificación propia: lo prueba `frontend/tests/e2e/admin-contenido.spec.ts`. El BFF rechaza también una fecha inválida (`400 INVALID_COLLECTION`).

### Escenario 11 – WhatsApp de la tienda

- **Dado** que el superadministrador está en Contenido, en la sección «WhatsApp»
- **Cuando** escribe el número con el código de país (por ejemplo, 51 987 654 321) y, si quiere, un mensaje inicial de hasta 200 caracteres
- **Entonces** el backoffice valida el número (de 8 a 15 dígitos; pide el 51 si falta), «Probar» abre el enlace que tendrá la tienda y, al guardar, la tienda muestra el botón de WhatsApp. Sin número, la tienda no lo muestra.

> Añadido el 2026-11-27 por el lote 49 ([ADR-0035](../../../../adrs/0035-construir-por-lotes-el-acceso-a-whatsapp.md); PBI-0241; decisión de Sebastián Avila (2026-11-27), en [decisiones pendientes](../../../PENDING-DECISIONS.md), «PBI-0241: acceso a WhatsApp»), sin especificación propia: lo prueba `frontend/tests/e2e/storefront-whatsapp.spec.ts`. El BFF guarda solo los dígitos y rechaza un número que no sirve con `400 INVALID_COLLECTION` ([contrato](../../../../../backend/docs/BFF-CONTRACT.md)).
