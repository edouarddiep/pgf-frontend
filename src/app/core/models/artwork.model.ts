export interface Artwork {
  id: number;
  title: string;
  description?: string;
  dimensions?: string;
  materials?: string;
  creationDate?: string;
  price?: number;
  isAvailable: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
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
