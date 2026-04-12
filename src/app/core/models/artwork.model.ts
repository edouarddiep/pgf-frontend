export interface ArtworkCategory {
  id: number;
  name: string;
  description?: string;
  descriptionShort?: string;
  slug: string;
  thumbnailUrl?: string;
  thumbnailZoom?: number;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
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
  mainImagePositionX?: number;
  mainImagePositionY?: number;
  mainImageZoom?: number;
  categoryIds?: number[];
  categoryNames?: string[];
  categorySlugs?: string[];
  createdAt: string;
  updatedAt: string;
}
