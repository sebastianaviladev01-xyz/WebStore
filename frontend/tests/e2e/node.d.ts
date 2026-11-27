/**
 * Las pocas APIs de Node que usan las e2e y `playwright.config.ts` (PBI-0144). Se declaran aquí en lugar de añadir
 * `@types/node` como dependencia solo para comprobar los tipos; si las e2e usan otra, se añade a este archivo.
 */
declare module 'node:fs' {
  export function rmSync(path: string, options?: { force?: boolean; recursive?: boolean }): void;
}
// Lote 43 (PBI-0265): leer el CSV que descarga «Exportar».
declare module 'node:fs/promises' {
  export function readFile(path: string, codificacion: 'utf8'): Promise<string>;
}
declare module 'node:os' {
  export function tmpdir(): string;
}
declare module 'node:path' {
  export function join(...partes: string[]): string;
}
declare const process: { readonly env: Record<string, string | undefined> };
declare const Buffer: {
  from(datos: string, codificacion?: 'base64' | 'utf8'): Uint8Array;
};
