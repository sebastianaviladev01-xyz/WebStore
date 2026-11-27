# Cambios — 2026-11-27: los hallazgos de los lotes 43 a 48

Sebastián Avila pidió no dejar pendientes: los cuatro hallazgos que el cierre de ADR-0033 había dejado en el backlog (PBI-0272 a PBI-0275) se corrigieron el mismo día, sin excepción al flujo.

- **Diálogo de tema en el celular (PBI-0272):** el espacio en blanco bajo «Cancelar» y «Guardar tema» era real. Al desplazar hasta el final, subía la ventana entera y quedaban hasta 588 px vacíos, porque un texto para lectores de pantalla se colocaba respecto de la ventana. Corregido, sin rediseño. Las otras ocho ventanas del backoffice se midieron y no tenían el defecto; una e2e lo comprueba en las nueve.
- **Foco tras borrar en la última página (PBI-0273):** al borrar la única fila de la última página, el foco va a la última fila de la página anterior, la más cercana a la borrada.
- **Salto al registro recién creado (PBI-0274):** e2e de punta a punta en Marcas, Tarifas de envío, Productos, Categorías, Usuarios y Banners, con más de una página.
- **Foco inicial de las ventanas en las e2e (PBI-0275):** las pruebas esperan el foco de cada ventana antes de escribir, con una ayuda compartida; repetidas cinco veces, 755 de 755.

## Verificación

- `npm run verify` en verde y la suite e2e completa, 475 de 475.

## Lo que queda abierto

- Nada de esta entrega. Lo que ya estaba fuera sigue con su motivo en el [backlog](../planning/backlog.md).

## Decisiones provisionales, convertidas en decisiones de Sebastián Avila

Sebastián Avila decidió el 2026-11-27 no seguir esperando a Daniel con las decisiones de negocio marcadas como provisionales: se confirma lo construido y pasan a ser decisiones suyas, como las de la reunión del 2026-11-24. Si Daniel pide otra cosa, se especifica como un cambio.

- **[Decisiones pendientes](../planning/PENDING-DECISIONS.md):** las 16 filas que empezaban por «Provisional, por confirmar con Daniel» (la del vocabulario, «con Sebastián Avila y Daniel Avila») empiezan por «Decidido por Sebastián Avila (2026-11-27), sin esperar a Daniel», y sus preguntas se resuelven como se construyó; los detalles provisionales de las filas que Daniel respondió dicen lo mismo. La cabecera explica la conversión en «Decisiones provisionales, 2026-11-27». Siguen abiertas las filas de terceros, el modelo de datos base de Daniel y el nombre del producto.
- **ADR:** [ADR-0022](../adrs/0022-quitar-la-tuerca-de-la-tienda-y-limitar-la-demo-a-los-temas-predefinidos.md), [ADR-0023](../adrs/0023-dar-al-tema-un-borde-del-acento-y-un-acento-fuerte-legible.md), [ADR-0024](../adrs/0024-dejar-en-ingles-el-vocabulario-interno-y-el-contrato.md), [ADR-0026](../adrs/0026-guardar-las-imagenes-cargadas-en-el-bff-y-servirlas-por-direccion.md) (de «Propuesta» a «Aceptada»), [ADR-0028](../adrs/0028-hacer-visible-el-secundario-en-la-tienda-e-invertir-el-tema-c.md) y [ADR-0030](../adrs/0030-alejar-el-principal-fuerte-que-no-se-distingue-del-principal.md) cambian su estado y llevan una nota fechada; los ADR de lotes que dejaban las provisionales a la espera de Daniel (0017, 0021, 0025, 0027, 0029 y 0032) llevan solo la nota.
- **Resto de la documentación:** backlog, trazabilidad, funcionalidad, historias de usuario, glosario, índice de features, contrato del BFF, arquitectura del BFF y del frontend, sistema visual y puesta en marcha dicen «confirmado por Sebastián Avila» donde decían que lo provisional esperaba a Daniel. Lo provisional de los lotes 01 a 10, que Daniel ya respondió, dice «provisional al cerrarla, ya resuelta».
- **Código:** solo comentarios de código y de pruebas. No cambia ningún comportamiento, ningún texto visible, ningún dato ni el contrato.

Siguen provisionales, porque no son decisiones de negocio de Daniel: el adaptador de Codex y sus modelos, hasta que una persona los valide, y el favicon, hasta decidir el nombre y el logo.

### Verificación

- `npm run verify` en verde (frontend 548, BFF 761 y 34 de arquitectura). Sin e2e: no cambia ningún comportamiento.

## Las preguntas de negocio ya no esperan a Daniel

Sebastián Avila pidió corregir la regla del flujo que mandaba a Daniel las preguntas de negocio sin respuesta explícita y bloqueaba la feature hasta su respuesta. [ADR-0034](../adrs/0034-decidir-las-preguntas-de-negocio-sin-esperar-a-daniel.md) la sustituye. La pregunta se presenta en el hito con sus alternativas, la recomendación y las citas. La decide Sebastián Avila, o la sesión aplica la recomendada si él delegó la decisión. Se registra como «Decidido por Sebastián Avila (fecha), sin esperar a Daniel» y la feature sigue. Solo bloquean las decisiones de terceros, del cliente o de lo que entrega Daniel (modelo de datos, nombre y logo).

- Cambian [`AGENTS.md`](../../AGENTS.md), los [hitos humanos](../architecture/development-workflow.md#hitos-humanos), el skill [`sdd-specify`](../../.agents/skills/sdd-specify/SKILL.md) y la cabecera de las [decisiones pendientes](../planning/PENDING-DECISIONS.md).
- No cambia ningún comportamiento de la aplicación.

## Acceso a WhatsApp en la tienda (lote 49, ADR-0035)

Sebastián Avila decidió el acceso a WhatsApp que Daniel había dejado para el backlog en la reunión del 2026-11-20 (PBI-0241) y pidió construirlo como enlace configurable («Sí, constrúyelo»). Se hizo en un lote único, como excepción al flujo ([ADR-0035](../adrs/0035-construir-por-lotes-el-acceso-a-whatsapp.md)), con su cierre en el mismo PR.

- **Tienda:** un botón flotante de WhatsApp abajo a la derecha, en la esquina donde estuvo la tuerca de temas, en todas las páginas menos el checkout. Abre `https://wa.me/<número>` (con el mensaje inicial, si lo hay) en otra pestaña, se llama «Escríbenos por WhatsApp (se abre en otra pestaña)» y lleva el anillo de foco del tema. En la ficha del celular sube sobre la barra de «Agregar al carrito». Queda por debajo del menú lateral y de los diálogos.
- **Backoffice:** Contenido tiene la sección «WhatsApp»: el número con el código de país (con un ejemplo, «51 987 654 321») y un mensaje inicial de hasta 200 caracteres, con «Probar» para abrir el enlace que tendrá la tienda.
- **BFF:** `whatsappNumber` y `whatsappMessage` en la configuración de Contenido: el número se guarda solo con sus dígitos (de 8 a 15) y un celular peruano sin el 51 pide el código de país. Empiezan vacíos: sin número no hay botón, y la demo no trae ninguno. Un estado anterior los recibe vacíos, sin cambiar `schemaVersion` ([contrato](../../backend/docs/BFF-CONTRACT.md)).
- **Color:** el verde de la marca `#128C7E` con el ícono blanco (4.14:1); el círculo, 3.72:1 o más contra el fondo de A, B y C. El verde claro `#25D366` con blanco daba 1.98:1, por debajo del 3:1 que pide WCAG 1.4.11.
- **Registros:** la [decisión](../planning/PENDING-DECISIONS.md) («PBI-0241: acceso a WhatsApp»), el [backlog](../planning/backlog.md), la [trazabilidad](../planning/TRACEABILITY.md), la [funcionalidad](../planning/FUNCIONALIDAD.md), las historias US01 (escenario 08) y US23 (escenario 11), el [glosario](../architecture/glosario.md), el [sistema visual](../../frontend/docs/VISUAL-SYSTEM.md) y el [índice de features](../specs/features/README.md).

### Verificación

- `npm run verify` en verde: 34 pruebas de arquitectura, 556 del frontend, 777 del BFF y el smoke del contrato.
- e2e completa: 486 de 486. La spec nueva (`storefront-whatsapp.spec.ts`, 11 pruebas), repetida cinco veces: 55 de 55.
- Capturas en `frontend/output/visual-qa/lote-49-whatsapp/` (inicio con A, B y C, ficha y checkout con B, a 375 y 1440 px, arriba y al final; Contenido del backoffice): la tienda solo cambia en la esquina del botón, el checkout queda igual (0 px) y Contenido muestra la sección nueva.

### Lo que queda abierto

Un asistente de chat propio o la API de WhatsApp Business, que dependen de un tercero. De la reunión del 2026-11-20 sigue abierto el reparto de modelos por etapa (PBI-0242).
