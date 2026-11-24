# 0012. Activar el modo demo y recordar la vista previa en una cookie

- Estado: Aceptada
- Fecha: 2026-11-11

> Modificada por [ADR-0022](0022-quitar-la-tuerca-de-la-tienda-y-limitar-la-demo-a-los-temas-predefinidos.md) (2026-11-23, lote 14, PBI-0188): la tienda ya no tiene tuerca; solo la del Admin escribe la cookie, ofrece solo A, B y C, y la vista previa solo puede ser uno de ellos. La tienda sigue leyendo la cookie en modo demo. Lo que sigue es la decisión original.

## Contexto

### Por qué había que decidir

En la demo pública, la feature [002](../specs/features/002-temas-configurables/specification.md) muestra una tuerca que cambia el tema solo en el navegador de quien la usa (D5), recordado al recargar y al pasar de la tienda al Admin (AC-21) y sin parpadeo (AC-18). Las instalaciones de clientes no deben tenerla (D4). La tienda (`:4200`) y el Admin (`:4300`) son orígenes distintos y no comparten `localStorage`, y [STD-08](../architecture/standards.md) solo permite en el navegador el token de sesión y el carrito. Es la pregunta 3 del [hito de arquitectura](../specs/features/002-temas-configurables/planning.md#pregunta-3-dónde-se-recuerda-la-vista-previa-de-la-tuerca).

### Opciones

Cómo se enciende el modo demo (decidido en D4; aquí se fija el mecanismo):

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Variable de entorno del BFF, apagada por defecto (elegida)** | `WEBSTORE_DEMO_MODE`, leída en [`config.mjs`](../../backend/src/infrastructure/config.mjs) y publicada en `GET /bff/appearance` como `demoMode` | Mismo build para la demo y los clientes; un cliente no puede encenderla desde el Admin | Encenderla exige reiniciar el BFF con la variable |
| Ajuste del Admin | Una casilla en Contenido | Se cambia sin reiniciar | Un cliente podría encender la tuerca en su tienda |
| Build distinto del frontend | Una configuración de Angular para la demo | Sin código de la tuerca en los clientes | Dos builds que mantener y verificar |

Dónde se recuerda la vista previa de la tuerca:

| Opción | Qué habría significado | A favor | En contra |
|---|---|---|---|
| **Cookie `ws_tema_vista_previa`, que el BFF lee solo en modo demo para servir `theme.css` (elegida)** | La tuerca guarda el id del tema en una cookie, y el BFF la usa para elegir la hoja del [ADR-0010](0010-aplicar-el-tema-activo-con-una-hoja-de-estilos-del-bff.md) | La comparten la tienda y el Admin, porque las cookies no distinguen puertos. Al recargar no parpadea | El id del tema viaja al BFF. Amplía STD-08 |
| La misma cookie, que solo lee Angular | La tuerca aplica la vista previa después del arranque | El id no viaja al BFF | Al recargar con una vista previa, la página se ve un momento con el tema activo y luego cambia |
| `localStorage` | Como el carrito | Sin cookies | La tienda y el Admin no lo comparten: no cumple AC-21 al pasar de una al otro |

## Decisión

Usaremos el modo demo y la cookie así:

- **`WEBSTORE_DEMO_MODE`**: solo `true` lo enciende, sin distinguir mayúsculas y sin espacios en los extremos. Ausente, vacía o con otro valor (`false`, `1`, `sí`), queda apagado, también fuera de producción. `readConfig` la expondrá como `demoMode`. [`backend/architecture.md` §3](../../backend/architecture.md#3-configuración) la anota como decidida, y se añadirá a su tabla de variables en la tarea que la implementa.
- **`ws_tema_vista_previa`**: cookie con el id de un tema, `Path=/`, `SameSite=Lax`, `Max-Age=2592000` (30 días), `Secure` si la página va por `https` y sin `Domain`. La escribirá la `TemasFacade` de cada aplicación.
- El BFF lee la cookie **solo en modo demo** y solo para elegir qué hoja sirve `theme.css`. No la guarda y no cambia nada para otras personas. Fuera del modo demo la ignora, y el frontend la borra.
- **Se amplía STD-08**: en el navegador, además del token de sesión en `sessionStorage` y del carrito en `localStorage`, se permite esta cookie, que lleva un id de tema no sensible y solo tiene efecto en modo demo.

*Motivo:* la cookie es lo único que la tienda y el Admin comparten en `localhost` y que el BFF puede leer antes del primer pintado, así que cumple AC-21 y AC-18 a la vez sin dar a nadie más poder sobre el tema activo.

## Consecuencias

**Lo que se vuelve más fácil:**

- La demo pública enseña los tres temas sin cambiar el tema activo de nadie más, y un cliente instala el mismo build sin tuerca.
- La vista previa se recuerda al recargar y al pasar de la tienda al Admin, sin parpadeo.

**Lo que se vuelve más difícil:**

- Con modo demo, `theme.css` depende de una cookie: se sirve con `Vary: Cookie` para que ningún intermediario dé la vista previa de una persona a otra.
- La frase «no viaja al BFF» de la tabla de datos de la especificación queda matizada; la fila [ya se aclaró](../specs/features/002-temas-configurables/specification.md#datos-y-contrato).
- **Limitación conocida de la demo con túneles:** los túneles de `trycloudflare.com` dan a la tienda y al Admin subdominios distintos de un dominio que está en la [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat) (comprobado el 2026-11-11). El navegador no permite una cookie para ese dominio, así que cada aplicación recuerda su propia vista previa. AC-21 entre la tienda y el Admin solo se cumple en `localhost` y en un despliegue con dominio propio y subdominios (PBI-0042). *Corrección del 2026-11-14 (lote 03, PBI-0072):* la cookie se escribe sin `Domain` y es de cada host, así que con subdominios distintos tampoco se comparte; solo en el mismo host, como `localhost`. Se documentará en [`docs/development/local-environment.md`](../development/local-environment.md) en la tarea que implementa el modo demo, junto con cómo arrancar el BFF con la variable.
- La e2e arrancará el BFF con `WEBSTORE_DEMO_MODE=true`, así que la tuerca estará en todas las specs y no puede tapar ningún control (AC-15).

**Fuera de alcance:**

- Guardar la vista previa como tema activo desde la tuerca: el tema activo solo lo cambia el `superadmin` en la página de temas (D5).
- Otras funciones del modo demo: la variable solo controla la tuerca y la lectura de la cookie.

## Referencias

- [Plan de la feature 002: tipos intermedios, riesgos y respuestas del hito](../specs/features/002-temas-configurables/planning.md)
- [MDN — Cookies y el atributo `Domain`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
