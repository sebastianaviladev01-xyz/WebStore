import { DomainError } from '../../domain/comun/domain-error.mjs';
import { limaDate } from '../../domain/comun/reloj.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { requireEmail, requireFields } from '../../domain/comun/validacion.rules.mjs';
import {
  addPeruBusinessDays,
  COMPLAINT_DUE_BUSINESS_DAYS,
  COMPLAINT_TYPES,
  nextComplaintCode,
  requireComplaintAmount,
} from '../../domain/reclamos/reclamo.rules.mjs';

/**
 * Libro de reclamaciones: registro con código correlativo por año de Lima y plazo de respuesta en días hábiles.
 * `now` permite fijar el instante en las pruebas.
 */
export function createReclamosUseCases({ store, nonWorkingDates, now = () => new Date() }) {
  function register(command) {
    requireFields(command, [
      'name',
      'document',
      'email',
      'phone',
      'address',
      'subject',
      'type',
      'detail',
      'request',
    ]);
    const email = requireEmail(command.email);
    if (!COMPLAINT_TYPES.includes(command.type))
      throw new DomainError('validation', 'INVALID_COMPLAINT_TYPE', 'Selecciona reclamo o queja.');
    const amount = requireComplaintAmount(command.amount);
    const { state } = store;
    const instant = now();
    const createdAt = instant.toISOString();
    const year = limaDate(instant).slice(0, 4);
    const complaint = {
      id: nextComplaintCode(
        state.complaints.map((item) => item.id),
        year,
      ),
      name: String(command.name).trim(),
      document: String(command.document).trim(),
      email,
      phone: String(command.phone).trim(),
      address: String(command.address).trim(),
      subject: String(command.subject).trim(),
      amount,
      type: command.type,
      detail: String(command.detail).trim(),
      request: String(command.request).trim(),
      status: 'received',
      providerResponse: '',
      createdAt,
      updatedAt: createdAt,
      dueAt: addPeruBusinessDays(createdAt, COMPLAINT_DUE_BUSINESS_DAYS, nonWorkingDates),
    };
    state.complaints.unshift(complaint);
    bumpRevision(state);
    store.save();
    return complaint;
  }

  return { register };
}
