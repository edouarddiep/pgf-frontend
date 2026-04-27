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
        loadComponent: () => import('@features/admin/categories-admin-list/categories-admin-list.component').then(m => m.CategoriesAdminListComponent)
      },
      {
        path: 'categories/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/categories-admin-form/categories-admin-form.component').then(m => m.CategoriesAdminFormComponent)
      },
      {
        path: 'categories/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/categories-admin-form/categories-admin-form.component').then(m => m.CategoriesAdminFormComponent)
      },
      {
        path: 'artworks',
        loadComponent: () => import('@features/admin/artworks-admin-list/artworks-admin-list.component').then(m => m.ArtworksAdminListComponent)
      },
      {
        path: 'artworks/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/artworks-admin-form/artworks-admin-form.component').then(m => m.ArtworksAdminFormComponent)
      },
      {
        path: 'artworks/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/artworks-admin-form/artworks-admin-form.component').then(m => m.ArtworksAdminFormComponent)
      },
      {
        path: 'exhibitions',
        loadComponent: () => import('@features/admin/exhibitions-admin-list/exhibitions-admin-list.component').then(m => m.ExhibitionsAdminListComponent)
      },
      {
        path: 'exhibitions/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/exhibitions-admin-form/exhibitions-admin-form.component').then(m => m.ExhibitionsAdminFormComponent)
      },
      {
        path: 'exhibitions/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/exhibitions-admin-form/exhibitions-admin-form.component').then(m => m.ExhibitionsAdminFormComponent)
      },
      {
        path: 'archives',
        loadComponent: () => import('@features/admin/archives-admin-list/archives-admin-list.component').then(m => m.ArchivesAdminListComponent)
      },
      {
        path: 'archives/create',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/archives-admin-form/archives-admin-form.component').then(m => m.ArchivesAdminFormComponent)
      },
      {
        path: 'archives/:id/edit',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () => import('@features/admin/archives-admin-form/archives-admin-form.component').then(m => m.ArchivesAdminFormComponent)
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
  },
  {
    path: 'register',
    loadComponent: () => import('./admin-register/admin-register.component').then(m => m.AdminRegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./admin-forgot-password/admin-forgot-password.component').then(m => m.AdminForgotPasswordComponent)
  },
];
