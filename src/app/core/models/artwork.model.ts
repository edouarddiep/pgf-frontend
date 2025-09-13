export interface Artwork {
  id: number;
  title: string;
  description?: string;
  isAvailable: boolean;
  imageUrls: string[];
  displayOrder?: number;
  categoryId: number;
  categoryName?: string;
  categorySlug?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArtworkCategory {
  id: number;
  name: string;
  description?: string;
  slug: string;
  displayOrder?: number;
  artworks?: Artwork[];
  artworkCount?: number;
  createdAt: string;
  updatedAt: string;
}
