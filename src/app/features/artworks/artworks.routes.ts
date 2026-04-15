import { Routes, UrlSegment } from '@angular/router';

function numericMatcher(segments: UrlSegment[]) {
  return segments.length === 1 && /^\d+$/.test(segments[0].path)
    ? { consumed: segments }
    : null;
}

function slugMatcher(segments: UrlSegment[]) {
  return segments.length === 1 && /^\D/.test(segments[0].path)
    ? { consumed: segments, posParams: { category: segments[0] } }
    : null;
}

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./artworks.component').then(m => m.ArtworksComponent)
  },
  {
    matcher: numericMatcher,
    loadComponent: () => import('./artwork-detail/artwork-detail.component').then(m => m.ArtworkDetailComponent)
  },
  {
    matcher: slugMatcher,
    loadComponent: () => import('./artwork-category/artwork-category.component').then(m => m.ArtworkCategoryComponent)
  }
];
