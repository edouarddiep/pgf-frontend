import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '@environments/environment';
import { ArtworkCategory, Artwork } from '@core/models/artwork.model';

@Injectable({
  providedIn: 'root'
})
export class ArtworkService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly categories$ = this.http
    .get<ArtworkCategory[]>(`${this.apiUrl}/categories`)
    .pipe(shareReplay(1));

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
}
