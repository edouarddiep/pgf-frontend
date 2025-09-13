import {Routes} from '@angular/router';

export const routes: Routes = [
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
    path: 'contact',
    loadComponent: () => import('@features/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'admin',
    loadChildren: () => import('@features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
