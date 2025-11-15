export interface Exhibition {
  id: number;
  title: string;
  description?: string;
  credits?: string;
  websiteUrl?: string;
  descriptionShort?: string;
  location?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  status?: ExhibitionStatus;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  categoryIds?: number[];
  categorySlugs?: string[];
}

export enum ExhibitionStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  PAST = 'PAST'
}
