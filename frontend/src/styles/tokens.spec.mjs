/**
 * Contraste del texto sobre fotos (lote 10, PBI-0166). El texto que se pone sobre una imagen (`--ws-on-media`) va
 * bajo el velo `--ws-scrim`; como no se sabe qué foto subirá el Admin, se calcula el peor caso: una foto blanca.
 * La prueba lee los dos tokens de `tokens.css` (que la tienda y el Admin comparten) y calcula la relación WCAG 2.x
 * en Node, sin navegador: WCAG pide 4.5:1 para texto normal (1.4.3).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MINIMO_TEXTO = 4.5;
const BLANCO = { r: 255, g: 255, b: 255 };

const css = await readFile(new URL('./tokens.css', import.meta.url), 'utf8');

/** Valor declarado de un token fijo de `tokens.css`, tal como está escrito. */
function token(nombre) {
  const declaracion = new RegExp(`${nombre}:\\s*([^;]+);`).exec(css);
  assert.ok(declaracion, `tokens.css no declara ${nombre}`);
  return declaracion[1].trim();
}

/** Interpreta `#rrggbb`, `#rgb` y `rgb(r g b / a)` (la alfa, como número o como porcentaje). */
function aRgba(valor) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(valor);
  if (hex) {
    const cifras = hex[1].length === 3 ? [...hex[1]].map((c) => c + c) : hex[1].match(/../g);
    const [r, g, b] = cifras.map((par) => parseInt(par, 16));
    return { r, g, b, a: 1 };
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[/,]\s*([\d.]+)(%?))?\s*\)$/.exec(valor);
  assert.ok(rgb, `Color sin interpretar: «${valor}»`);
  const [r, g, b] = rgb.slice(1, 4).map(Number);
  const a = rgb[4] === undefined ? 1 : rgb[5] ? Number(rgb[4]) / 100 : Number(rgb[4]);
  return { r, g, b, a };
}

/** Pinta `encima` sobre `debajo` (composición alfa). */
function sobre(encima, debajo) {
  const mezcla = (x, y) => x * encima.a + y * (1 - encima.a);
  return { r: mezcla(encima.r, debajo.r), g: mezcla(encima.g, debajo.g), b: mezcla(encima.b, debajo.b) };
}

function luminancia({ r, g, b }) {
  const canal = (valor) => {
    const s = valor / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function relacion(a, b) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Relación del texto `texto` sobre una foto de color `foto` bajo el velo `velo`. */
const sobreLaFoto = (texto, velo, foto) => relacion(texto, sobre(velo, foto));

test('el cálculo da lo conocido: negro sobre blanco 21:1 y, con el velo del 45 %, 3,4:1 en el peor caso', () => {
  assert.equal(relacion({ r: 0, g: 0, b: 0 }, BLANCO), 21);
  const conElVeloAnterior = sobreLaFoto(BLANCO, { r: 0, g: 0, b: 0, a: 0.45 }, BLANCO);
  assert.ok(conElVeloAnterior > 3.3 && conElVeloAnterior < 3.5, `salió ${conElVeloAnterior.toFixed(2)}:1`);
});

test('el texto sobre fotos llega a 4,5:1 sobre una foto blanca bajo el velo (PBI-0166)', () => {
  const texto = aRgba(token('--ws-on-media'));
  const velo = aRgba(token('--ws-scrim'));
  assert.equal(texto.a, 1, '--ws-on-media debe ser opaco');
  const peorCaso = sobreLaFoto(texto, velo, BLANCO);
  assert.ok(
    peorCaso >= MINIMO_TEXTO,
    `--ws-on-media sobre --ws-scrim con una foto blanca: ${peorCaso.toFixed(2)}:1, y el mínimo es ${MINIMO_TEXTO}:1`,
  );
});

test('una foto menos clara no empeora el contraste del peor caso', () => {
  const texto = aRgba(token('--ws-on-media'));
  const velo = aRgba(token('--ws-scrim'));
  const peorCaso = sobreLaFoto(texto, velo, BLANCO);
  for (const gris of [240, 200, 128, 0]) {
    const foto = { r: gris, g: gris, b: gris };
    assert.ok(sobreLaFoto(texto, velo, foto) >= peorCaso, `foto de gris ${gris}`);
  }
});
