# 0022. Quitar la tuerca de la tienda y limitar la de la demo a los temas predefinidos

- Estado: Aceptada
- Fecha: 2026-11-23

Decidida en el lote 14 de [ADR-0021](0021-aplicar-por-lotes-los-cambios-que-pidio-daniel.md) (PBI-0188), con la decisión provisional de partida de ese ADR. Queda «Provisional, por confirmar con Daniel». Modifica [ADR-0012](0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md) en quién escribe la cookie de la vista previa y qué temas acepta; el resto de ADR-0012 sigue vigente.

## Contexto

### Por qué había que decidir

Daniel Avila respondió el 2026-11-20 que «la tuerca de la demo muestra solo los 3 temas predefinidos: la tuerca del storefront debe desaparecer. Solo debe permitir configurar el tema desde el backoffice» ([decisiones pendientes](../planning/PENDING-DECISIONS.md), PBI-0188). Con ADR-0012, en modo demo la tienda y el Admin tenían cada uno su tuerca, las dos ofrecían todos los temas (también los propios) y las dos escribían la cookie `ws_tema_vista_previa`. `GET /bff/appearance` publicaba en modo demo los nombres y colores de todos los temas propios. Daniel no dijo si la tuerca del Admin se queda en la demo ni cómo se enseñan los tres temas en la tienda sin la suya.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **La tuerca solo en el Admin, con A, B y C; la tienda lee la cookie (elegida)** | La tienda pierde la tuerca, su componente y sus estilos, pero sigue leyendo la cookie: lo que se elige en la tuerca del Admin se ve en la tienda del mismo host. La tuerca del Admin ofrece solo A, B y C. El BFF y las dos aplicaciones aceptan como vista previa solo un predefinido, y la apariencia de la demo publica A, B, C y el activo | La demo sigue enseñando los tres temas en la tienda sin una tuerca en ella. Ningún tema propio, ni su nombre, sale a quien visita la tienda. Sin rutas ni campos nuevos | La vista previa solo pasa a la tienda en el mismo host (como ya pasaba, PBI-0072): con subdominios distintos, la tienda de la demo solo muestra el activo |
| Quitar las dos tuercas | Sin modo demo para temas: se enseñan activándolos en «Temas» | Lo más simple | Contradice «la tuerca de la demo muestra solo los 3 temas»; activar un tema cambia la tienda para todos |
| Tuerca del Admin que abre una vista previa de la tienda | Un enlace o un marco con la tienda en el tema elegido | Funciona también con subdominios | Una pantalla nueva que nadie pidió; la cookie ya resuelve el caso del mismo host |

## Decisión

- La tienda no tiene tuerca, tampoco en modo demo: se quitan `SelectorTemaComponent` de la tienda, sus estilos de `storefront.css` y los métodos `verTema` y `volverAlActivo` de su `TemasFacade`. La tienda sigue leyendo la cookie en modo demo y borra la que ya no sirve.
- La tuerca del Admin se queda en modo demo y ofrece solo los temas predefinidos (`TemasFacade.temasDeLaTuerca`). Su texto dice que el cambio se ve también en la tienda.
- La vista previa solo puede ser un tema predefinido. En modo demo, `theme.css` ignora la cookie si no es A, B ni C, y la regla `temaVisible` de las dos aplicaciones hace lo mismo y pide borrarla.
- En modo demo, `GET /bff/appearance` trae A, B y C y, si el activo es un tema propio, también el activo, para pintarlo. Fuera del modo demo no cambia: solo el activo.

_Motivo:_ es la opción más apegada a lo que escribió Daniel (sin tuerca en la tienda, la de la demo con los tres temas) que conserva lo que la demo debe enseñar, los tres temas también en la tienda, sin pantallas nuevas.

## Consecuencias

**Lo que se vuelve más fácil:**

- El tema se configura solo en el Admin: la tienda no tiene controles de tema, y su bundle ya no carga la tuerca ni su menú de Material.
- La apariencia pública de la demo no expone los temas propios de nadie.

**Lo que se vuelve más difícil:**

- Para enseñar un tema en la tienda de la demo hay que elegirlo en la tuerca del Admin y abrir la tienda en el mismo navegador y host.
- Un tema propio solo se ve en la tienda si se activa en «Temas», lo que cambia la tienda para todos.

**Fuera de alcance:** la demo publicada en Render sigue sin modo demo ([ADR-0020](0020-publicar-la-demo-en-render.md)); compartir la vista previa entre subdominios exigiría escribir la cookie con `Domain` (PBI-0072).
