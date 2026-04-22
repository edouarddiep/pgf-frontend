import {Injectable, inject, signal, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {ArtworkCategory, Artwork} from '@core/models/artwork.model';
import {Exhibition} from '@core/models/exhibition.model';
import {ContactMessage} from '@core/models/contact.model';
import {environment} from '@environments/environment';
import {Archive} from '@core/models/archive.model';

export interface AdminExhibitionRequest {
  title: string;
  description?: string;
  location: string;
  address?: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  imageUrls?: string[];
  vernissageUrl?: string;
  websiteUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly adminApiUrl = `${environment.apiUrl}/admin`;
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

  login(emailOrPassword: string, password?: string): Observable<boolean> {
    if (password !== undefined) {
      return this.loginWithEmail(emailOrPassword, password);
    }
    return this.loginWithLegacyPassword(emailOrPassword);
  }

  private loginWithEmail(email: string, password: string): Observable<boolean> {
    return this.http.post<{ access_token: string }>(
      `${environment.supabaseUrl}/auth/v1/token?grant_type=password`,
      { email, password },
      { headers: { apikey: environment.supabasePublishableKey } }
    ).pipe(
      map(res => {
        this.isAuthenticatedSignal.set(true);
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem('pgf-admin-auth', 'true');
          sessionStorage.setItem('pgf-admin-jwt', res.access_token);
          sessionStorage.removeItem('pgf-admin-legacy');
        }
        return true;
      })
    );
  }

  private loginWithLegacyPassword(password: string): Observable<boolean> {
    return this.http.post<void>(`${this.adminApiUrl}/auth/login`, { password }).pipe(
      map(() => true),
      tap(() => {
        this.isAuthenticatedSignal.set(true);
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem('pgf-admin-auth', 'true');
          sessionStorage.setItem('pgf-admin-legacy', password);
          sessionStorage.removeItem('pgf-admin-jwt');
        }
      })
    );
  }

  getAuthHeader(): string {
    if (isPlatformBrowser(this.platformId)) {
      const jwt = sessionStorage.getItem('pgf-admin-jwt');
      if (jwt) return `Bearer ${jwt}`;
      const legacy = sessionStorage.getItem('pgf-admin-legacy');
      if (legacy) return `Basic ${btoa(':' + legacy)}`;
    }
    return '';
  }

  logout(): void {
    this.isAuthenticatedSignal.set(false);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('pgf-admin-auth');
    }
  }

  getCategories(): Observable<ArtworkCategory[]> {
    return this.http.get<ArtworkCategory[]>(`${this.adminApiUrl}/categories`);
  }

  getArtworks(): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.adminApiUrl}/artworks`);
  }

  getArtworksByCategory(categoryId: number): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.apiUrl}/artworks/category/${categoryId}`);
  }

  createArtwork(dto: Partial<Artwork>): Observable<Artwork> {
    return this.http.post<Artwork>(`${this.adminApiUrl}/artworks`, dto);
  }

  updateArtwork(id: number, dto: Partial<Artwork>): Observable<Artwork> {
    return this.http.put<Artwork>(`${this.adminApiUrl}/artworks/${id}`, dto);
  }

  deleteArtwork(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/artworks/${id}`);
  }

  getExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${this.adminApiUrl}/exhibitions`);
  }

  createExhibition(request: AdminExhibitionRequest): Observable<Exhibition> {
    return this.http.post<Exhibition>(`${this.adminApiUrl}/exhibitions`, request);
  }

  updateExhibition(id: number, request: AdminExhibitionRequest): Observable<Exhibition> {
    return this.http.put<Exhibition>(`${this.adminApiUrl}/exhibitions/${id}`, request);
  }

  uploadExhibitionVideo(file: File, exhibitionSlug: string, videoIndex: number): Observable<{ videoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exhibitionSlug', exhibitionSlug);
    formData.append('videoIndex', videoIndex.toString());

    return this.http.post<{ videoUrl: string }>(
      `${this.adminApiUrl}/upload/exhibition-video`,
      formData
    );
  }

  deleteExhibition(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/exhibitions/${id}`);
  }

  deleteExhibitionImage(imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/images`, {
      params: {imageUrl}
    });
  }

  createCategory(dto: Partial<ArtworkCategory>): Observable<ArtworkCategory> {
    return this.http.post<ArtworkCategory>(`${this.adminApiUrl}/categories`, dto);
  }

  updateCategory(id: number, dto: Partial<ArtworkCategory>): Observable<ArtworkCategory> {
    return this.http.put<ArtworkCategory>(`${this.adminApiUrl}/categories/${id}`, dto);
  }

  uploadCategoryImage(file: File, categorySlug: string): Observable<{ thumbnailUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categorySlug', categorySlug);
    return this.http.post<{ thumbnailUrl: string }>(
      `${this.adminApiUrl}/upload/category-image`, formData
    );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/categories/${id}`);
  }

  getArchives(): Observable<Archive[]> {
    return this.http.get<Archive[]>(`${this.adminApiUrl}/archives`);
  }

  createArchive(dto: Partial<Archive>): Observable<Archive> {
    return this.http.post<Archive>(`${this.adminApiUrl}/archives`, dto);
  }

  updateArchive(id: number, dto: Partial<Archive>): Observable<Archive> {
    return this.http.put<Archive>(`${this.adminApiUrl}/archives/${id}`, dto);
  }

  deleteArchive(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/archives/${id}`);
  }

  getMessages(): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(`${this.adminApiUrl}/messages`);
  }

  markMessageAsRead(id: number): Observable<ContactMessage> {
    return this.http.put<ContactMessage>(`${this.adminApiUrl}/messages/${id}/read`, {});
  }

  deleteMessage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/messages/${id}`);
  }

  inviteUser(email: string): Observable<void> {
    return this.http.post<void>(`${this.adminApiUrl}/auth/invite`, { email });
  }

  resetPassword(email: string): Observable<void> {
    return this.http.post<void>(
      `${environment.supabaseUrl}/auth/v1/recover`,
      { email },
      { headers: { apikey: environment.supabasePublishableKey } }
    );
  }
}
