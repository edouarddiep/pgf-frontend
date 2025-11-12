import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Archive } from '@core/models/archive.model';
import { ApiService } from '@core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ArchiveService {
  private readonly apiService = inject(ApiService);

  getAllArchives(): Observable<Archive[]> {
    return this.apiService.getArchives();
  }

  getArchiveById(id: number): Observable<Archive> {
    return this.apiService.getArchiveById(id);
  }
}
