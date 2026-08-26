import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { AdminService } from '@features/admin/services/admin.service';

export const adminHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const adminService = inject(AdminService);
  if (!req.url.includes('/api/admin/')) {
    return next(req);
  }

  // Le jeton est résolu avant l'envoi : s'il a expiré, la requête attend son
  // renouvellement au lieu de partir sans en-tête et de revenir en 401.
  return adminService.authHeader().pipe(
    switchMap(authHeader => next(authHeader ? req.clone({ setHeaders: { Authorization: authHeader } }) : req))
  );
};
