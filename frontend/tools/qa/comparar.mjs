// Compara píxel a píxel cada par de capturas antes/después y deja en `comparacion/` una imagen con las diferencias en
// rojo (y el ruido de antialiasado en ámbar) y un `resumen.md` (PBI-0057, STD-12). Uso, desde frontend/:
//   node tools/qa/comparar.mjs <carpeta> [umbral] [--estricto]
// `<carpeta>` es la que contiene `antes/` y `despues/` (por omisión de `capturas.mjs`: `output/visual-qa/<nombre>`).
// `umbral` es la diferencia mínima, suma de los tres canales, para contar un píxel como distinto (30 por omisión): deja
// fuera el ruido de rasterizado de las fotos y de los bordes suavizados, y no oculta un cambio de color. El resumen
// dice, por captura, el tamaño de cada toma, los píxeles distintos y la zona que ocupan; con 0, las tomas son iguales.
// Desde el lote 37 (PBI-0253), el antialiasado que cambia entre tomas del mismo código (pocos píxeles aislados, apenas
// por encima del umbral; límites en `lib/ruido.mjs`) sale aparte, en la columna «Ruido», y no cuenta como diferencia.
// `--estricto` lo cuenta como diferencia, como antes.
// Termina con código 1 si alguna captura tiene diferencias o le falta su toma.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

import { clasificarDiferencias, diferenciasPorPixel, LIMITES_DE_RUIDO } from './lib/ruido.mjs';

const argumentos = process.argv.slice(2);
const estricto = argumentos.includes('--estricto');
const [carpeta, umbralTexto] = argumentos.filter((argumento) => argumento !== '--estricto');
if (!carpeta) throw new Error('Uso: comparar.mjs <carpeta con antes/ y despues/> [umbral] [--estricto]');
const raiz = resolve(carpeta);
const umbral = Number(umbralTexto ?? 30);
const opciones = { umbral, ...LIMITES_DE_RUIDO, estricto };
await mkdir(join(raiz, 'comparacion'), { recursive: true });

const navegador = await chromium.launch({ channel: 'chrome', headless: true });
const page = await navegador.newPage();
const filas = [];
let conDiferencias = 0;
let conRuido = 0;
const nombres = (await readdir(join(raiz, 'antes'))).filter((nombre) => nombre.endsWith('.png')).sort();
const zonaEnTexto = (zona) => (zona ? `x ${zona[0]}-${zona[2]}, y ${zona[1]}-${zona[3]}` : '');
for (const nombre of nombres) {
  const antes = (await readFile(join(raiz, 'antes', nombre))).toString('base64');
  const despues = await readFile(join(raiz, 'despues', nombre)).then(
    (archivo) => archivo.toString('base64'),
    () => null,
  );
  if (despues === null) {
    filas.push(`| ${nombre} | — | falta la toma «después» | | |`);
    conDiferencias++;
    continue;
  }
  // Las funciones de `lib/ruido.mjs` se ejecutan en la página con su código fuente: no usan nada de fuera.
  const resultado = await page.evaluate(
    async ([a, b, fuenteDiferencias, fuenteClasificar, opcionesDeRuido]) => {
      const diferenciasPorPixel = new Function(`return ${fuenteDiferencias}`)();
      const clasificarDiferencias = new Function(`return ${fuenteClasificar}`)();
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
      const clasificacion = clasificarDiferencias(
        diferenciasPorPixel(datos(ia), datos(ib)),
        ancho,
        alto,
        opcionesDeRuido,
      );
      const salida = new OffscreenCanvas(ancho, alto);
      const sx = salida.getContext('2d');
      sx.globalAlpha = 0.35;
      sx.drawImage(ib, 0, 0);
      sx.globalAlpha = 1;
      const marca = sx.getImageData(0, 0, ancho, alto);
      const colores = [null, [255, 0, 0, 255], [255, 170, 0, 255]];
      clasificacion.estado.forEach((valor, pixel) => {
        if (valor) marca.data.set(colores[valor], pixel * 4);
      });
      sx.putImageData(marca, 0, 0);
      const bytes = new Uint8Array(await (await salida.convertToBlob({ type: 'image/png' })).arrayBuffer());
      let binario = '';
      for (const byte of bytes) binario += String.fromCharCode(byte);
      return {
        antes: `${ia.width}x${ia.height}`,
        despues: `${ib.width}x${ib.height}`,
        distintos: clasificacion.distintos,
        zona: clasificacion.zona,
        ruido: clasificacion.ruido,
        gruposDeRuido: clasificacion.gruposDeRuido,
        maximoDelRuido: clasificacion.maximoDelRuido,
        zonaDelRuido: clasificacion.zonaDelRuido,
        png: btoa(binario),
      };
    },
    [antes, despues, diferenciasPorPixel.toString(), clasificarDiferencias.toString(), opciones],
  );
  await writeFile(join(raiz, 'comparacion', nombre), Buffer.from(resultado.png, 'base64'));
  if (resultado.distintos > 0 || resultado.antes !== resultado.despues) conDiferencias++;
  if (resultado.ruido > 0) conRuido++;
  const ruido = resultado.ruido
    ? `${resultado.ruido} px en ${resultado.gruposDeRuido} ${resultado.gruposDeRuido === 1 ? 'grupo' : 'grupos'}, hasta ${resultado.maximoDelRuido} (${zonaEnTexto(resultado.zonaDelRuido)})`
    : '';
  filas.push(
    `| ${nombre} | ${resultado.antes} → ${resultado.despues} | ${resultado.distintos} | ${zonaEnTexto(resultado.zona)} | ${ruido} |`,
  );
}
await navegador.close();

const veredicto =
  conDiferencias === 0
    ? 'Iguales: ninguna captura tiene píxeles distintos.'
    : `${conDiferencias} de ${nombres.length} capturas con diferencias.`;
const notaDeRuido = estricto
  ? 'Modo estricto: el antialiasado cuenta como diferencia.'
  : conRuido > 0
    ? `${conRuido} con ruido de antialiasado, aparte y en ámbar en la imagen (grupos de hasta ${LIMITES_DE_RUIDO.pixelesPorGrupo} px, hasta ${umbral + LIMITES_DE_RUIDO.excesoMaximo} por píxel, ${LIMITES_DE_RUIDO.pixelesPorCaptura} px por captura como mucho): no cuenta como diferencia.`
    : 'Sin ruido de antialiasado.';
const tabla = [
  `Umbral por píxel: ${umbral}. ${veredicto} ${notaDeRuido}`,
  '',
  '| Captura | Tamaño | Píxeles distintos | Zona | Ruido |',
  '|---|---|---|---|---|',
  ...filas,
].join('\n');
await writeFile(join(raiz, 'comparacion', 'resumen.md'), tabla + '\n');
console.log(tabla);
process.exitCode = conDiferencias === 0 ? 0 : 1;
