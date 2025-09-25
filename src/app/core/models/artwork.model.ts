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
  mainImageUrl?: string;
  displayOrder: number;
  categoryIds?: Set<number>;
  categorySlugs?: Set<string>;
  createdAt: string;
  updatedAt: string;
}
