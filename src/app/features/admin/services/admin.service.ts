import {Injectable, inject, signal, computed, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {MonoTypeOperatorFunction, Observable, of} from 'rxjs';
import {catchError, finalize, map, shareReplay, tap} from 'rxjs/operators';
import {ArtworkCategory, Artwork} from '@core/models/artwork.model';
import {Exhibition, ExhibitionFile} from '@core/models/exhibition.model';
import {ContactMessage} from '@core/models/contact.model';
import {environment} from '@environments/environment';
import {Archive} from '@core/models/archive.model';
import {ExhibitionService} from '@features/exhibitions/services/exhibition.service';
import {ArtworkService} from '@features/artworks/services/artwork.service';
import {Invalidable} from '@core/utils/invalidable-cache.util';

// La session vit dans localStorage : sessionStorage disparaissait à la
// fermeture de l'onglet et n'est jamais partagé entre onglets, ce qui imposait
// une reconnexion à chaque nouvel onglet.
const SESSION_STORAGE_KEY = 'pgf-admin-session';
const LEGACY_STORAGE_KEYS = ['pgf-admin-auth', 'pgf-admin-jwt', 'pgf-admin-legacy'];

// Un jeton qui expire pendant le trajet de la requête serait rejeté : on le
// renouvelle un peu avant l'échéance.
const TOKEN_EXPIRY_MARGIN_SECONDS = 60;

interface AdminSession {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  legacyPassword?: string;
}

interface SupabaseTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
}

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
  private readonly router = inject(Router);
  private readonly exhibitionService = inject(ExhibitionService);
  private readonly artworkService = inject(ArtworkService);
  private readonly session = signal<AdminSession | null>(null);
  private refreshRequest?: Observable<string>;

  constructor() {
    this.session.set(this.readSession());
    this.clearLegacyStorage();
  }

  readonly isAuthenticated = computed(() => this.session() !== null);

  readonly displayName = computed(() => {
    const accessToken = this.session()?.accessToken;
    if (!accessToken) {
      return 'Admin';
    }

    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return payload?.user_metadata?.display_name ?? '';
    } catch {
      return '';
    }
  });

  login(emailOrPassword: string, password?: string): Observable<boolean> {
    if (password !== undefined) {
      return this.loginWithEmail(emailOrPassword, password);
    }
    return this.loginWithLegacyPassword(emailOrPassword);
  }

  private loginWithEmail(email: string, password: string): Observable<boolean> {
    return this.requestToken('password', { email, password }).pipe(map(() => true));
  }

  private loginWithLegacyPassword(password: string): Observable<boolean> {
    return this.http.post<void>(`${this.adminApiUrl}/auth/login`, { password }).pipe(
      map(() => {
        this.storeSession({ legacyPassword: password });
        return true;
      })
    );
  }

  // L'en-tête est résolu de façon asynchrone : un jeton périmé est renouvelé
  // avant que la requête ne parte, sans que l'administrateur ne s'en aperçoive.
  authHeader(): Observable<string> {
    const session = this.session();
    if (!session) {
      return of('');
    }

    if (session.legacyPassword) {
      return of(`Basic ${btoa(':' + session.legacyPassword)}`);
    }

    if (session.accessToken && !this.isExpired(session)) {
      return of(`Bearer ${session.accessToken}`);
    }

    return this.refreshAccessToken();
  }

  logout(): void {
    this.session.set(null);
    this.refreshRequest = undefined;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  // Supabase fait tourner le refresh_token à chaque échange : deux appels
  // simultanés en invalideraient un. Toutes les requêtes partagent donc le même.
  private refreshAccessToken(): Observable<string> {
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) {
      this.expireSession();
      return of('');
    }

    this.refreshRequest ??= this.requestToken('refresh_token', { refresh_token: refreshToken }).pipe(
      map(res => `Bearer ${res.access_token}`),
      catchError(() => {
        this.expireSession();
        return of('');
      }),
      finalize(() => this.refreshRequest = undefined),
      shareReplay(1)
    );

    return this.refreshRequest;
  }

  private requestToken(grantType: string, body: object): Observable<SupabaseTokenResponse> {
    return this.http.post<SupabaseTokenResponse>(
      `${environment.supabaseUrl}/auth/v1/token?grant_type=${grantType}`,
      body,
      { headers: { apikey: environment.supabasePublishableKey } }
    ).pipe(
      map(res => {
        this.storeSession({
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
          expiresAt: res.expires_at ?? this.nowInSeconds() + (res.expires_in ?? 3600)
        });
        return res;
      })
    );
  }

  private expireSession(): void {
    this.logout();
    this.router.navigate(['/admin/login']);
  }

  private isExpired(session: AdminSession): boolean {
    return !session.expiresAt || session.expiresAt - TOKEN_EXPIRY_MARGIN_SECONDS <= this.nowInSeconds();
  }

  private nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  // Une session sans moyen de se rejouer ne vaut rien : un jeton expiré sans
  // refresh_token laisserait le garde passant et l'API répondre 401.
  private readSession(): AdminSession | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      const session = stored ? JSON.parse(stored) as AdminSession : null;
      return session?.legacyPassword || session?.refreshToken ? session : null;
    } catch {
      return null;
    }
  }

  private storeSession(session: AdminSession): void {
    this.session.set(session);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }

  // L'ancien stockage par onglet gardait le mot de passe legacy en clair après
  // une déconnexion : on le purge au démarrage.
  private clearLegacyStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      LEGACY_STORAGE_KEYS.forEach(key => sessionStorage.removeItem(key));
    }
  }

  getCategories(): Observable<ArtworkCategory[]> {
    return this.http.get<ArtworkCategory[]>(`${this.adminApiUrl}/categories`);
  }

  getArtworks(): Observable<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.adminApiUrl}/artworks`);
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
    return this.http.post<Exhibition>(`${this.adminApiUrl}/exhibitions`, request)
      .pipe(this.invalidating(this.exhibitionService));
  }

  updateExhibition(id: number, request: AdminExhibitionRequest): Observable<Exhibition> {
    return this.http.put<Exhibition>(`${this.adminApiUrl}/exhibitions/${id}`, request)
      .pipe(this.invalidating(this.exhibitionService));
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
    return this.http.delete<void>(`${this.adminApiUrl}/exhibitions/${id}`)
      .pipe(this.invalidating(this.exhibitionService));
  }

  deleteExhibitionImage(imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/images`, {
      params: {imageUrl}
    });
  }

  getExhibitionFiles(exhibitionId: number): Observable<ExhibitionFile[]> {
    return this.http.get<ExhibitionFile[]>(`${this.adminApiUrl}/exhibitions/${exhibitionId}/files`);
  }

  createExhibitionFiles(exhibitionId: number, files: ExhibitionFile[]): Observable<ExhibitionFile[]> {
    return this.http.post<ExhibitionFile[]>(`${this.adminApiUrl}/exhibitions/${exhibitionId}/files/batch`, files)
      .pipe(this.invalidating(this.exhibitionService));
  }

  updateExhibitionFile(exhibitionId: number, fileId: number, file: ExhibitionFile): Observable<ExhibitionFile> {
    return this.http.put<ExhibitionFile>(`${this.adminApiUrl}/exhibitions/${exhibitionId}/files/${fileId}`, file)
      .pipe(this.invalidating(this.exhibitionService));
  }

  deleteExhibitionFile(exhibitionId: number, fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/exhibitions/${exhibitionId}/files/${fileId}`)
      .pipe(this.invalidating(this.exhibitionService));
  }

  // Toute écriture périme le cache servi au public : sans ça, revenir sur le site
  // depuis l'admin sans recharger afficherait encore l'état d'avant l'édition.
  private invalidating<T>(cache: Invalidable): MonoTypeOperatorFunction<T> {
    return tap(() => cache.invalidate());
  }

  createCategory(dto: Partial<ArtworkCategory>): Observable<ArtworkCategory> {
    return this.http.post<ArtworkCategory>(`${this.adminApiUrl}/categories`, dto)
      .pipe(this.invalidating(this.artworkService));
  }

  updateCategory(id: number, dto: Partial<ArtworkCategory>): Observable<ArtworkCategory> {
    return this.http.put<ArtworkCategory>(`${this.adminApiUrl}/categories/${id}`, dto)
      .pipe(this.invalidating(this.artworkService));
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
    return this.http.delete<void>(`${this.adminApiUrl}/categories/${id}`)
      .pipe(this.invalidating(this.artworkService));
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
