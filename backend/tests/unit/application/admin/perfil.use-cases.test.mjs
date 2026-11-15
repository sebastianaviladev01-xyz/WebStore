/**
 * Perfil propio del Admin (lote 07b, ADR-0017, PBI-0034; provisional, por confirmar con Daniel): los tres roles editan
 * su nombre y su correo (único) y cambian su contraseña pidiendo la actual; al cambiarla se cierran sus demás
 * sesiones. Una ruta propia, sin pasar por el snapshot.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createAdminSesionesUseCases } from '../../../../src/application/admin/admin-sesiones.use-cases.mjs';
import { createPerfilUseCases } from '../../../../src/application/admin/perfil.use-cases.mjs';

const futuro = new Date(Date.now() + 3_600_000).toISOString();
const sesion = (id, userId, token) => ({ id, userId, tokenHash: `d:${token}`, expiresAt: futuro });

function crear() {
  const security = {
    passwordMatches: (password, credential) => credential?.hash === `h:${password}`,
    hashPassword: (password) => ({ salt: 's', hash: `h:${password}` }),
    digest: (valor) => `d:${valor}`,
    createToken: () => 'token',
    newId: () => 'id',
  };
  const store = {
    guardados: 0,
    state: {
      revision: 4,
      users: [
        { id: 'u-1', name: 'Dueña', email: 'owner@webstore.demo', role: 'superadmin', active: true },
        { id: 'u-3', name: 'Vendedor', email: 'catalogo@webstore.demo', role: 'vendedor', active: true },
      ],
      adminCredentials: [
        { userId: 'u-1', salt: 's', hash: 'h:Clave2026x' },
        { userId: 'u-3', salt: 's', hash: 'h:Venta2026x' },
      ],
      adminSessions: [
        sesion('s-1', 'u-3', 'actual'),
        sesion('s-2', 'u-3', 'otra'),
        sesion('s-3', 'u-1', 'de-la-duena'),
      ],
    },
    save() {
      this.guardados += 1;
    },
  };
  const adminSesiones = createAdminSesionesUseCases({ store, security });
  return { store, perfil: createPerfilUseCases({ store, security, adminSesiones }) };
}

const codigo = (code) => (error) => error.code === code;

test('PBI-0034: el vendedor cambia su nombre y su correo; la revisión avanza porque cambian los usuarios', () => {
  const { store, perfil } = crear();
  const { user } = perfil.actualizarDatos('actual', {
    name: '  Vendedora Uno ',
    email: ' Ventas@WebStore.demo ',
  });
  assert.deepEqual(user, {
    id: 'u-3',
    name: 'Vendedora Uno',
    email: 'ventas@webstore.demo',
    role: 'vendedor',
    active: true,
  });
  assert.equal(store.state.users[1].email, 'ventas@webstore.demo');
  assert.equal(store.state.revision, 5);
  assert.equal(store.guardados, 1);
});

test('PBI-0034: el correo no puede ser el de otro usuario ni inválido, y el nombre es obligatorio', () => {
  const { store, perfil } = crear();
  assert.throws(
    () => perfil.actualizarDatos('actual', { name: 'X', email: 'OWNER@webstore.demo' }),
    codigo('ADMIN_EMAIL_TAKEN'),
  );
  assert.throws(
    () => perfil.actualizarDatos('actual', { name: 'X', email: 'sin-arroba' }),
    codigo('INVALID_EMAIL'),
  );
  assert.throws(
    () => perfil.actualizarDatos('actual', { name: '   ', email: 'a@b.pe' }),
    codigo('VALIDATION_ERROR'),
  );
  // Su propio correo, con otras mayúsculas, no choca consigo mismo.
  assert.equal(
    perfil.actualizarDatos('actual', { name: 'X', email: 'CATALOGO@webstore.demo' }).user.name,
    'X',
  );
  assert.equal(store.state.users[0].email, 'owner@webstore.demo');
});

test('PBI-0034: sin sesión válida responde 401 antes de mirar los datos', () => {
  const { perfil } = crear();
  assert.throws(
    () => perfil.actualizarDatos('nadie', { name: 'X', email: 'x@y.pe' }),
    codigo('ADMIN_AUTHENTICATION_REQUIRED'),
  );
  assert.throws(
    () => perfil.cambiarContrasena(undefined, { currentPassword: 'a', newPassword: 'b' }),
    codigo('ADMIN_AUTHENTICATION_REQUIRED'),
  );
});

test('PBI-0034: cambiar la contraseña pide la actual y una fuerte, y cierra las demás sesiones de esa persona', () => {
  const { store, perfil } = crear();
  assert.throws(
    () => perfil.cambiarContrasena('actual', { currentPassword: 'NoEsEsta1', newPassword: 'Nueva2026x' }),
    codigo('INVALID_CURRENT_PASSWORD'),
  );
  assert.throws(
    () => perfil.cambiarContrasena('actual', { currentPassword: 'Venta2026x', newPassword: 'corta' }),
    codigo('WEAK_PASSWORD'),
  );
  assert.throws(
    () => perfil.cambiarContrasena('actual', { currentPassword: 'Venta2026x' }),
    codigo('VALIDATION_ERROR'),
  );
  assert.equal(store.state.adminSessions.length, 3, 'un intento fallido no cierra sesiones');

  perfil.cambiarContrasena('actual', { currentPassword: 'Venta2026x', newPassword: 'Nueva2026x' });
  assert.equal(store.state.adminCredentials.find((item) => item.userId === 'u-3').hash, 'h:Nueva2026x');
  assert.deepEqual(
    store.state.adminSessions.map((item) => item.id),
    ['s-1', 's-3'],
    'conserva la sesión actual y las de otras personas',
  );
});
