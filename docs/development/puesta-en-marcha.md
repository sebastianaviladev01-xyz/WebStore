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

## 5. Calendario de días no laborables

El plazo de respuesta del Libro de reclamaciones es de 15 días hábiles. El BFF excluye sábados y domingos y, además, las fechas de `WEBSTORE_NON_WORKING_DATES`. Esa variable es la **única fuente de feriados**: no hay pantalla en el Admin ni una lista de feriados en el código. Es una decisión provisional, por confirmar con Daniel ([decisiones pendientes](../planning/PENDING-DECISIONS.md), «Calendario de días no laborables»).

1. Cada año, antes de que empiece, arma la lista con los feriados nacionales de Perú de ese año, en formato `AAAA-MM-DD` y separados por coma. De referencia: 1 de enero, Jueves y Viernes Santo (cambian cada año), 1 de mayo, 29 de junio, 28 y 29 de julio, 6 y 30 de agosto, 8 de octubre, 1 de noviembre, 8 y 9 de diciembre y 25 de diciembre. Confírmalos con el calendario oficial del año y añade los días no laborables que decrete el Gobierno (los «feriados puente»), porque cambian de un año a otro.
2. Defínela como variable de entorno del host o del servicio que arranca el BFF, con las fechas de uno o más años (la lista puede conservar las de años anteriores):

   ```powershell
   $env:WEBSTORE_NON_WORKING_DATES = "2027-01-01,2027-03-25,2027-03-26,2027-05-01,2027-06-29,2027-07-28,2027-07-29,2027-08-06,2027-08-30,2027-10-08,2027-11-01,2027-12-08,2027-12-09,2027-12-25"
   ```

   Las fechas de ejemplo son de 2027 y hay que confirmarlas con el calendario oficial. En Bash: `export WEBSTORE_NON_WORKING_DATES="..."`.
3. Reinicia el BFF: la variable se lee al arrancar.

Los reclamos ya registrados conservan su fecha de vencimiento (`dueAt`): cambiar la lista solo afecta a los reclamos nuevos.

**Aviso de feriados:** si la lista no tiene ninguna fecha del año en curso (Lima), el BFF escribe en su log «Aviso: WEBSTORE_NON_WORKING_DATES no tiene ninguna fecha de AAAA…» y sigue arrancando. Lo escribe al arrancar y otra vez cuando cambia el año de Lima con el BFF en marcha (se revisa cada hora), una sola vez por año. Si lo ves a comienzos de año, renueva la lista. La variable se lee al arrancar: reinicia el BFF cuando cambies la lista.

**Comprobación:** registra un reclamo de prueba en una copia de datos y revisa que `dueAt` salte los feriados de la lista; o arranca el BFF y comprueba que su log no trae el aviso.

## Revisa también

- **Códigos de verificación y reinicio:** por defecto, el BFF no devuelve en la respuesta los códigos de verificación ni de recuperación, y `POST /bff/admin/reset` responde `403 STORE_RESET_DISABLED`. Solo cambian con `WEBSTORE_EXPOSE_TEST_CODES=true`, `WEBSTORE_ALLOW_STORE_RESET=true` o el modo demo: una instalación cliente no define ninguna de las tres.
- **Orígenes:** `WEBSTORE_ALLOWED_ORIGINS` lleva los orígenes de la tienda y del Admin de esa instalación, separados por coma.

## Lista de comprobación

- [ ] El archivo de estado es nuevo y no es `backend/data.json` de desarrollo.
- [ ] `WEBSTORE_DEMO_MODE` no está definida: `/bff/appearance` responde `"demoMode":false`.
- [ ] Las tres cuentas sembradas tienen contraseñas propias, o están desactivadas.
- [ ] El logo de la tienda está cargado en Contenido.
- [ ] El tema activo es el de la tienda: C para Ecom.
- [ ] `WEBSTORE_NON_WORKING_DATES` trae los feriados del año en curso y el log del BFF no avisa de que faltan.
- [ ] `WEBSTORE_EXPOSE_TEST_CODES` y `WEBSTORE_ALLOW_STORE_RESET` no están definidas, y `WEBSTORE_ALLOWED_ORIGINS` lleva los orígenes de la instalación.
