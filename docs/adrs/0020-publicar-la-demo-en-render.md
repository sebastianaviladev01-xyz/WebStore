# 0020. Publicar la demo en Render

- Estado: Aceptada
- Fecha: 2026-11-16

Decidida por Sebastián Avila el 2026-11-16: la demo debe ser permanente y no temporal, para que el resto del equipo la vea sin restricciones en la última versión, en un servicio gratuito («gratuito por favor»; eligió Render gratuito frente a Oracle Cloud gratuito). Modifica [ADR-0004](0004-adoptar-la-estructura-de-repositorio-de-idshield.md) solo para la demo del equipo: la instalación de un cliente sigue sin despliegue en el repositorio. Cierra la parte de hosting de PBI-0042.

Nota posterior (2026-11-20): Sebastián pidió quitar la tuerca de la demo publicada para que funcione igual que en local («quita la tuerquita de la demo, que funcione igual que en local»). Desde entonces la demo corre sin modo demo y con los códigos de verificación en la respuesta, como la configuración `bff` de [`.claude/launch.json`](../../.claude/launch.json). La decisión y las consecuencias de abajo ya lo reflejan.

## Contexto

### Por qué había que decidir

La demo se publicaba desde la PC de Sebastián con túneles temporales de `trycloudflare.com`: solo existía mientras la PC estaba encendida con los tres servidores en marcha, y los enlaces cambiaban cada vez ([PBI-0042](../planning/backlog.md)). El equipo necesita una dirección fija con la última versión de `dev`, sin costo.

### Opciones

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Render gratuito, un solo servicio (elegida)** | Un servicio web Node que sirve la tienda en `/`, el Admin en `/admin/` y el BFF en `/bff/`, configurado en `render.yaml` y publicado desde `dev` cuando pasa el CI | Gratis, sin mantener un servidor; un solo origen, así que la tienda y el Admin comparten la vista previa de la tuerca; cada versión de `dev` se publica sola | Se duerme tras 15 minutos sin visitas y la primera visita tarda alrededor de un minuto; disco efímero: los datos vuelven a los de ejemplo al dormirse o al publicar |
| Render gratuito, tres servicios | La tienda y el Admin como sitios estáticos y el BFF como servicio web | Los sitios estáticos no se duermen | Las llamadas de `/bff/` tendrían que pasar de un sitio estático a otro servicio, algo que la documentación de Render no confirma; mientras el BFF duerme, la página cargaría y sus datos fallarían |
| Oracle Cloud gratuito | Una máquina virtual siempre encendida | Datos persistentes y sin esperas | Pide una tarjeta para verificar la cuenta, la puesta en marcha es más larga y alguien mantiene el servidor |
| Seguir con túneles desde la PC | Lo de hoy | Sin trabajo nuevo | No es permanente |

## Decisión

Publicaremos la demo del equipo en Render, plan gratuito, como un solo servicio web:

- [`render.yaml`](../../render.yaml) define el servicio `webstore-demo`: compila la tienda y el Admin (este con `--base-href /admin/`), arranca [`tools/demo/servidor-demo.mjs`](../../tools/demo/servidor-demo.mjs) y se publica desde `dev` cuando el CI pasa (`autoDeployTrigger: checksPass`).
- El servidor de la demo arranca el BFF de prueba como proceso hijo en un puerto interno, le pasa `/bff/` y `/health`, y sirve los dos builds con la vuelta a `index.html` de las rutas de Angular. No cambia el código del BFF ni de los frontends.
- Funciona igual que en local: sin modo demo (`WEBSTORE_DEMO_MODE=false`), así que no hay tuerca de temas, ni credenciales de prueba en el acceso del Admin, ni reinicio de los datos; y con `WEBSTORE_EXPOSE_TEST_CODES=true`, porque no hay correo real. Los colores se cambian en el Admin, en «Temas». Hasta el 2026-11-20 corrió en modo demo.
- Acceso abierto a quien tenga el enlace, como pidió Sebastián («sin restricciones»). Usa la dirección gratuita de Render; el dominio propio queda para cuando se decidan el nombre y el logo.

*Motivo:* es la única opción gratuita que no exige mantener un servidor y que deja la tienda, el Admin y el BFF en un mismo origen, sin depender de una función de Render que no está confirmada.

## Consecuencias

**Lo que se vuelve más fácil:**

- El equipo y Daniel ven siempre la última versión de `dev` en una dirección fija, sin la PC de Sebastián.
- Una versión de `dev` con el CI en rojo no se publica.

**Lo que se vuelve más difícil:**

- Tras 15 minutos sin visitas el servicio se duerme: la primera visita espera alrededor de un minuto.
- Los datos son los de ejemplo y se pierden al dormirse o al publicar una versión nueva. Nada de lo que se haga en la demo dura.
- El acceso del Admin no muestra las credenciales: el equipo usa las de prueba del [README](../../README.md#accesos-de-demostración). Como son las de ejemplo, quien las conozca entra como superadministrador y puede cambiar los datos, también el tema activo para todos. Solo afecta a datos de ejemplo, que vuelven solos.
- El plan gratuito tiene 750 horas de servicio al mes y un tope de ancho de banda y de minutos de compilación; si se agotan, Render suspende la demo hasta el mes siguiente.

**Fuera de alcance:** la instalación de un cliente (sigue [la puesta en marcha](../development/puesta-en-marcha.md), sin modo demo), el dominio propio y los datos persistentes, que necesitarían un plan de pago. Si el equipo quiere cerrar el acceso, se añade una contraseña común en el servidor de la demo con un ADR que modifique este.
