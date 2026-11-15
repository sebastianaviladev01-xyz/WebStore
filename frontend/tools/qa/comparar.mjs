// Compara píxel a píxel cada par de capturas antes/después y deja en `comparacion/` una imagen con las diferencias en
// rojo y un `resumen.md` (PBI-0057, STD-12). Uso, desde frontend/:
//   node tools/qa/comparar.mjs <carpeta> [umbral]
// `<carpeta>` es la que contiene `antes/` y `despues/` (por omisión de `capturas.mjs`: `output/visual-qa/<nombre>`).
// `umbral` es la diferencia mínima, suma de los tres canales, para contar un píxel como distinto (30 por omisión): deja
// fuera el ruido de rasterizado de las fotos y de los bordes suavizados, y no oculta un cambio de color. El resumen
// dice, por captura, el tamaño de cada toma, los píxeles distintos y la zona que ocupan; con 0, las tomas son iguales.
// Termina con código 1 si alguna captura tiene diferencias o le falta su toma.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const [carpeta, umbralTexto] = process.argv.slice(2);
if (!carpeta) throw new Error('Uso: comparar.mjs <carpeta con antes/ y despues/> [umbral]');
const raiz = resolve(carpeta);
const umbral = Number(umbralTexto ?? 30);
await mkdir(join(raiz, 'comparacion'), { recursive: true });

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const page = await navegador.newPage();
const filas = [];
let conDiferencias = 0;
const nombres = (await readdir(join(raiz, 'antes'))).filter((nombre) => nombre.endsWith('.png')).sort();
for (const nombre of nombres) {
  const antes = (await readFile(join(raiz, 'antes', nombre))).toString('base64');
  const despues = await readFile(join(raiz, 'despues', nombre)).then(
    (archivo) => archivo.toString('base64'),
    () => null,
  );
  if (despues === null) {
    filas.push(`| ${nombre} | — | falta la toma «después» | |`);
    conDiferencias++;
    continue;
  }
  const resultado = await page.evaluate(
    async ([a, b, limite]) => {
      const cargar = (origen) =>
        new Promise((listo) => {
          const imagen = new Image();
          imagen.onload = () => listo(imagen);
          imagen.src = `data:image/png;base64,${origen}`;
        });
      const [ia, ib] = await Promise.all([cargar(a), cargar(b)]);
      const ancho = Math.max(ia.width, ib.width);
      const alto = Math.max(ia.height, ib.height);
      const datos = (imagen) => {
        const lienzo = new OffscreenCanvas(ancho, alto);
        const contexto = lienzo.getContext('2d');
        contexto.drawImage(imagen, 0, 0);
        return contexto.getImageData(0, 0, ancho, alto).data;
      };
      const da = datos(ia);
      const db = datos(ib);
      const salida = new OffscreenCanvas(ancho, alto);
      const sx = salida.getContext('2d');
      sx.globalAlpha = 0.35;
      sx.drawImage(ib, 0, 0);
      sx.globalAlpha = 1;
      const marca = sx.getImageData(0, 0, ancho, alto);
      let distintos = 0;
      let [x0, y0, x1, y1] = [ancho, alto, -1, -1];
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
        if (d <= limite) continue;
        distintos++;
        const pixel = i / 4;
        const x = pixel % ancho;
        const y = Math.floor(pixel / ancho);
        [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
        marca.data.set([255, 0, 0, 255], i);
      }
      sx.putImageData(marca, 0, 0);
      const bytes = new Uint8Array(await (await salida.convertToBlob({ type: 'image/png' })).arrayBuffer());
      let binario = '';
      for (const byte of bytes) binario += String.fromCharCode(byte);
      return {
        antes: `${ia.width}x${ia.height}`,
        despues: `${ib.width}x${ib.height}`,
        distintos,
        zona: distintos ? `x ${x0}-${x1}, y ${y0}-${y1}` : '',
        png: btoa(binario),
      };
    },
    [antes, despues, umbral],
  );
  await writeFile(join(raiz, 'comparacion', nombre), Buffer.from(resultado.png, 'base64'));
  if (resultado.distintos > 0 || resultado.antes !== resultado.despues) conDiferencias++;
  filas.push(
    `| ${nombre} | ${resultado.antes} → ${resultado.despues} | ${resultado.distintos} | ${resultado.zona} |`,
  );
}
await navegador.close();

const veredicto =
  conDiferencias === 0
    ? 'Iguales: ninguna captura tiene píxeles distintos.'
    : `${conDiferencias} de ${nombres.length} capturas con diferencias.`;
const tabla = [
  `Umbral por píxel: ${umbral}. ${veredicto}`,
  '',
  '| Captura | Tamaño | Píxeles distintos | Zona |',
  '|---|---|---|---|',
  ...filas,
].join('\n');
await writeFile(join(raiz, 'comparacion', 'resumen.md'), tabla + '\n');
console.log(tabla);
process.exitCode = conDiferencias === 0 ? 0 : 1;
