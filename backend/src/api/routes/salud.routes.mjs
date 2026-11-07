import { ok } from '../http.mjs';

export const saludRoutes = () => [
  { method: 'GET', path: '/health', handle: () => ok({ ok: true, service: 'webstore-mock-bff' }) },
];
