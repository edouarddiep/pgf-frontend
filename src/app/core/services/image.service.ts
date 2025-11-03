import {Injectable, inject} from '@angular/core';
import {HttpClient, HttpEvent, HttpEventType} from '@angular/common/http';
import {Observable, map} from 'rxjs';
import {environment} from '@environments/environment';

export interface ImageUploadResponse {
  imageUrl: string;
  thumbnailUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  uploadImage(file: File, category: string = 'artworks'): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const endpoint = category === 'exhibitions'
      ? `${this.baseUrl}/admin/upload/exhibition-image`
      : `${this.baseUrl}/admin/upload/image`;

    return this.http.post<{ imageUrl: string; thumbnailUrl?: string }>(endpoint, formData)
      .pipe(
        map(response => ({
          imageUrl: response.imageUrl,
          thumbnailUrl: response.thumbnailUrl || response.imageUrl
        }))
      );
  }

  uploadImageWithProgress(file: File, category: string = 'artworks'): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const endpoint = category === 'exhibitions'
      ? `${this.baseUrl}/admin/upload/exhibition-image`
      : `${this.baseUrl}/admin/upload/image`;

    return this.http.post(endpoint, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = Math.round(100 * event.loaded / (event.total || 1));
            return {type: 'progress', progress};
          case HttpEventType.Response:
            return {type: 'complete', result: event.body};
          default:
            return {type: 'other', event};
        }
      })
    );
  }

  deleteImage(imageUrl: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/images`, {
      params: {imageUrl}
    });
  }

  checkImageExists(imageUrl: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/images/exists`, {
      params: {imageUrl}
    });
  }
}
