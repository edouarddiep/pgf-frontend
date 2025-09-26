export interface ArtworkCategory {
  id: number;
  name: string;
  description?: string;
  slug: string;
  displayOrder: number;
  mainImageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithThumbnail extends ArtworkCategory {
  thumbnailUrl: string; // Always defined in this interface
}

export interface Artwork {
  id: number;
  title: string;
  description?: string;
  dimensions?: string;
  materials?: string;
  creationDate?: string;
  price?: number;
  isAvailable: boolean;
  imageUrls: string[];
  thumbnailUrls?: string[];
  mainImageUrl?: string;
  mainThumbnailUrl?: string;
  displayOrder: number;
  categoryIds?: number[];
  categoryNames?: string[];
  categorySlugs?: string[];
  createdAt: string;
  updatedAt: string;
}
