export interface ArtworkCategory {
  id: number;
  name: string;
  description?: string;
  descriptionShort?: string;
  slug: string;
  thumbnailUrl?: string;
  artworkCount?: number;
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
  categoryIds?: number[];
  categoryNames?: string[];
  categorySlugs?: string[];
  createdAt: string;
  updatedAt: string;
}
