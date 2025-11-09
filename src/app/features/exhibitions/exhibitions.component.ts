import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '@core/services/api.service';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { catchError, EMPTY, combineLatest } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';

type TabType = 'current' | 'past';

@Component({
  selector: 'app-exhibitions',
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  protected readonly activeTab = signal<TabType>('current');
  protected readonly currentExhibitions = signal<Exhibition[]>([]);
  protected readonly pastExhibitions = signal<Exhibition[]>([]);
  protected readonly ExhibitionStatus = ExhibitionStatus;

  ngOnInit(): void {
    this.loadExhibitions();
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private loadExhibitions(): void {
    combineLatest([
      this.apiService.getUpcomingExhibitions(),
      this.apiService.getOngoingExhibitions()
    ])
      .pipe(catchError(() => EMPTY))
      .subscribe(([upcoming, ongoing]) => {
        this.currentExhibitions.set([...ongoing, ...upcoming]);
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

  protected isVernissageRegistrationDisabled(exhibition: Exhibition): boolean {
    return exhibition.status === ExhibitionStatus.ONGOING || exhibition.status === ExhibitionStatus.PAST;
  }

  protected formatDateBlock(startDate?: string, endDate?: string): string {
    if (!startDate) return '';
    const start = new Date(startDate);
    const formattedStart = start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!endDate) return formattedStart;
    const end = new Date(endDate);
    const formattedEnd = end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    return `${formattedStart} - ${formattedEnd}`;
  }

  protected onVernissageRegistration(exhibition: Exhibition): void {
    if (this.isVernissageRegistrationDisabled(exhibition)) return;
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
