import {Injectable, inject, signal, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {ArtworkCategory, Artwork} from '@core/models/artwork.model';
import {Exhibition} from '@core/models/exhibition.model';
import {ContactMessage} from '@core/models/contact.model';
import {environment} from '@environments/environment';

export interface AdminExhibitionRequest {
  title: string;
  description: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = `${environment.apiUrl}/admin`;
  private readonly apiUrl = environment.apiUrl;
  private readonly isAuthenticatedSignal = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = sessionStorage.getItem('pgf-admin-auth');
      this.isAuthenticatedSignal.set(stored === 'true');
    } else {
      this.isAuthenticatedSignal.set(false);
    }
  }

  isAuthenticated = this.isAuthenticatedSignal.asReadonly();

  login(password: string): Observable<boolean> {
    return this.http.post<void>(`${this.baseUrl}/auth/login`, {password})
      .pipe(
        map(() => true),
        tap(() => {
          this.isAuthenticatedSignal.set(true);
          if (isPlatformBrowser(this.platformId)) {
            sessionStorage.setItem('pgf-admin-auth', 'true');
          }
        })
      );
  }

  logout(): void {
    this.isAuthenticatedSignal.set(false);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('pgf-admin-auth');
    }
  }

  // Artworks
  getCategories(): Observable<ArtworkCategory[]> {
    return this.http.get<ArtworkCategory[]>(`${this.baseUrl}/categories`);
  }

  getArtworks(): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.baseUrl}/artworks`);
  }

  getArtworksByCategory(categoryId: number): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.apiUrl}/artworks/category/${categoryId}`);
  }

  createArtworkWithImages(formData: FormData): Observable<Artwork> {
    return this.http.post<Artwork>(`${this.baseUrl}/artworks/with-images`, formData);
  }

  updateArtworkWithImages(id: number, formData: FormData): Observable<Artwork> {
    return this.http.put<Artwork>(`${this.baseUrl}/artworks/${id}/with-images`, formData);
  }

  deleteArtwork(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/artworks/${id}`);
  }

  // Exhibitions
  getExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${this.baseUrl}/exhibitions`);
  }

  createExhibition(request: AdminExhibitionRequest): Observable<Exhibition> {
    return this.http.post<Exhibition>(`${this.baseUrl}/exhibitions`, request);
  }

  updateExhibition(id: number, request: AdminExhibitionRequest): Observable<Exhibition> {
    return this.http.put<Exhibition>(`${this.baseUrl}/exhibitions/${id}`, request);
  }

  updateExhibitionOrder(id: number, order: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/exhibitions/${id}/order`, {displayOrder: order});
  }

  deleteExhibition(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/exhibitions/${id}`);
  }

  uploadExhibitionImage(file: File): Observable<{ imageUrl: string; thumbnailUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ imageUrl: string; thumbnailUrl?: string }>(
      `${this.baseUrl}/upload/exhibition-image`,
      formData
    );
  }

  // Ajouter dans AdminService
  deleteExhibitionImage(imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/images`, {
      params: {imageUrl}
    });
  }

  // Messages
  getMessages(): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(`${this.baseUrl}/messages`);
  }

  markMessageAsRead(id: number): Observable<ContactMessage> {
    return this.http.put<ContactMessage>(`${this.baseUrl}/messages/${id}/read`, {});
  }

  deleteMessage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/messages/${id}`);
  }
}
