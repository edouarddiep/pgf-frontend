export interface ArtworkCategory {
  id: number;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  slug: string;
  thumbnailUrl?: string;
  thumbnailSrcset?: string;
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
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  imageUrls: string[];
  imageSrcsets?: string[];
  mainImageUrl?: string;
  mainImageSrcset?: string;
  mainImagePositionX?: number;
  mainImagePositionY?: number;
  mainImageZoom?: number;
  categoryIds?: number[];
  categoryNames?: string[];
  categorySlugs?: string[];
  createdAt: string;
  updatedAt: string;
}
