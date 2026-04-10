import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '@environments/environment';

export interface ImageUploadResponse {
  imageUrl: string;
  thumbnailUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  uploadImage(file: File, category: string = 'artworks'): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const endpoint = category === 'exhibitions'
      ? `${this.baseUrl}/admin/upload/exhibition-image`
      : `${this.baseUrl}/admin/upload/image`;

    return this.http.post<{ imageUrl: string; thumbnailUrl?: string }>(endpoint, formData).pipe(
      map(response => ({ imageUrl: response.imageUrl, thumbnailUrl: response.thumbnailUrl || response.imageUrl }))
    );
  }

  uploadImageWithProgress(file: File, category: string = 'artworks'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const endpoint = category === 'exhibitions'
      ? `${this.baseUrl}/admin/upload/exhibition-image`
      : `${this.baseUrl}/admin/upload/image`;

    return this.http.post(endpoint, formData, { reportProgress: true, observe: 'events' }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            return { type: 'progress', progress: Math.round(100 * event.loaded / (event.total || 1)) };
          case HttpEventType.Response:
            return { type: 'complete', result: event.body };
          default:
            return { type: 'other', event };
        }
      })
    );
  }

  uploadFile(file: File, folder: string = 'archives'): Observable<{ fileUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return this.http.post<{ fileUrl: string }>(`${this.baseUrl}/admin/upload/file`, formData);
  }

  deleteImage(imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/images`, { params: { imageUrl } });
  }

  checkImageExists(imageUrl: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/images/exists`, { params: { imageUrl } });
  }

  uploadExhibitionImage(file: File, exhibitionSlug: string, imageIndex: number): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('exhibitionSlug', exhibitionSlug);
    formData.append('imageIndex', imageIndex.toString());
    return this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/admin/upload/exhibition-image-indexed`, formData);
  }
}
