import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminService } from '@features/admin/services/admin.service';

export const adminHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const adminService = inject(AdminService);
  if (req.url.includes('/api/admin/') && adminService.isAuthenticated()) {
    const authHeader = adminService.getAuthHeader();
    if (authHeader) {
      req = req.clone({ setHeaders: { 'Authorization': authHeader } });
    }
  }
  return next(req);
};
