# Puesta en marcha de una instalación

Pasos para dejar lista la instalación de una tienda cliente, por ejemplo Ecom, antes de abrirla al público. La demo pública del equipo es otra cosa: corre en modo demo y se levanta como indica el [entorno local](local-environment.md#modo-demo).

Cada paso dice qué hacer y cómo comprobarlo. Los comandos son para PowerShell, en la terminal del BFF; donde Bash cambia, se indica. Las variables de entorno del BFF están en [`backend/architecture.md` §3](../../backend/architecture.md#3-configuración).

## Antes de empezar

- La instalación arranca con un **archivo de estado nuevo**. Si `WEBSTORE_DATA_FILE` apunta a un archivo que no existe, el BFF lo crea desde el seed. Ese archivo empieza con el tema B, «Azul cobalto», activo y sin temas propios (AC-24).
- Las contraseñas de las cuentas sembradas se fijan **al crear ese archivo** (paso 2). Por eso las variables del paso 1 y del paso 2 se definen antes del primer arranque.
- No escribas contraseñas, hosts ni otros secretos en el repositorio ni en documentos. Se pasan como variables de entorno del host o del servicio que arranca el BFF.

## 1. Sin modo demo

`WEBSTORE_DEMO_MODE` **no se define**. Sin la variable, el modo demo está apagado: no aparece la tuerca «Cambiar tema», y el BFF ignora la cookie de la vista previa ([ADR-0012](../adrs/0012-activar-el-modo-demo-y-recordar-la-vista-previa-en-una-cookie.md)).

Si la terminal viene de levantar la demo, quítala antes de arrancar:

```powershell
Remove-Item Env:WEBSTORE_DEMO_MODE -ErrorAction SilentlyContinue
```

En Bash: `unset WEBSTORE_DEMO_MODE`.

**Comprobación:** `GET /bff/appearance` responde `"demoMode":false` y en `themes` solo trae el tema activo. La tienda y el Admin no muestran la tuerca.

## 2. Contraseñas propias de las cuentas sembradas

El seed crea tres cuentas del Admin: `superadmin` (`owner@webstore.demo`), `admin` (`admin@webstore.demo`) y `vendedor` (`catalogo@webstore.demo`). Sus contraseñas por defecto están publicadas en el [README](../../README.md#accesos-de-demostración), así que una instalación cliente **nunca** las usa.

Define una contraseña propia para cada cuenta **antes del primer arranque**, con estas variables:

| Variable | Cuenta |
|---|---|
| `WEBSTORE_OWNER_PASSWORD` | `superadmin` |
| `WEBSTORE_ADMIN_PASSWORD` | `admin` |
| `WEBSTORE_CATALOG_PASSWORD` | `vendedor` |

```powershell
function Leer-Clave($texto) { [Net.NetworkCredential]::new('', (Read-Host $texto -AsSecureString)).Password }
$env:WEBSTORE_OWNER_PASSWORD = Leer-Clave "Contraseña del superadministrador"
$env:WEBSTORE_ADMIN_PASSWORD = Leer-Clave "Contraseña del administrador"
$env:WEBSTORE_CATALOG_PASSWORD = Leer-Clave "Contraseña del vendedor"
npm run start:bff
```

Así la contraseña no se ve al escribirla ni queda en el historial de la terminal.

En Bash: `read -rs WEBSTORE_OWNER_PASSWORD && export WEBSTORE_OWNER_PASSWORD`, y lo mismo con las otras dos, antes de `npm run start:bff`.

- Usa al menos 10 caracteres, con letras y números, como pide el Admin para las contraseñas temporales.
- Las variables solo se aplican **al crear el archivo de estado**. Si el archivo ya existe, no cambian nada. Hay dos salidas:
  - arrancar con un archivo nuevo;
  - crear usuarios propios en Admin → Usuarios y roles, con su contraseña temporal, y desactivar o eliminar las cuentas sembradas. Debe quedar al menos un `superadmin` activo.
- Entrega cada contraseña a su persona por un canal privado.

**Comprobación:** en el acceso al Admin, cada cuenta entra con su contraseña nueva y no entra con la del README.

## 3. Logo de la tienda

El logo es parte de la marca de la tienda (el de Ecom es una marca registrada). Ningún tema lo cambia (REQ-15).

1. Entra al Admin con el `superadmin` o el `admin` y abre **Contenido**.
2. En «Logo de la tienda», usa **Cargar logo** (PNG, JPG, WebP o SVG).
3. Pulsa **Guardar configuración**.

**Comprobación:** la cabecera de la tienda muestra el logo al recargarla.

## 4. Tema activo

Toda instalación nueva empieza con **B, «Azul cobalto»**. Si la tienda usa otro tema, se activa en este paso. Para **Ecom**, el tema es **C, «Grafito y ámbar»**:

1. Entra al Admin con el `superadmin`; solo él tiene **Temas**, en el grupo «Tienda» del menú.
2. En «Predefinidos», pulsa **Activar** en «Grafito y ámbar».
3. La lista lo marca «Activo», y el Admin de quien lo activó lo aplica al momento. La tienda y los demás Admin abiertos lo aplican en su siguiente carga.

El tema activo se guarda en el BFF y sigue activo tras reiniciarlo.

**Comprobación:** `GET /bff/appearance` responde `"activeThemeId":"c"`, y la tienda se ve con el amarillo `#F2B705` y el grafito `#1F2328`.

## Revisa también

- **Códigos de verificación y reinicio:** por defecto, el BFF no devuelve en la respuesta los códigos de verificación ni de recuperación, y `POST /bff/admin/reset` responde `403 STORE_RESET_DISABLED`. Solo cambian con `WEBSTORE_EXPOSE_TEST_CODES=true`, `WEBSTORE_ALLOW_STORE_RESET=true` o el modo demo: una instalación cliente no define ninguna de las tres.
- **Orígenes:** `WEBSTORE_ALLOWED_ORIGINS` lleva los orígenes de la tienda y del Admin de esa instalación, separados por coma.

## Lista de comprobación

- [ ] El archivo de estado es nuevo y no es `backend/data.json` de desarrollo.
- [ ] `WEBSTORE_DEMO_MODE` no está definida: `/bff/appearance` responde `"demoMode":false`.
- [ ] Las tres cuentas sembradas tienen contraseñas propias, o están desactivadas.
- [ ] El logo de la tienda está cargado en Contenido.
- [ ] El tema activo es el de la tienda: C para Ecom.
- [ ] `WEBSTORE_EXPOSE_TEST_CODES` y `WEBSTORE_ALLOW_STORE_RESET` no están definidas, y `WEBSTORE_ALLOWED_ORIGINS` lleva los orígenes de la instalación.
