import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '@core/services/api.service';
import { Exhibition } from '@core/models/exhibition.model';
import { catchError, EMPTY } from 'rxjs';

type TabType = 'current' | 'past';

@Component({
  selector: 'app-exhibitions',
  imports: [
    CommonModule,
    MatButtonModule
  ],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  protected readonly activeTab = signal<TabType>('current');
  protected readonly upcomingExhibitions = signal<Exhibition[]>([]);
  protected readonly pastExhibitions = signal<Exhibition[]>([]);

  ngOnInit(): void {
    this.loadExhibitions();
  }

  private loadExhibitions(): void {
    this.apiService.getUpcomingExhibitions()
      .pipe(catchError(() => EMPTY))
      .subscribe(exhibitions => {
        this.upcomingExhibitions.set(exhibitions);
      });

    this.apiService.getPastExhibitions()
      .pipe(catchError(() => EMPTY))
      .subscribe(exhibitions => {
        this.pastExhibitions.set(exhibitions);
      });
  }

  protected setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  protected formatDateBlock(startDate?: string, endDate?: string): string {
    if (!startDate) return 'Date à confirmer';

    const start = new Date(startDate);
    const startDay = start.getDate().toString().padStart(2, '0');
    const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const startYear = start.getFullYear();

    if (!endDate) {
      return `${startDay} ${startMonth} ${startYear}`;
    }

    const end = new Date(endDate);
    const endDay = end.getDate().toString().padStart(2, '0');
    const endMonth = end.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const endYear = end.getFullYear();

    if (startYear === endYear && startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
    }

    if (startYear === endYear) {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
    }

    return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  }

  protected onVernissageRegistration(exhibition: Exhibition): void {
    const vernissageUrl = 'https://forms.cloud.microsoft/pages/responsepage.aspx?id=wmJHDV9sh06TKIDkc-144X_K4JQ2f1ZDpqkc-BlhTspUQkQ3N0JHNUJJVUNGNzdBTzZCOEdWWEhISy4u&utm_source=print&utm_medium=paper&utm_campaign=20250902_cdg_flyer_vernissage_pierette&route=shorturl';
    window.open(vernissageUrl, '_blank');
  }

  protected onShowOnMap(exhibition: Exhibition): void {
    if (exhibition.address) {
      const encodedAddress = encodeURIComponent(exhibition.address);
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      window.open(googleMapsUrl, '_blank');
    }
  }
}
