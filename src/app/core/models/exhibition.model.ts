export type ExhibitionMediaType = 'PHOTO' | 'VIDEO' | 'AUDIO' | 'PRESS_ARTICLE' | 'INTERVIEW' | 'DOCUMENT' | 'OTHER';

export type ExhibitionFileType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'DOCUMENT' | 'LINK';

export interface ExhibitionFile {
  id?: number;
  mediaType: ExhibitionMediaType;
  fileType?: ExhibitionFileType;
  fileUrl: string;
  fileSrcset?: string;
  thumbnailUrl?: string;
  thumbnailSrcset?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  title?: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  source?: string;
  publishedOn?: string;
  displayOrder?: number;
}

export interface Exhibition {
  id: number;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  credits?: string;
  vernissageUrl?: string;
  websiteUrl?: string;
  location?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  status?: ExhibitionStatus;
  imageUrl?: string;
  imageSrcset?: string;
  imageUrls?: string[];
  imageSrcsets?: string[];
  videoUrls?: string[];
  files?: ExhibitionFile[];
}

// Ordre de lecture des médias : ce qui complète l'exposition (presse, paroles)
// avant ce qui la rejoue (vidéos, photos), les pièces jointes en dernier.
export const EXHIBITION_MEDIA_TYPES: readonly ExhibitionMediaType[] =
  ['PRESS_ARTICLE', 'INTERVIEW', 'VIDEO', 'AUDIO', 'PHOTO', 'DOCUMENT', 'OTHER'];

export const EXHIBITION_ANCHOR_PREFIX = 'exhibition-';

export function exhibitionAnchorId(id: number): string {
  return `${EXHIBITION_ANCHOR_PREFIX}${id}`;
}

export enum ExhibitionStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  PAST = 'PAST'
}
