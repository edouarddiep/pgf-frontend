import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'fr-ch/artworks/:category/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'en-ch/artworks/:category/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'fr-ch/archives/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'en-ch/archives/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
