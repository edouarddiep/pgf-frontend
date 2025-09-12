import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {AdminService} from '@features/admin/services/admin.service';

export const AdminGuard: CanActivateFn = () => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  if (adminService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/admin/login']);
  return false;
};
