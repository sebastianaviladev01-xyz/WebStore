# Entorno local

Cómo preparar el host, levantar WebStore, trabajar con los datos del BFF de prueba y hacer QA visual. Todo se ejecuta en el host con Node.js y npm, desde la raíz del repositorio: no hay contenedores ni servicios externos ([ADR-0004](../adrs/0004-adoptar-la-estructura-de-repositorio-de-idshield.md)).

- La referencia de comandos está en el [README](../../README.md#verificar) y en [`AGENTS.md`](../../AGENTS.md). [Levantar y apagar el proyecto](#levantar-y-apagar-el-proyecto) es el procedimiento para personas.
- Los comandos se muestran para PowerShell; donde Bash cambia, se indica.

## Requisitos del host

| Requisito | Para qué | Comprobación |
|---|---|---|
| Node.js de una línea admitida por `engines` en [`package.json`](../../package.json): `^22.22.3`, `^24.15.0` o `^26.0.0` | Angular CLI, el BFF de prueba y las pruebas (`node:test`) | `node --version` |
| npm 10 o superior | Instalar dependencias y ejecutar los scripts | `npm --version` |
| `git` | Ramas y commits ([convenciones](../git/conventional-pull-requests.md)) | `git --version` |
| Google Chrome | QA visual con los scripts CDP de [`frontend/tools/qa/`](../../frontend/tools/qa/) | Ver [QA visual con Chrome](#qa-visual-con-chrome) |
| Navegador de Playwright de la versión fijada en `frontend/package-lock.json` | La suite e2e (`npm run test:e2e` desde `frontend/`) | Si falta, Playwright lo indica al ejecutar la suite, con el comando para instalarlo |

Los puertos 3000, 4200 y 4300 deben estar libres.

## Levantar y apagar el proyecto

### Antes de la primera vez

```powershell
npm run setup
```

Ejecuta `npm ci` en la raíz (Prettier) y en `frontend/`. El BFF no tiene dependencias. Repítelo cuando cambie un `package-lock.json`, por ejemplo tras un `git pull`.

### Levantar

Tres terminales, desde la raíz:

| Terminal | Comando | Qué arranca | URL |
|---|---|---|---|
| 1 | `npm run start:bff` | BFF de prueba | `http://localhost:3000` |
| 2 | `npm run start:storefront` | Storefront (tienda pública) | `http://localhost:4200` |
| 3 | `npm run start:admin` | Admin | `http://localhost:4300` |

- Arranca primero el BFF: los dos frontends llegan a él por `/bff`, con el proxy de [`frontend/proxy.conf.json`](../../frontend/proxy.conf.json).
- La primera vez, el BFF crea `backend/data.json` desde su seed ([datos del BFF](#datos-del-bff-y-copias)).
- Los frontends recompilan solos al guardar. El BFF no: reinícialo (Ctrl+C y otra vez `npm run start:bff`) tras cambiar `backend/src/`.
- Con un agente de Claude Code, [`.claude/launch.json`](../../.claude/launch.json) define los mismos tres servidores (`bff`, `storefront` y `admin`).

### Comprobar que responde

| Servicio | Línea que indica que está listo | Comprobación | Resultado esperado |
|---|---|---|---|
| BFF | `WebStore Mock BFF http://localhost:3000` | `curl.exe -s http://localhost:3000/health` | `{"ok":true,…}` |
| Storefront | `Local:   http://localhost:4200/` | `curl.exe -s -o NUL -w "%{http_code}" http://localhost:4200` | `200` |
| Proxy `/bff` | — | `curl.exe -s -o NUL -w "%{http_code}" http://localhost:4200/bff/catalog/products` | `200`: el BFF responde a través del proxy |
| Admin | `Local:   http://localhost:4300/` | `curl.exe -s -o NUL -w "%{http_code}" http://localhost:4300` | `200` |

Usa `curl.exe`: en Windows PowerShell 5.1, `curl` es un alias de `Invoke-WebRequest`. En Bash, `curl` y `-o /dev/null`.

### Probar a mano

1. Abre `http://localhost:4200`: muestra el inicio. Recorre `/catalogo`, una ficha de producto, `/carrito` y `/checkout`. Las rutas útiles están en el [README](../../README.md#ejecutar).
2. Abre `http://localhost:4300/login` y entra con un usuario de demostración de cada rol ([accesos de demostración](../../README.md#accesos-de-demostración)). El menú cambia según el rol.
3. Si vas a comprar, registrar cuentas o cambiar datos en el Admin, trabaja sobre una [copia de los datos](#trabajar-sobre-una-copia).

### Apagar

- Ctrl+C en cada una de las tres terminales.
- Comprobación: las comprobaciones de arriba fallan (`000` o *connection refused*).
- Si un puerto sigue ocupado: `Get-NetTCPConnection -LocalPort 3000 -State Listen` muestra el proceso (`OwningProcess`). Detenerlo es decisión de la persona; un agente pregunta antes.
- `backend/data.json` se conserva entre arranques. Las sesiones abiertas también; para cerrarlas todas: `npm run clear:demo-sessions --prefix backend`.

### Varios checkouts

Solo un BFF puede escuchar en el puerto 3000 y un servidor de cada frontend en 4200 y 4300. Antes de levantar otro worktree, apaga el que esté arriba. Los controles (`npm run verify`) no publican puertos fijos y no chocan, salvo la suite e2e, que levanta sus propios servidores.

## Datos del BFF y copias

- El BFF guarda todo su estado en un archivo JSON: catálogo, inventario, clientes, cuentas, pedidos, reclamos, contenido, tarifas, usuarios administrativos y sesiones.
- Por defecto es `backend/data.json`. No se versiona (`.gitignore`): contiene hashes de contraseñas, sesiones y datos de clientes de prueba.
- Si no existe, el BFF lo crea desde el seed ([`seed.mjs`](../../backend/src/infrastructure/persistencia/seed.mjs)). Al cargarlo, lo valida y lo migra (`schemaVersion`).
- Las variables de entorno del BFF están en [`backend/architecture.md` §3](../../backend/architecture.md#3-configuración).

### Trabajar sobre una copia

Las pruebas, las revisiones y cualquier trabajo que modifique datos usan una copia ([STD-09](../architecture/standards.md)):

```powershell
Copy-Item backend/data.json "$env:TEMP/webstore-data.json"
$env:WEBSTORE_DATA_FILE = "$env:TEMP/webstore-data.json"
npm run start:bff
```

En Bash: `cp backend/data.json /tmp/webstore-data.json && WEBSTORE_DATA_FILE=/tmp/webstore-data.json npm run start:bff`.

- En PowerShell, la variable sigue activa en esa ventana. Para volver al archivo por defecto: `Remove-Item Env:WEBSTORE_DATA_FILE`.
- Si la copia no existe, el BFF la crea desde el seed: sirve para empezar con datos limpios sin tocar `backend/data.json`.
- El smoke test del contrato (`npm run validate:contract`) ya usa un puerto y un archivo temporales.

### Volver a los datos del seed

Renombra `backend/data.json` (por ejemplo, a `data.anterior.json`, que también queda fuera de git) y arranca el BFF: crea uno nuevo. No lo borres sin revisarlo antes. En la demo, el superadministrador también puede reiniciar el estado con `POST /bff/admin/reset` ([contrato](../../backend/docs/BFF-CONTRACT.md#administración)).

## QA visual con Chrome

Los cambios de interfaz se comprueban con capturas antes y después, y no deben cambiar el diseño sin que se pida ([STD-12](../architecture/standards.md)). Los scripts de [`frontend/tools/qa/`](../../frontend/tools/qa/) se conectan a un Chrome con el puerto de depuración en `127.0.0.1:9333`:

```powershell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" --headless=new --remote-debugging-port=9333 --user-data-dir="$env:TEMP\webstore-qa-chrome"
```

Con los tres servidores levantados, desde `frontend/`:

| Script | Qué comprueba |
|---|---|
| `node tools/qa/cdp-visual-qa.mjs` | Capturas por ancho y desborde horizontal |
| `node tools/qa/cdp-console-qa.mjs` | Storefront y Admin sin excepciones, errores ni advertencias de consola |
| `node tools/qa/cdp-interaction-qa.mjs` | Hero, mega-menú, menú móvil, filtros, foco y Escape |
| `node tools/qa/cdp-admin-qa.mjs` | Admin autenticado y menú por rol |

- Variables: `CDP_ENDPOINT` (otro puerto), `VISUAL_QA_URL` (página), `VISUAL_QA_WIDTH` (un solo ancho), `VISUAL_QA_FULL_PAGE=1` (página completa) y `VISUAL_QA_OUTPUT` (carpeta de salida).
- Las capturas van a `frontend/output/`, que no se versiona. Para comparar, guarda las de antes en una carpeta propia con `VISUAL_QA_OUTPUT` antes de cambiar el código.
- Usa un perfil temporal (`--user-data-dir`), no tu perfil personal, y mantén el puerto en `127.0.0.1`.
- Los anchos de referencia son los de la [validación](../../frontend/docs/VALIDATION.md#responsive-y-revisión-visual): 1440, 1280, 1024, 768, 390 y 360 px.

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `npm warn EBADENGINE` al instalar, o errores al arrancar o compilar | Versión de Node fuera de `engines` | Instala una versión admitida y repite `npm run setup` |
| `Cannot find module …/node_modules/.bin/ng` o `eslint: not found` | Dependencias del frontend sin instalar | `npm run setup` |
| `EADDRINUSE` al arrancar | El puerto 3000, 4200 o 4300 está ocupado, por ejemplo por otro checkout | Apaga el otro servidor ([apagar](#apagar)) |
| La tienda o el Admin no cargan datos y la terminal del frontend registra un error del proxy con `ECONNREFUSED` | El BFF no está levantado | `npm run start:bff` y recarga |
| Un cambio en `backend/src/` no se nota | El BFF no recarga solo | Reinícialo |
| El Admin pide entrar otra vez o responde `401` | La sesión venció o se cerraron las sesiones | Vuelve a iniciar sesión |
| Un guardado del Admin responde `409 STALE_SNAPSHOT` | Otro cambio (una venta, un pedido, otro guardado) modificó el estado | Es esperado: el Admin recarga y reaplica el cambio ([contrato](../../backend/docs/BFF-CONTRACT.md#administración)) |
| Los usuarios de demostración no entran tras cambiar `WEBSTORE_*_PASSWORD` | Las contraseñas solo se aplican al crear `data.json` | Trabaja con una copia nueva o [vuelve al seed](#volver-a-los-datos-del-seed) |
| `Chrome target failed` o `ECONNREFUSED 127.0.0.1:9333` en los scripts de QA | Chrome no está abierto con el puerto de depuración | Ábrelo como en [QA visual con Chrome](#qa-visual-con-chrome) |
| `npm run format:check` falla | Formato distinto del de Prettier | `npm run format` y revisa el diff |
| `npm run lint` falla por Sheriff | Una importación cruza una capa o una feature no declarada | Corrige el diseño; no desactives la regla ([`frontend/architecture.md` §2.1](../../frontend/architecture.md#21-reglas-obligatorias)) |
