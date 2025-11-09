export interface Exhibition {
  id: number;
  title: string;
  description?: string;
  location: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  status: ExhibitionStatus;
  createdAt?: string;
  updatedAt?: string;
}

export enum ExhibitionStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  PAST = 'PAST'
}
