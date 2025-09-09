import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./artworks.component').then(m => m.ArtworksComponent)
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./artwork-detail/artwork-detail.component').then(m => m.ArtworkDetailComponent)
  },
  {
    path: ':category',
    loadComponent: () => import('./artwork-category/artwork-category.component').then(m => m.ArtworkCategoryComponent)
  }
];
