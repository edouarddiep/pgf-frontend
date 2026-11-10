import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ArtworkCategory, Artwork } from '@core/models/artwork.model';
import { Invalidable, InvalidableCache } from '@core/utils/invalidable-cache.util';

@Injectable({
  providedIn: 'root'
})
export class ArtworkService implements Invalidable {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly cache = new InvalidableCache();

  private readonly categories$ = this.cache.wrap(
    () => this.http.get<ArtworkCategory[]>(`${this.apiUrl}/categories`)
  );

  getCategories(): Observable<ArtworkCategory[]> {
    return this.categories$;
  }

  getAvailableArtworks(): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.apiUrl}/artworks/available`);
  }

  getArtworkById(id: number): Observable<Artwork> {
    return this.http.get<Artwork>(`${this.apiUrl}/artworks/${id}`);
  }

  getArtworksByCategory(categorySlug: string): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.apiUrl}/artworks/category/slug/${categorySlug}`);
  }

  invalidate(): void {
    this.cache.invalidate();
  }
}
