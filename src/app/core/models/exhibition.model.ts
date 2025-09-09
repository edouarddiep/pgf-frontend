export interface Exhibition {
  id: number;
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  isFeatured?: boolean;
  status: ExhibitionStatus;
  createdAt: string;
  updatedAt: string;
}

export enum ExhibitionStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  PAST = 'PAST'
}
