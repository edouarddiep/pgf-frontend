import {Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, ViewChild, ElementRef, PLATFORM_ID} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '@core/services/api.service';
import { Exhibition, ExhibitionStatus } from '@core/models/exhibition.model';
import { catchError, EMPTY, combineLatest } from 'rxjs';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ScrollAnimationService} from '@shared/services/scroll-animation.service';

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
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChild('heroVideo', { static: true }) heroVideo!: ElementRef<HTMLVideoElement>;

  protected readonly activeTab = signal<TabType>('current');
  protected readonly currentExhibitions = signal<Exhibition[]>([]);
  protected readonly pastExhibitions = signal<Exhibition[]>([]);
  protected readonly ExhibitionStatus = ExhibitionStatus;

  ngOnInit(): void {
    this.loadExhibitions();
    if (isPlatformBrowser(this.platformId)) {
      this.ensureVideoPlays();
      this.setupVideoLoop();
      this.scrollAnimationService.setupScrollAnimations();
    }
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private ensureVideoPlays(): void {
    setTimeout(() => {
      const video = this.heroVideo?.nativeElement;
      if (video && typeof video.play === 'function') {
        video.muted = true;
        video.volume = 0;
        video.currentTime = 2;
        video.play().catch(() => {});
      }
    }, 500);
  }

  private setupVideoLoop(): void {
    setTimeout(() => {
      const video = this.heroVideo?.nativeElement;
      if (video && typeof video.addEventListener === 'function') {
        video.muted = true;
        video.volume = 0;

        video.addEventListener('loadedmetadata', () => {
          video.currentTime = 2;
          video.muted = true;
          video.volume = 0;
        });

        video.addEventListener('timeupdate', () => {
          if (video.currentTime >= 12) {
            video.currentTime = 2;
          }
        });

        video.addEventListener('volumechange', () => {
          if (!video.muted || video.volume > 0) {
            video.muted = true;
            video.volume = 0;
          }
        });
      }
    }, 500);
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
