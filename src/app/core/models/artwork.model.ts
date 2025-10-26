export interface ArtworkCategory {
  id: number;
  name: string;
  description?: string;
  descriptionShort?: string;
  slug: string;
  displayOrder: number;
  mainImageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Artwork {
  id: number;
  title: string;
  description?: string;
  descriptionShort?: string;
  imageUrls: string[];
  mainImageUrl?: string;
  displayOrder: number;
  categoryIds?: number[];
  categoryNames?: string[];
  categorySlugs?: string[];
  createdAt: string;
  updatedAt: string;
}
