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
}

export const EXHIBITION_ANCHOR_PREFIX = 'exhibition-';

export function exhibitionAnchorId(id: number): string {
  return `${EXHIBITION_ANCHOR_PREFIX}${id}`;
}

export enum ExhibitionStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  PAST = 'PAST'
}
