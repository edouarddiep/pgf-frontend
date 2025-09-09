import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { ApiService } from '@core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ArtworkService {
  private readonly apiService = inject(ApiService);

  private readonly artworks$ = this.apiService.getArtworks().pipe(
    shareReplay(1)
  );

  private readonly categories$ = this.apiService.getArtworkCategories().pipe(
    shareReplay(1)
  );

  getAllArtworks(): Observable<Artwork[]> {
    return this.artworks$;
  }

  getAvailableArtworks(): Observable<Artwork[]> {
    return this.apiService.getAvailableArtworks();
  }

  getArtworkById(id: number): Observable<Artwork> {
    return this.apiService.getArtworkById(id);
  }

  getArtworksByCategory(categorySlug: string): Observable<Artwork[]> {
    return this.apiService.getArtworksByCategorySlug(categorySlug);
  }

  getCategories(): Observable<ArtworkCategory[]> {
    return this.categories$;
  }

  getCategoryBySlug(slug: string): Observable<ArtworkCategory> {
    return this.apiService.getCategoryBySlug(slug);
  }

  getFeaturedArtworks(): Observable<Artwork[]> {
    return this.apiService.getArtworks();
  }
}
