import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Exhibition } from '@core/models/exhibition.model';
import {ApiService} from '@core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ExhibitionService {
  private readonly apiService = inject(ApiService);

  private readonly exhibitions$ = this.apiService.getExhibitions().pipe(
    shareReplay(1)
  );

  getAllExhibitions(): Observable<Exhibition[]> {
    return this.exhibitions$;
  }

  getUpcomingExhibitions(): Observable<Exhibition[]> {
    return this.apiService.getUpcomingExhibitions();
  }

  getPastExhibitions(): Observable<Exhibition[]> {
    return this.apiService.getPastExhibitions();
  }

  getOngoingExhibitions(): Observable<Exhibition[]> {
    return this.apiService.getOngoingExhibitions();
  }

  getNextFeaturedExhibition(): Observable<Exhibition> {
    return this.apiService.getNextFeaturedExhibition();
  }
}
