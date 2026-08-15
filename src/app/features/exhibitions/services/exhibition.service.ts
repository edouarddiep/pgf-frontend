import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { Exhibition } from '@core/models/exhibition.model';
import {ApiService} from '@core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ExhibitionService {
  private readonly apiService = inject(ApiService);

  private readonly exhibitions$ = this.apiService.getExhibitions().pipe(shareReplay(1));
  private readonly upcoming$ = this.apiService.getUpcomingExhibitions().pipe(shareReplay(1));
  private readonly past$ = this.apiService.getPastExhibitions().pipe(shareReplay(1));
  private readonly ongoing$ = this.apiService.getOngoingExhibitions().pipe(shareReplay(1));

  getAllExhibitions(): Observable<Exhibition[]> {
    return this.exhibitions$;
  }

  getUpcomingExhibitions(): Observable<Exhibition[]> {
    return this.upcoming$;
  }

  getPastExhibitions(): Observable<Exhibition[]> {
    return this.past$;
  }

  getOngoingExhibitions(): Observable<Exhibition[]> {
    return this.ongoing$;
  }

  getNextFeaturedExhibition(): Observable<Exhibition> {
    return this.apiService.getNextFeaturedExhibition();
  }
}
