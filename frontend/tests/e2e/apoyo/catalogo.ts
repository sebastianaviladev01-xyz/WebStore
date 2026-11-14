import { expect, request as nuevoRequest } from '@playwright/test';

import { cuentasAdmin, urls } from './entorno';

/**
 * Apoyo de las e2e del catálogo del Admin (feature 008, `admin-catalogo-filtros.spec.ts`). Hace de «otra sesión»:
 * crea, cambia y retira productos por la API del Admin (`GET` y `PUT /bff/admin/snapshot`) con la cuenta de
 * superadministrador, como `conApi` de `contraste.ts`. Las pruebas que la usan dejan el estado como estaba en un
 * `finally`: las suites van en serie y otras cuentan los seis productos del seed.
 */

/** Un producto tal como lo guarda el BFF. */
export interface ProductoApi {
  id: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  brandId: string;
  categoryId: string;
  price: number;
  stock: number;
  active: boolean;
  highlights: string[];
  gallery: string[];
}

type Api = Awaited<ReturnType<typeof nuevoRequest.newContext>>;

async function conAdmin<T>(accion: (api: Api, headers: Record<string, string>) => Promise<T>): Promise<T> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const sesion = await api.post('/bff/admin/sessions', {
      data: { email: cuentasAdmin.superadmin.email, password: cuentasAdmin.superadmin.password },
    });
    expect(sesion.ok()).toBe(true);
    return await accion(api, { authorization: `Bearer ${(await sesion.json()).token}` });
  } finally {
    await api.dispose();
  }
}

/** Productos del BFF en este momento. */
export async function leerProductos(): Promise<ProductoApi[]> {
  return conAdmin(async (api, headers) => {
    const respuesta = await api.get('/bff/admin/snapshot', { headers });
    expect(respuesta.ok()).toBe(true);
    return (await respuesta.json()).products as ProductoApi[];
  });
}

/**
 * Reemplaza los productos del BFF por los que devuelve `cambio` a partir de los actuales. Si otra escritura cambió
 * la revisión entre la lectura y el guardado (`409 STALE_SNAPSHOT`), vuelve a leer y lo intenta otra vez.
 */
export async function cambiarProductos(cambio: (actuales: ProductoApi[]) => ProductoApi[]): Promise<void> {
  await conAdmin(async (api, headers) => {
    for (let intento = 1; intento <= 3; intento++) {
      const lectura = await api.get('/bff/admin/snapshot', { headers });
      expect(lectura.ok()).toBe(true);
      const { revision, products } = await lectura.json();
      const guardado = await api.put('/bff/admin/snapshot', {
        headers,
        data: { revision, products: cambio(products as ProductoApi[]) },
      });
      if (guardado.ok()) return;
      if (guardado.status() !== 409 || intento === 3) {
        throw new Error(`PUT /bff/admin/snapshot: ${guardado.status()} ${await guardado.text()}`);
      }
    }
  });
}

/** Añade productos al final del catálogo. */
export const agregarProductos = (nuevos: readonly ProductoApi[]) =>
  cambiarProductos((actuales) => [...actuales, ...nuevos]);

/** Retira los productos con esos ids, si existen. */
export const retirarProductos = (ids: readonly string[]) =>
  cambiarProductos((actuales) => actuales.filter((producto) => !ids.includes(producto.id)));

/** Cambia los campos indicados de un producto existente. */
export const actualizarProducto = (id: string, campos: Partial<ProductoApi>) =>
  cambiarProductos((actuales) =>
    actuales.map((producto) => (producto.id === id ? { ...producto, ...campos } : producto)),
  );

/** Un producto válido para el BFF, de «TV y audio» y «Nova», con los campos que se indiquen. */
export function productoDePrueba(
  campos: Pick<ProductoApi, 'id' | 'sku' | 'name'> & Partial<ProductoApi>,
): ProductoApi {
  return {
    description: 'Producto de una prueba e2e.',
    imageUrl: 'assets/products/tv-studio.jpg',
    thumbnailUrl: 'assets/products/tv-studio-480.jpg',
    brandId: 'b-nova',
    categoryId: 'cat-tv',
    price: 199,
    stock: 3,
    active: true,
    highlights: ['Característica de prueba'],
    gallery: [],
    ...campos,
  };
}
