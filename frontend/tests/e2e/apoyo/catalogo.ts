import { expect, request as nuevoRequest } from '@playwright/test';

import { cuentasAdmin, urls } from './entorno';

/**
 * Apoyo de las e2e del catálogo del Admin (feature 008, `admin-catalogo-filtros.spec.ts`). Hace de «otra sesión»:
 * crea, cambia y retira productos, categorías y marcas por la API del Admin (`GET` y `PUT /bff/admin/snapshot`) con la cuenta de
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
 * Reemplaza una colección del snapshot del BFF por lo que devuelve `cambio` a partir de la actual. Si otra escritura
 * cambió la revisión entre la lectura y el guardado (`409 STALE_SNAPSHOT`), vuelve a leer y lo intenta otra vez.
 */
async function cambiarColeccion<T>(
  clave: 'products' | 'categories' | 'brands',
  cambio: (actuales: T[]) => T[],
): Promise<void> {
  await conAdmin(async (api, headers) => {
    for (let intento = 1; intento <= 3; intento++) {
      const lectura = await api.get('/bff/admin/snapshot', { headers });
      expect(lectura.ok()).toBe(true);
      const snapshot = await lectura.json();
      const guardado = await api.put('/bff/admin/snapshot', {
        headers,
        data: { revision: snapshot.revision, [clave]: cambio(snapshot[clave] as T[]) },
      });
      if (guardado.ok()) return;
      if (guardado.status() !== 409 || intento === 3) {
        throw new Error(`PUT /bff/admin/snapshot: ${guardado.status()} ${await guardado.text()}`);
      }
    }
  });
}

/** Reemplaza los productos del BFF por los que devuelve `cambio` a partir de los actuales. */
export const cambiarProductos = (cambio: (actuales: ProductoApi[]) => ProductoApi[]) =>
  cambiarColeccion('products', cambio);

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

/** Una categoría tal como la guarda el BFF. */
export interface CategoriaApi {
  id: string;
  name: string;
  parentId?: string;
  order?: number;
}

/** Categorías del BFF en este momento. */
export async function leerCategorias(): Promise<CategoriaApi[]> {
  return conAdmin(async (api, headers) => {
    const respuesta = await api.get('/bff/admin/snapshot', { headers });
    expect(respuesta.ok()).toBe(true);
    return (await respuesta.json()).categories as CategoriaApi[];
  });
}

/** Reemplaza las categorías del BFF por las que devuelve `cambio` a partir de las actuales. */
export const cambiarCategorias = (cambio: (actuales: CategoriaApi[]) => CategoriaApi[]) =>
  cambiarColeccion('categories', cambio);

/** Añade categorías al final de la lista (el BFF exige que su padre exista). */
export const agregarCategorias = (nuevas: readonly CategoriaApi[]) =>
  cambiarCategorias((actuales) => [...actuales, ...nuevas]);

/** Retira las categorías con esos ids, si existen. */
export const retirarCategorias = (ids: readonly string[]) =>
  cambiarCategorias((actuales) => actuales.filter((categoria) => !ids.includes(categoria.id)));

/** Una marca tal como la guarda el BFF. */
export interface MarcaApi {
  id: string;
  name: string;
  active: boolean;
}

/** Marcas del BFF en este momento. */
export async function leerMarcas(): Promise<MarcaApi[]> {
  return conAdmin(async (api, headers) => {
    const respuesta = await api.get('/bff/admin/snapshot', { headers });
    expect(respuesta.ok()).toBe(true);
    return (await respuesta.json()).brands as MarcaApi[];
  });
}

/** Reemplaza las marcas del BFF por las que devuelve `cambio` a partir de las actuales. */
export const cambiarMarcas = (cambio: (actuales: MarcaApi[]) => MarcaApi[]) =>
  cambiarColeccion('brands', cambio);

/** Lo que las e2e del lote 06 leen del snapshot del Admin. */
export interface SnapshotApi {
  revision: number;
  orders: { id: string; status: string }[];
  customers: { email: string }[];
  banners: { id: string; ctaUrl: string; cta: string }[];
  config: Record<string, unknown>;
  /** Lote 07: usuarios del Admin, para dejar como estaban los que crea una prueba. */
  users: { id: string; email: string; role: string; active: boolean }[];
}

/** Snapshot del Admin en este momento (lote 06). */
export async function leerSnapshot(): Promise<SnapshotApi> {
  return conAdmin(async (api, headers) => {
    const respuesta = await api.get('/bff/admin/snapshot', { headers });
    expect(respuesta.ok()).toBe(true);
    return respuesta.json();
  });
}

/**
 * Envía cambios al snapshot como «otra sesión», con la forma `{ upsert, remove }` del lote 06 (por ejemplo,
 * `{ banners: { upsert: [{ id: 'bn-4', ctaUrl: '…' }] } }`). Ante `409 STALE_SNAPSHOT` vuelve a leer la revisión.
 */
export async function enviarCambios(cambios: Record<string, unknown>): Promise<void> {
  await conAdmin(async (api, headers) => {
    for (let intento = 1; intento <= 3; intento++) {
      const { revision } = await (await api.get('/bff/admin/snapshot', { headers })).json();
      const guardado = await api.put('/bff/admin/snapshot', { headers, data: { revision, ...cambios } });
      if (guardado.ok()) return;
      if (guardado.status() !== 409 || intento === 3)
        throw new Error(`PUT /bff/admin/snapshot: ${guardado.status()} ${await guardado.text()}`);
    }
  });
}
