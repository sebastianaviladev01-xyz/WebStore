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
