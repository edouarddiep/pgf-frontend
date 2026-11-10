import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Exhibition } from '@core/models/exhibition.model';
import { Invalidable, InvalidableCache } from '@core/utils/invalidable-cache.util';
import {ApiService} from '@core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class ExhibitionService implements Invalidable {
  private readonly apiService = inject(ApiService);
  private readonly cache = new InvalidableCache();

  private readonly exhibitions$ = this.cache.wrap(() => this.apiService.getExhibitions());
  private readonly upcoming$ = this.cache.wrap(() => this.apiService.getUpcomingExhibitions());
  private readonly past$ = this.cache.wrap(() => this.apiService.getPastExhibitions());
  private readonly ongoing$ = this.cache.wrap(() => this.apiService.getOngoingExhibitions());

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

  invalidate(): void {
    this.cache.invalidate();
  }
}
