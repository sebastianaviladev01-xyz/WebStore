import { HttpHeaders } from '@angular/common/http';

export function bearer(token: string): HttpHeaders {
  return new HttpHeaders({ authorization: `Bearer ${token}` });
}
