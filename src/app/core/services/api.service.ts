import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { Exhibition } from '@core/models/exhibition.model';
import { ContactMessage } from '@core/models/contact.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getArtworkCategories(): Observable<ArtworkCategory[]> {
    return this.http.get<ArtworkCategory[]>(`${this.baseUrl}/categories`);
  }

  getCategoryBySlug(slug: string): Observable<ArtworkCategory> {
    return this.http.get<ArtworkCategory>(`${this.baseUrl}/categories/slug/${slug}`);
  }

  getArtworks(): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.baseUrl}/artworks`);
  }

  getArtworkById(id: number): Observable<Artwork> {
    return this.http.get<Artwork>(`${this.baseUrl}/artworks/${id}`);
  }

   getArtworksByCategory(categoryId: number): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.baseUrl}/artworks/category/${categoryId}`);
  }

  getArtworksByCategorySlug(slug: string): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.baseUrl}/artworks/category/slug/${slug}`);
  }

  getAvailableArtworks(): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.baseUrl}/artworks/available`);
  }

  getExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${this.baseUrl}/exhibitions`);
  }

  getUpcomingExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${this.baseUrl}/exhibitions/upcoming`);
  }

  getPastExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${this.baseUrl}/exhibitions/past`);
  }

  getOngoingExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${this.baseUrl}/exhibitions/ongoing`);
  }

  getNextFeaturedExhibition(): Observable<Exhibition> {
    return this.http.get<Exhibition>(`${this.baseUrl}/exhibitions/next-featured`);
  }

  sendContactMessage(message: ContactMessage): Observable<ContactMessage> {
    return this.http.post<ContactMessage>(`${this.baseUrl}/contact`, message);
  }
}
