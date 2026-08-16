import { Routes } from '@angular/router';

const localizedRoutes = (): Routes => [
  {
    path: '',
    loadComponent: () => import('@features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('@features/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'artworks',
    loadChildren: () => import('@features/artworks/artworks.routes').then(m => m.routes)
  },
  {
    path: 'exhibitions',
    loadComponent: () => import('@features/exhibitions/exhibitions.component').then(m => m.ExhibitionsComponent)
  },
  {
    path: 'archives',
    loadChildren: () => import('@features/archives/archives.routes').then(m => m.ARCHIVES_ROUTES)
  },
  {
    path: 'contact',
    loadComponent: () => import('@features/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'legal',
    loadComponent: () => import('@features/legal/legal.component').then(m => m.LegalComponent)
  },
  {
    path: 'terms',
    loadComponent: () => import('@features/terms/terms.component').then(m => m.TermsComponent)
  },
  {
    path: 'privacy',
    loadComponent: () => import('@features/privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    path: 'association',
    loadComponent: () => import('@features/association/association.component').then(m => m.AssociationComponent)
  }
];

export const routes: Routes = [
  { path: '', redirectTo: 'fr-ch', pathMatch: 'full' },
  { path: 'fr-ch', children: localizedRoutes() },
  { path: 'en-ch', children: localizedRoutes() },
  {
    path: 'admin',
    loadChildren: () => import('@features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: 'secret-invite',
    loadComponent: () => import('@features/admin/admin-invite/admin-invite.component').then(m => m.AdminInviteComponent)
  },
  {
    path: '404',
    loadComponent: () => import('@features/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  {
    path: '**',
    loadComponent: () => import('@features/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
