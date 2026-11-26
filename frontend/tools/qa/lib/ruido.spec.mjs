/**
 * Clasificación de las diferencias de `comparar.mjs` (lote 37, PBI-0253, ADR-0031): el antialiasado que cambia entre dos
 * tomas del mismo código (unos pocos píxeles aislados, apenas por encima del umbral) sale aparte, como ruido, y no
 * cuenta como diferencia. Un cambio real pequeño sigue siendo una diferencia: es la tolerancia que no debe esconderlo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clasificarDiferencias,
  diferenciasPorPixel,
  LIMITES_DE_RUIDO,
  UMBRAL_POR_OMISION,
} from './ruido.mjs';

const UMBRAL = 30;

/** Imagen RGBA de `ancho`×`alto` de un solo color, con `pintar(x, y, color)` para dibujar encima. */
function imagen(ancho, alto, [r, g, b] = [255, 255, 255]) {
  const datos = new Uint8ClampedArray(ancho * alto * 4);
  for (let i = 0; i < datos.length; i += 4) datos.set([r, g, b, 255], i);
  const pintar = (x, y, color) => datos.set([...color, 255], (y * ancho + x) * 4);
  const rectangulo = (x0, y0, w, h, color) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pintar(x, y, color);
  };
  return { ancho, alto, datos, pintar, rectangulo };
}

const clasificar = (a, b, opciones = {}) =>
  clasificarDiferencias(diferenciasPorPixel(a.datos, b.datos), a.ancho, a.alto, {
    umbral: UMBRAL,
    ...LIMITES_DE_RUIDO,
    ...opciones,
  });

/** Dos botones con las cuatro esquinas redondeadas, como «Ver electrohogar» y «Ver monitores» del inicio a 1440 px. */
function botonesConEsquinas(desplazamientoDelAntialiasado) {
  const lienzo = imagen(400, 120);
  for (const x0 of [40, 220]) {
    lienzo.rectangulo(x0, 40, 140, 40, [31, 35, 40]);
    // Cada esquina: dos píxeles de borde suavizado, cuyo gris cambia entre tomas (33 con un desplazamiento de 11), y
    // por dentro, dos que cambian menos (18), como en las tomas medidas.
    const gris = 180 + desplazamientoDelAntialiasado;
    const interior = 100 + Math.round((desplazamientoDelAntialiasado * 6) / 11);
    for (const [x, y, dentro] of [
      [x0, 40, 1],
      [x0 + 1, 40, 1],
      [x0 + 139, 40, 1],
      [x0 + 138, 40, 1],
      [x0, 79, -1],
      [x0 + 1, 79, -1],
      [x0 + 139, 79, -1],
      [x0 + 138, 79, -1],
    ]) {
      lienzo.pintar(x, y, [gris, gris, gris]);
      lienzo.pintar(x, y + dentro, [interior, interior, interior]);
    }
  }
  return lienzo;
}

test('PBI-0253: las diferencias por debajo del umbral no cuentan, como hasta ahora', () => {
  const a = imagen(50, 50);
  const b = imagen(50, 50, [245, 245, 245]);
  const resultado = clasificar(a, b);
  assert.equal(resultado.distintos, 0);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0253: el antialiasado de las esquinas de dos botones (16 píxeles, 33 frente a 30) es ruido, no diferencia', () => {
  const resultado = clasificar(botonesConEsquinas(0), botonesConEsquinas(11));
  assert.equal(resultado.distintos, 0);
  assert.equal(resultado.ruido, 16);
  assert.equal(resultado.gruposDeRuido, 8);
  assert.equal(resultado.maximoDelRuido, 33);
  assert.deepEqual(resultado.zonaDelRuido, [40, 40, 359, 79]);
  assert.equal(resultado.estado.filter((valor) => valor === 2).length, 16);
});

test('PBI-0253: un píxel aislado con una diferencia grande no es antialiasado: es diferencia', () => {
  const a = imagen(60, 60);
  const b = imagen(60, 60);
  b.pintar(30, 30, [200, 30, 30]);
  const resultado = clasificar(a, b);
  assert.equal(resultado.distintos, 1);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0253: un borde de 1 px que cambia de color en una línea entera es diferencia, aunque el cambio sea sutil', () => {
  const a = imagen(400, 60);
  const b = imagen(400, 60);
  a.rectangulo(20, 30, 300, 1, [200, 200, 200]);
  b.rectangulo(20, 30, 300, 1, [189, 189, 189]);
  const resultado = clasificar(a, b);
  assert.equal(resultado.distintos, 300);
  assert.equal(resultado.ruido, 0);
  assert.deepEqual(resultado.zona, [20, 30, 319, 30]);
});

test('PBI-0253: un texto que cambia es diferencia', () => {
  // «1» frente a «7» en una cifra de 6×10 px: el trazo vertical se mueve y aparece una barra arriba.
  const a = imagen(80, 40);
  const b = imagen(80, 40);
  a.rectangulo(20, 10, 2, 10, [20, 20, 20]);
  b.rectangulo(16, 10, 6, 2, [20, 20, 20]);
  b.rectangulo(19, 12, 2, 8, [20, 20, 20]);
  const resultado = clasificar(a, b);
  assert.ok(resultado.distintos > 0, `distintos: ${resultado.distintos}`);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0253: un ícono que se mueve unos píxeles es diferencia', () => {
  const icono = (x0) => {
    const lienzo = imagen(80, 40);
    lienzo.rectangulo(x0, 12, 12, 12, [120, 120, 120]);
    lienzo.rectangulo(x0 + 2, 14, 8, 8, [255, 255, 255]);
    return lienzo;
  };
  const resultado = clasificar(icono(30), icono(32));
  assert.ok(resultado.distintos >= 24, `distintos: ${resultado.distintos}`);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0253: un cambio de color sutil en un área grande es diferencia', () => {
  const a = imagen(200, 100);
  const b = imagen(200, 100);
  a.rectangulo(10, 10, 120, 60, [37, 99, 235]);
  // 35 de diferencia, apenas por encima del umbral, como el ruido de las esquinas: lo que cuenta es el área.
  b.rectangulo(10, 10, 120, 60, [48, 110, 222]);
  const resultado = clasificar(a, b);
  assert.equal(resultado.distintos, 120 * 60);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0253: un color sutil en un área, con solo unos píxeles sueltos por encima del umbral, es diferencia', () => {
  // Caso real del lote 37: el botón secundario de la ficha un 9 % más claro. Casi todo el botón cambia 25–30, por debajo
  // del umbral, y solo unos píxeles sueltos lo pasan (hasta 38): sueltos parecen esquinas, pero su entorno cambia entero.
  const a = imagen(200, 100);
  const b = imagen(200, 100);
  a.rectangulo(20, 20, 60, 30, [194, 65, 12]);
  b.rectangulo(20, 20, 60, 30, [203, 74, 22]);
  const sueltos = [
    [25, 25],
    [40, 30],
    [55, 44],
    [70, 22],
  ];
  for (const [x, y] of sueltos) b.pintar(x, y, [207, 77, 24]);
  const resultado = clasificar(a, b);
  assert.equal(resultado.distintos, sueltos.length);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0253: muchos píxeles sueltos en una captura no son ruido de antialiasado: todos cuentan como diferencia', () => {
  // Un degradado que cambia apenas deja píxeles sueltos por encima del umbral en toda el área.
  const a = imagen(400, 400);
  const b = imagen(400, 400);
  let sueltos = 0;
  for (let y = 5; y < 400; y += 10) {
    for (let x = 5; x < 400; x += 10) {
      b.pintar(x, y, [244, 244, 244]);
      sueltos++;
    }
  }
  assert.ok(sueltos > LIMITES_DE_RUIDO.pixelesPorCaptura);
  const resultado = clasificar(a, b);
  assert.equal(resultado.distintos, sueltos);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0253: en modo estricto, sin límites de ruido, el antialiasado vuelve a contar como diferencia', () => {
  const resultado = clasificar(botonesConEsquinas(0), botonesConEsquinas(11), { estricto: true });
  assert.equal(resultado.distintos, 16);
  assert.equal(resultado.ruido, 0);
});

/**
 * PBI-0260 (lote 41): el umbral por omisión se queda en 30. Con tomas repetidas del mismo código, 24 ya da falsos
 * positivos con la máquina cargada (la foto de la ficha con C) y 20, también con la máquina libre. Estas pruebas fijan
 * los dos lados de la decisión: si alguien cambia el umbral, tiene que volver a medir.
 */
test('PBI-0260: el umbral por omisión es 30', () => {
  assert.equal(UMBRAL_POR_OMISION, 30);
});

/** Una foto (gris uniforme) con píxeles sueltos que cambian entre tomas con la máquina cargada, como la de la ficha. */
function fotoConPixelesSueltos(cambiada) {
  const foto = imagen(240, 160, [128, 128, 128]);
  if (!cambiada) return foto;
  // Tres píxeles que cambian 35 (12 + 12 + 11) y cinco que cambian 26 (9 + 9 + 8), cada uno con su entorno igual.
  for (const [x, y] of [
    [20, 20],
    [120, 60],
    [200, 140],
  ]) {
    foto.pintar(x, y, [140, 140, 139]);
  }
  for (const [x, y] of [
    [40, 100],
    [80, 30],
    [150, 120],
    [180, 40],
    [220, 90],
  ]) {
    foto.pintar(x, y, [137, 137, 136]);
  }
  return foto;
}

test('PBI-0260: con el umbral de 30, los píxeles sueltos de una foto con la máquina cargada son ruido, no diferencia', () => {
  const resultado = clasificar(fotoConPixelesSueltos(false), fotoConPixelesSueltos(true), {
    umbral: UMBRAL_POR_OMISION,
  });
  assert.equal(resultado.distintos, 0);
  assert.equal(resultado.ruido, 3);
  assert.equal(resultado.maximoDelRuido, 35);
});

test('PBI-0260: con un umbral de 24, la misma foto daría un falso positivo: por eso no se baja', () => {
  const resultado = clasificar(fotoConPixelesSueltos(false), fotoConPixelesSueltos(true), { umbral: 24 });
  // Los de 35 pasan el umbral en 11, más que `excesoMaximo`: ya no parecen antialiasado.
  assert.equal(resultado.distintos, 3);
});

test('PBI-0260: límite conocido del umbral de 30: un borde de 1 px que cambia 22 en total no sale como diferencia', () => {
  const a = imagen(400, 60);
  const b = imagen(400, 60);
  a.rectangulo(20, 30, 300, 1, [221, 227, 236]);
  b.rectangulo(20, 30, 300, 1, [214, 220, 228]);
  const resultado = clasificar(a, b, { umbral: UMBRAL_POR_OMISION });
  assert.equal(resultado.distintos, 0);
  assert.equal(resultado.ruido, 0);
});

test('PBI-0260: límite conocido del umbral de 30: un botón que cambia 21 en total (unos 7 % más claro) no sale', () => {
  const a = imagen(200, 100);
  const b = imagen(200, 100);
  a.rectangulo(20, 20, 168, 46, [29, 78, 216]);
  b.rectangulo(20, 20, 168, 46, [36, 85, 223]);
  const resultado = clasificar(a, b, { umbral: UMBRAL_POR_OMISION });
  assert.equal(resultado.distintos, 0);
  assert.equal(resultado.ruido, 0);
});
