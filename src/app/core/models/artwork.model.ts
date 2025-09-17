export interface Artwork {
  id: number;
  title: string;
  description?: string;
  dimensions?: string;
  materials?: string;
  creationDate?: string;
  price?: number;
  isAvailable: boolean;
  imageUrls?: string[];
  mainImageUrl?: string;
  displayOrder: number;
  categoryIds?: Set<number>;
  categoryNames?: Set<string>;
  categorySlugs?: Set<string>;
  createdAt: string;
  updatedAt: string;
}

export interface ArtworkCategory {
  id: number;
  name: string;
  description?: string;
  slug: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
