/**
 * Contraste del contador del carrusel del inicio sobre una foto (lote 10, PBI-0167). Con los controles oscuros (`imageTone: dark`; en el admin, «Controles del carrusel sobre la foto: Oscuros»),
 * los controles son una cápsula de vidrio (`--ws-ink` con una opacidad) con el texto en `--ws-surface`; como no se
 * sabe qué foto subirá el Admin, se calcula el peor caso, una foto blanca (el desenfoque de fondo no cambia un
 * blanco uniforme). La prueba lee la opacidad de `home.css` y el `--ws-ink` y el `--ws-surface` de los tres temas
 * predefinidos, y calcula la relación WCAG 2.x en Node: 4.5:1 para texto normal (1.4.3), y el contador mide 14 px.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MINIMO_TEXTO = 4.5;
const BLANCO = { r: 255, g: 255, b: 255 };

const css = await readFile(new URL('./home.css', import.meta.url), 'utf8');
const { TEMAS_PREDEFINIDOS } = await import('../../../backend/src/domain/temas/temas-predefinidos.mjs');

/** Opacidad (0 a 1) del vidrio oscuro de los controles y el token que pinta su texto, tal como están en `home.css`. */
function vidrioOscuro() {
  const fondo =
    /\.is-dark-tone \.ws-hero-controls \{\s*background:\s*color-mix\(in srgb,\s*var\(--ws-ink\)\s+([\d.]+)%,\s*transparent\);/.exec(
      css,
    );
  assert.ok(fondo, 'home.css no define el vidrio oscuro de los controles con --ws-ink');
  const texto = /\.is-dark-tone \.ws-hero-count,[^{]*\{\s*color:\s*var\((--ws-[a-z-]+)\);/.exec(css);
  assert.ok(texto, 'home.css no define el color del contador con vidrio oscuro');
  return { opacidad: Number(fondo[1]) / 100, token: texto[1] };
}

function aRgb(hex) {
  const [r, g, b] = /^#([0-9a-f]{6})$/i
    .exec(hex)[1]
    .match(/../g)
    .map((par) => parseInt(par, 16));
  return { r, g, b };
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

/** Relación del texto sobre el vidrio de `tinta` con `opacidad`, con una foto de color `foto` detrás. */
function sobreLaFoto(texto, tinta, opacidad, foto) {
  const mezcla = (x, y) => x * opacidad + y * (1 - opacidad);
  const vidrio = { r: mezcla(tinta.r, foto.r), g: mezcla(tinta.g, foto.g), b: mezcla(tinta.b, foto.b) };
  return relacion(texto, vidrio);
}

test('el cálculo da lo conocido: negro sobre blanco 21:1 y, con el vidrio del 50 %, menos de 4,5:1 en el peor caso', () => {
  assert.equal(relacion({ r: 0, g: 0, b: 0 }, BLANCO), 21);
  const conElVidrioAnterior = sobreLaFoto(BLANCO, aRgb('#1F2328'), 0.5, BLANCO);
  assert.ok(
    conElVidrioAnterior > 3.1 && conElVidrioAnterior < 3.2,
    `salió ${conElVidrioAnterior.toFixed(2)}:1`,
  );
});

test('el contador con foto oscura llega a 4,5:1 sobre una foto blanca en los temas predefinidos (PBI-0167)', () => {
  const { opacidad, token } = vidrioOscuro();
  assert.equal(
    token,
    '--ws-surface',
    'el texto de los controles sobre foto oscura debe seguir en --ws-surface',
  );
  assert.equal(TEMAS_PREDEFINIDOS.length, 3);
  for (const tema of TEMAS_PREDEFINIDOS) {
    const tinta = aRgb(tema.tokens['--ws-ink']);
    const texto = aRgb(tema.tokens[token]);
    const peorCaso = sobreLaFoto(texto, tinta, opacidad, BLANCO);
    assert.ok(
      peorCaso >= MINIMO_TEXTO,
      `Tema ${tema.id.toUpperCase()}: el contador sobre el vidrio al ${Math.round(opacidad * 100)} % con una foto blanca da ${peorCaso.toFixed(2)}:1, y el mínimo es ${MINIMO_TEXTO}:1`,
    );
  }
});

test('una foto menos clara no empeora el contraste del peor caso', () => {
  const { opacidad, token } = vidrioOscuro();
  for (const tema of TEMAS_PREDEFINIDOS) {
    const tinta = aRgb(tema.tokens['--ws-ink']);
    const texto = aRgb(tema.tokens[token]);
    const peorCaso = sobreLaFoto(texto, tinta, opacidad, BLANCO);
    for (const gris of [240, 200, 128, 0]) {
      assert.ok(
        sobreLaFoto(texto, tinta, opacidad, { r: gris, g: gris, b: gris }) >= peorCaso,
        `gris ${gris}`,
      );
    }
  }
});
