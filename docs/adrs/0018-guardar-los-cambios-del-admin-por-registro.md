# 0018. Guardar los cambios del Admin por registro

- Estado: Aceptada
- Fecha: 2026-11-14

Decidida por la sesión principal al ejecutar el lote 06 de [ADR-0017](0017-cerrar-el-backlog-por-lotes-como-excepcion-al-flujo.md), por delegación de Sebastián Avila («continúa en automático con todos los lotes»). Queda por confirmar por él al revisar el PR del lote.

## Contexto

### Por qué había que decidir

El Admin guardaba enviando colecciones enteras en `PUT /admin/snapshot`. La auditoría del 2026-11-14 encontró tres fallos con la misma causa ([backlog](../planning/backlog.md)):

- **PBI-0119:** las fotos viajan como Data URL dentro de cada producto, así que cualquier guardado de productos reenvía todas las fotos y puede superar el límite del cuerpo (`413`), aunque solo cambie el stock.
- **PBI-0120:** tras un `409 STALE_SNAPSHOT`, el Admin recargaba y reenviaba su colección antigua: pisaba lo que cambió otra persona y el stock vendido mientras tanto.
- **PBI-0122 y PBI-0142:** una edición sobre un registro que otra persona eliminó lo volvía a crear.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Cambios por registro en el mismo `PUT` (elegida)** | Cada colección se acepta como lista completa o como `{ upsert, remove }`; el Admin envía solo el registro y los campos que cambió la persona | Resuelve los tres fallos con una ruta y un control de revisión; compatible con un cliente que envíe la lista completa | El BFF mezcla campo a campo: la validación debe hacerse sobre la lista resultante |
| Rutas REST por recurso (`PUT /admin/products/:id`, …) | Una ruta por colección y operación | Contrato más convencional | Muchas rutas nuevas y reescribir el control de revisión y los permisos por colección en un BFF que es de prueba |
| Subir el límite del cuerpo y fusionar en el Admin | Seguir con colecciones enteras | Cambio mínimo | No evita pisar cambios ajenos ni recrear registros; el `413` vuelve con más fotos |

## Decisión

`PUT /admin/snapshot` aceptará cada colección como lista completa, que la reemplaza como hasta ahora, o como cambios `{ upsert, remove }`:

- `upsert` trae registros con `id`. Si el registro existe, se aplican solo los campos que llegan y el resto se conserva del servidor; un campo con `null` se quita. Si no existe, se agrega.
- `remove` trae los `id` que se eliminan. Un `id` no puede cambiarse y eliminarse a la vez.
- `orders` solo admite `{ upsert: [{ id, status }] }`: los pedidos no se crean ni se eliminan desde el Admin.
- La lista resultante se valida entera con las mismas reglas que una lista completa, y el guardado sigue siendo todo o nada, con el control de `revision`.

El Admin usará siempre los cambios por registro. Antes de enviar, y otra vez tras un `409`, la regla `prepararCambio` compara el registro que vio la persona, el que editó y el vigente: envía solo los campos cambiados; no envía nada si el registro ya no existe o si otra persona cambió esos mismos campos, y lo avisa. No se fusionan diferencias de stock: si dos personas cambian el mismo campo, gana la revisión de una persona.

*Motivo:* es el cambio más pequeño que quita la causa común de los tres fallos sin abrir un contrato nuevo en un BFF de prueba.

## Consecuencias

**Lo que se vuelve más fácil:**

- Guardar el stock o el precio de un producto no depende del peso de las fotos de los demás.
- Un cambio ajeno o una venta entre la carga y el guardado ya no se pierden.
- Un registro eliminado por otra persona no reaparece.

**Lo que se vuelve más difícil:**

- El contrato tiene dos formas por colección. La lista completa se mantiene por compatibilidad y para las pruebas; el Admin ya no la usa.
- La regla del conflicto vive en el Admin. Un cliente que envíe `upsert` sin comparar puede seguir pisando un campo: el BFF solo garantiza la revisión y la validez de la lista.
- El Admin ya no actualiza la pantalla antes de la respuesta: muestra «Guardando…» y un solo guardado en curso.

**Fuera de alcance:** el almacenamiento de fotos como archivos y las rutas por recurso, que corresponden al BFF productivo. El detalle del contrato está en [`BFF-CONTRACT.md`](../../backend/docs/BFF-CONTRACT.md) y el diseño, en [`backend/architecture.md`](../../backend/architecture.md) y [`frontend/architecture.md`](../../frontend/architecture.md).
