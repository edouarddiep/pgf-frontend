import { Routes } from '@angular/router';

export const ARCHIVES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./archives.component').then(m => m.ArchivesComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('../archive-detail/archive-detail.component').then(m => m.ArchiveDetailComponent)
  }
];
