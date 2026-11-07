import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { requireEmail, requireFields } from '../../domain/comun/validacion.rules.mjs';
import {
  addPeruBusinessDays,
  COMPLAINT_DUE_BUSINESS_DAYS,
  COMPLAINT_TYPES,
} from '../../domain/reclamos/reclamo.rules.mjs';

/** Libro de reclamaciones: registro con código correlativo y plazo de respuesta en días hábiles. */
export function createReclamosUseCases({ store, nonWorkingDates }) {
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
    const { state } = store;
    const createdAt = nowIso();
    const complaint = {
      id: `REC-${new Date().getFullYear()}-${String(state.complaints.length + 1).padStart(5, '0')}`,
      name: String(command.name).trim(),
      document: String(command.document).trim(),
      email,
      phone: String(command.phone).trim(),
      address: String(command.address).trim(),
      subject: String(command.subject).trim(),
      amount: Number(command.amount ?? 0),
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
