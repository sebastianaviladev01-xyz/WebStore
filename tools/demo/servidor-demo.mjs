/**
 * Servidor de la demo publicada (ADR-0020). Un solo proceso y un solo origen:
 * - arranca el BFF de prueba como proceso hijo en un puerto interno y le pasa las peticiones a `/bff/` y `/health`;
 * - sirve el build de la tienda en `/` y el del Admin en `/admin/` (compilado con `--base-href /admin/`),
 *   con la vuelta a `index.html` que necesitan las rutas de Angular.
 * No es el servidor de un cliente: solo publica la demo del equipo. Sin dependencias: solo módulos de Node.
 */
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const puertoPublico = Number(process.env.PORT ?? 8080);
const puertoBff = Number(process.env.WEBSTORE_DEMO_BFF_PORT ?? 3001);

const APLICACIONES = [
  { prefijo: '/admin/', carpeta: join(raiz, 'frontend', 'dist', 'admin', 'browser') },
  { prefijo: '/', carpeta: join(raiz, 'frontend', 'dist', 'storefront', 'browser') },
];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** El BFF como proceso hijo, con el entorno de la demo. Si termina, termina también el servidor. */
const bff = spawn(process.execPath, [join(raiz, 'backend', 'src', 'main.mjs')], {
  env: { ...process.env, PORT: String(puertoBff) },
  stdio: 'inherit',
});
bff.on('exit', (codigo) => {
  console.error(`El BFF terminó (código ${codigo}); se detiene el servidor de la demo.`);
  process.exit(codigo ?? 1);
});
for (const senal of ['SIGINT', 'SIGTERM']) process.on(senal, () => bff.kill(senal));

/** Pasa la petición al BFF tal cual, con su cuerpo y sus cabeceras (cookies incluidas). */
function alBff(req, res) {
  const hacia = request(
    { host: '127.0.0.1', port: puertoBff, method: req.method, path: req.url, headers: req.headers },
    (respuesta) => {
      res.writeHead(respuesta.statusCode ?? 502, respuesta.headers);
      respuesta.pipe(res);
    },
  );
  hacia.on('error', () => {
    if (!res.headersSent) res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: { code: 'BFF_STARTING', message: 'La demo está arrancando. Inténtalo en unos segundos.' },
      }),
    );
  });
  req.pipe(hacia);
}

async function esArchivo(ruta) {
  try {
    return (await stat(ruta)).isFile();
  } catch {
    return false;
  }
}

/** Un archivo del build, o el `index.html` de la aplicación para las rutas de Angular. */
async function estatico(req, res, ruta) {
  const app = APLICACIONES.find(({ prefijo }) => ruta.startsWith(prefijo));
  const relativa = decodeURIComponent(ruta.slice(app.prefijo.length));
  const destino = normalize(join(app.carpeta, relativa));
  if (destino !== app.carpeta && !destino.startsWith(app.carpeta + sep)) {
    res.writeHead(400).end();
    return;
  }
  const archivo = relativa && (await esArchivo(destino)) ? destino : join(app.carpeta, 'index.html');
  const tipo = TIPOS[extname(archivo).toLowerCase()] ?? 'application/octet-stream';
  // Los archivos con hash del build no cambian; index.html se revalida para tomar cada versión nueva.
  const cache = archivo.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, { 'content-type': tipo, 'cache-control': cache, 'x-content-type-options': 'nosniff' });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(archivo).pipe(res);
}

createServer(async (req, res) => {
  let ruta;
  try {
    ruta = new URL(req.url ?? '/', 'http://demo').pathname;
    decodeURIComponent(ruta);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if (ruta === '/health' || ruta === '/bff' || ruta.startsWith('/bff/')) return alBff(req, res);
  if (ruta === '/admin') {
    res.writeHead(301, { location: '/admin/' }).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  await estatico(req, res, ruta);
}).listen(puertoPublico, () => {
  console.log(`Demo de WebStore en el puerto ${puertoPublico}: tienda en /, Admin en /admin/ y BFF en /bff/`);
});
