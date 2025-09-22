import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ArtworkCategory, Artwork } from '@core/models/artwork.model';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { ContactMessage } from '@core/models/contact.model';

export interface AdminExhibitionRequest {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  isFeatured: boolean;
  status: ExhibitionStatus;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = 'http://localhost:8080/api/admin';
  private readonly apiUrl = 'http://localhost:8080/api';
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
    return this.http.post<void>(`${this.baseUrl}/auth/login`, { password })
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

  getExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${this.baseUrl}/exhibitions`);
  }

  createExhibition(request: AdminExhibitionRequest): Observable<Exhibition> {
    return this.http.post<Exhibition>(`${this.baseUrl}/exhibitions`, request);
  }

  updateExhibition(id: number, request: AdminExhibitionRequest): Observable<Exhibition> {
    return this.http.put<Exhibition>(`${this.baseUrl}/exhibitions/${id}`, request);
  }

  deleteExhibition(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/exhibitions/${id}`);
  }

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
