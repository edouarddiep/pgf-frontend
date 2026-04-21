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
  imageUrls?: string[];
  videoUrls?: string[];
}

export enum ExhibitionStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  PAST = 'PAST'
}
