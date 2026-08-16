import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { Exhibition } from '@core/models/exhibition.model';
import { Lang } from '@core/i18n/translations';

export const SITE_ORIGIN = 'https://www.pierrette-gonsethfavre.ch';
export const PERSON_ID = `${SITE_ORIGIN}/#person`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

const ARTIST_NAME = 'Pierrette Gonseth-Favre';
const ARTIST_IMAGE = 'https://bhjpavcxhymxcadesnqy.supabase.co/storage/v1/object/public/oeuvres/yaya/images/Logo_site_yaya.png';
const INSTAGRAM_URL = 'https://www.instagram.com/pierrette_gf';

const JOB_TITLE: Record<Lang, string> = {
  fr: 'Artiste peintre',
  en: 'Painter'
};

const KNOWS_ABOUT: Record<Lang, string[]> = {
  fr: ['Peinture', 'Toile de jute', 'Fil de fer', 'Collage papier', 'Sculpture', 'Techniques mixtes', 'Land art'],
  en: ['Painting', 'Burlap', 'Wire art', 'Paper collage', 'Sculpture', 'Mixed media', 'Land art']
};

const PLACE_NAMES: Record<Lang, { birth: string; home: string; country: string }> = {
  fr: { birth: 'Genève, Suisse', home: 'Founex, Vaud, Suisse', country: 'Suisse' },
  en: { birth: 'Geneva, Switzerland', home: 'Founex, Vaud, Switzerland', country: 'Switzerland' }
};

function langPath(lang: Lang, path = ''): string {
  return `${SITE_ORIGIN}/${lang}-ch${path}`;
}

export function artistSchema(lang: Lang, description: string): object {
  const places = PLACE_NAMES[lang];

  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: ARTIST_NAME,
    jobTitle: JOB_TITLE[lang],
    description,
    birthDate: '1943',
    birthPlace: { '@type': 'Place', name: places.birth },
    homeLocation: { '@type': 'Place', name: places.home },
    nationality: { '@type': 'Country', name: places.country },
    knowsAbout: KNOWS_ABOUT[lang],
    url: langPath(lang),
    image: ARTIST_IMAGE,
    sameAs: [INSTAGRAM_URL]
  };
}

/** Nœud minimal permettant aux `@id` de se résoudre sur les pages qui référencent l'artiste sans la décrire. */
export function artistRefSchema(lang: Lang): object {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: ARTIST_NAME,
    jobTitle: JOB_TITLE[lang],
    url: langPath(lang),
    sameAs: [INSTAGRAM_URL]
  };
}

export function websiteSchema(lang: Lang): object {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: ARTIST_NAME,
    url: langPath(lang),
    inLanguage: `${lang}-CH`,
    publisher: { '@id': PERSON_ID }
  };
}

export function breadcrumbSchema(items: ReadonlyArray<{ name: string; path: string }>): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_ORIGIN}${item.path}`
    }))
  };
}

export function artworkSchema(
  artwork: Artwork,
  lang: Lang,
  title: string,
  description: string,
  url: string,
  artform: string
): object {
  const images = [artwork.mainImageUrl, ...(artwork.imageUrls ?? [])].filter(Boolean);

  return {
    '@type': 'VisualArtwork',
    '@id': `${url}#artwork`,
    name: title,
    description,
    url,
    image: [...new Set(images)],
    ...(artform ? { artform } : {}),
    creator: { '@id': PERSON_ID },
    inLanguage: `${lang}-CH`
  };
}

export function collectionSchema(
  category: ArtworkCategory,
  artworks: ReadonlyArray<Artwork>,
  name: string,
  description: string,
  url: string
): object {
  return {
    '@type': 'CollectionPage',
    name,
    description,
    url,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: artworks.length,
      itemListElement: artworks.map((artwork, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${url}/${artwork.id}`
      }))
    }
  };
}

export function archiveSchema(
  archive: { id: number; year?: number; thumbnailUrl?: string },
  lang: Lang,
  title: string,
  description: string,
  url: string
): object {
  return {
    '@type': 'CreativeWork',
    '@id': `${url}#archive`,
    name: title,
    description,
    url,
    ...(archive.year ? { dateCreated: String(archive.year) } : {}),
    ...(archive.thumbnailUrl ? { image: archive.thumbnailUrl } : {}),
    creator: { '@id': PERSON_ID },
    about: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: `${lang}-CH`
  };
}

export function exhibitionSchema(exhibition: Exhibition, title: string, description: string): object {
  const location = exhibition.location || exhibition.address;

  return {
    '@type': 'ExhibitionEvent',
    name: title,
    description,
    ...(exhibition.startDate ? { startDate: exhibition.startDate } : {}),
    ...(exhibition.endDate ? { endDate: exhibition.endDate } : {}),
    ...(location ? { location: { '@type': 'Place', name: location, ...(exhibition.address ? { address: exhibition.address } : {}) } } : {}),
    ...(exhibition.imageUrl ? { image: exhibition.imageUrl } : {}),
    ...(exhibition.websiteUrl ? { url: exhibition.websiteUrl } : {}),
    performer: { '@id': PERSON_ID },
    organizer: { '@id': PERSON_ID }
  };
}
