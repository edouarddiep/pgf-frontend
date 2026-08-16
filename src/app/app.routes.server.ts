import { RenderMode, ServerRoute } from '@angular/ssr';
import { environment } from '@environments/environment';

const LANGS = ['fr-ch', 'en-ch'] as const;

interface CategoryRef {
  slug: string;
}

interface EntityRef {
  id: number;
}

async function fetchJson<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${environment.apiUrl}${path}`);
    if (!response.ok) {
      console.warn(`[prerender] ${path} responded ${response.status}`);
      return [];
    }
    return await response.json() as T[];
  } catch (error) {
    console.warn(`[prerender] ${path} unreachable:`, error);
    return [];
  }
}

let categoriesCache: Promise<CategoryRef[]> | undefined;
let artworkParamsCache: Promise<Record<string, string>[]> | undefined;
let archivesCache: Promise<EntityRef[]> | undefined;

function getCategories(): Promise<CategoryRef[]> {
  categoriesCache ??= fetchJson<CategoryRef>('/categories');
  return categoriesCache;
}

function getArchives(): Promise<EntityRef[]> {
  archivesCache ??= fetchJson<EntityRef>('/archives');
  return archivesCache;
}

function getArtworkParams(): Promise<Record<string, string>[]> {
  artworkParamsCache ??= getCategories().then(async categories => {
    const perCategory = await Promise.all(
      categories.map(async category => {
        const artworks = await fetchJson<EntityRef>(`/artworks/category/slug/${category.slug}`);
        return artworks.map(artwork => ({ category: category.slug, id: String(artwork.id) }));
      })
    );
    return perCategory.flat();
  });
  return artworkParamsCache;
}

const localizedRoutes: ServerRoute[] = LANGS.flatMap(lang => [
  {
    path: `${lang}/artworks/:category`,
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getCategories()).map(category => ({ category: category.slug }))
  },
  {
    path: `${lang}/artworks/:category/:id`,
    renderMode: RenderMode.Prerender,
    getPrerenderParams: () => getArtworkParams()
  },
  {
    path: `${lang}/archives/:id`,
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => (await getArchives()).map(archive => ({ id: String(archive.id) }))
  }
]);

export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'secret-invite', renderMode: RenderMode.Client },
  ...localizedRoutes,
  { path: '**', renderMode: RenderMode.Prerender }
];
