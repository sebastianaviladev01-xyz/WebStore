/**
 * Ingreso al Admin (PBI-0100, lote 01, ADR-0017): tarda lo mismo exista o no el correo, porque la contraseña se
 * compara siempre (contra una credencial ficticia si el usuario no existe o está inactivo).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createAdminSesionesUseCases } from '../../../../src/application/admin/admin-sesiones.use-cases.mjs';

function crear() {
  const security = {
    comparaciones: 0,
    passwordMatches(password, credential) {
      this.comparaciones += 1;
      return Boolean(credential?.hash) && credential.hash === `h:${password}`;
    },
    digest: (valor) => `d:${valor}`,
    createToken: () => 'token',
    newId: () => 'id',
  };
  const store = {
    state: {
      users: [
        { id: 'u-1', email: 'owner@webstore.demo', role: 'superadmin', active: true },
        { id: 'u-2', email: 'baja@webstore.demo', role: 'admin', active: false },
      ],
      adminCredentials: [
        { userId: 'u-1', salt: 's', hash: 'h:Clave2026x' },
        { userId: 'u-2', salt: 's', hash: 'h:Clave2026x' },
      ],
      adminSessions: [],
    },
    save() {},
  };
  return { security, sesiones: createAdminSesionesUseCases({ store, security }) };
}

for (const [nombre, email] of [
  ['un correo que no existe', 'nadie@webstore.demo'],
  ['un usuario inactivo', 'baja@webstore.demo'],
])
  test(`con ${nombre}, la contraseña se compara igual y responde INVALID_ADMIN_CREDENTIALS`, () => {
    const { security, sesiones } = crear();
    assert.throws(() => sesiones.signIn({ email, password: 'Clave2026x' }), {
      code: 'INVALID_ADMIN_CREDENTIALS',
    });
    assert.equal(security.comparaciones, 1);
  });

test('con el correo y la contraseña correctos, abre la sesión', () => {
  const { security, sesiones } = crear();
  assert.equal(sesiones.signIn({ email: 'owner@webstore.demo', password: 'Clave2026x' }).token, 'token');
  assert.equal(security.comparaciones, 1);
});
