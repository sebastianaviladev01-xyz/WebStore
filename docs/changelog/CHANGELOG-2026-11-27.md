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
