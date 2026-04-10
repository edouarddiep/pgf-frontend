import { Routes } from '@angular/router';
import { AdminGuard } from '@features/admin/guards/admin.guard';
import {unsavedChangesGuard} from '@features/admin/guards/unsaved-changes.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [AdminGuard],
    loadComponent: () => import('@features/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('@features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('@features/admin/categories-admin-management/categories-admin-management.component').then(m => m.CategoriesAdminManagementComponent)
      },
      {
        path: 'categories/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/categories-admin-management/categories-admin-management.component').then(m => m.CategoriesAdminManagementComponent)
      },
      {
        path: 'categories/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/categories-admin-management/categories-admin-management.component').then(m => m.CategoriesAdminManagementComponent)
      },
      {
        path: 'artworks',
        loadComponent: () => import('@features/admin/artworks-admin-management/artworks-admin-management.component').then(m => m.ArtworksAdminManagementComponent)
      },
      {
        path: 'artworks/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/artworks-admin-management/artworks-admin-management.component').then(m => m.ArtworksAdminManagementComponent)
      },
      {
        path: 'artworks/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/artworks-admin-management/artworks-admin-management.component').then(m => m.ArtworksAdminManagementComponent)
      },
      {
        path: 'exhibitions',
        loadComponent: () => import('@features/admin/exhibitions-admin-management/exhibitions-admin-management.component').then(m => m.ExhibitionsAdminManagementComponent)
      },
      {
        path: 'exhibitions/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/exhibitions-admin-management/exhibitions-admin-management.component').then(m => m.ExhibitionsAdminManagementComponent)
      },
      {
        path: 'exhibitions/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/exhibitions-admin-management/exhibitions-admin-management.component').then(m => m.ExhibitionsAdminManagementComponent)
      },
      {
        path: 'archives',
        loadComponent: () => import('@features/admin/archives-admin-management/archives-admin-management.component').then(m => m.ArchivesAdminManagementComponent)
      },
      {
        path: 'archives/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/archives-admin-management/archives-admin-management.component').then(m => m.ArchivesAdminManagementComponent)
      },
      {
        path: 'archives/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/archives-admin-management/archives-admin-management.component').then(m => m.ArchivesAdminManagementComponent)
      },
      {
        path: 'messages',
        loadComponent: () => import('@features/admin/messages-admin-management/messages-admin-management.component').then(m => m.MessagesAdminManagementComponent)
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('@features/admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  }
];
