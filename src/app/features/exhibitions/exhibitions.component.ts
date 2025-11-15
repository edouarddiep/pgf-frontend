import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
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
  protected readonly selectedImageIndices = signal<Map<number, number>>(new Map());
  protected readonly showImageModal = signal(false);
  protected readonly modalImageIndex = signal(0);
  protected readonly modalExhibition = signal<Exhibition | null>(null);

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
        setTimeout(() => {
          [...ongoing, ...upcoming].forEach(ex => this.setupTouchListeners(ex.id));
        });
      });

    this.apiService.getPastExhibitions()
      .pipe(catchError(() => EMPTY))
      .subscribe(exhibitions => {
        this.pastExhibitions.set(exhibitions);
        setTimeout(() => {
          exhibitions.forEach(ex => this.setupTouchListeners(ex.id));
        });
      });
  }

  protected setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  protected getSelectedImageIndex(exhibitionId: number): number {
    return this.selectedImageIndices().get(exhibitionId) || 0;
  }

  protected selectImage(exhibitionId: number, index: number): void {
    this.selectedImageIndices.update(map => {
      const newMap = new Map(map);
      newMap.set(exhibitionId, index);
      return newMap;
    });
    this.centerThumbnail(exhibitionId, index);
  }

  protected previousImage(exhibitionId: number, totalImages: number): void {
    const current = this.getSelectedImageIndex(exhibitionId);
    const newIndex = current > 0 ? current - 1 : totalImages - 1;
    this.selectImage(exhibitionId, newIndex);
  }

  protected nextImage(exhibitionId: number, totalImages: number): void {
    const current = this.getSelectedImageIndex(exhibitionId);
    const newIndex = current < totalImages - 1 ? current + 1 : 0;
    this.selectImage(exhibitionId, newIndex);
  }

  protected openImageModal(exhibitionId: number, index: number): void {
    const exhibition = [...this.currentExhibitions(), ...this.pastExhibitions()]
      .find(e => e.id === exhibitionId);

    if (exhibition && exhibition.imageUrls && exhibition.imageUrls.length > 0) {
      this.modalExhibition.set(exhibition);
      this.modalImageIndex.set(index);
      this.showImageModal.set(true);
    }
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
    this.modalExhibition.set(null);
  }

  protected previousModalImage(event: Event, totalImages: number): void {
    event.stopPropagation();
    const current = this.modalImageIndex();
    const newIndex = current > 0 ? current - 1 : totalImages - 1;
    this.modalImageIndex.set(newIndex);
  }

  protected nextModalImage(event: Event, totalImages: number): void {
    event.stopPropagation();
    const current = this.modalImageIndex();
    const newIndex = current < totalImages - 1 ? current + 1 : 0;
    this.modalImageIndex.set(newIndex);
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

  protected getUniqueImageUrls(exhibition: Exhibition): string[] {
    const urls: string[] = [];

    if (exhibition.imageUrl) {
      urls.push(exhibition.imageUrl);
    }

    if (exhibition.imageUrls && exhibition.imageUrls.length > 0) {
      exhibition.imageUrls.forEach(url => {
        if (url !== exhibition.imageUrl) {
          urls.push(url);
        }
      });
    }

    return urls;
  }

  protected getTotalMediaCount(exhibition: Exhibition): number {
    const imageCount = exhibition.imageUrls?.length || 0;
    const videoCount = exhibition.videoUrls?.length || 0;
    return imageCount + videoCount;
  }

  protected getAllMediaUrls(exhibition: Exhibition): string[] {
    const images = exhibition.imageUrls || [];
    const videos = exhibition.videoUrls || [];
    return [...images, ...videos];
  }

  protected getCurrentMediaUrl(exhibition: Exhibition, index: number): string {
    const allMedia = this.getAllMediaUrls(exhibition);
    return allMedia[index] || '';
  }

  protected isVideoAtCurrentIndex(exhibition: Exhibition, index: number): boolean {
    const imageCount = exhibition.imageUrls?.length || 0;
    return index >= imageCount;
  }

  protected isVideoUrl(url: string): boolean {
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('video');
  }

  private setupTouchListeners(exhibitionId: number): void {
    const gallery = document.querySelector(`[data-exhibition-id="${exhibitionId}"]`) as HTMLElement;
    if (!gallery) return;

    const container = gallery.querySelector('.main-image-container') as HTMLElement;
    if (!container) return;

    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].clientX;
      this.handleSwipe(exhibitionId, touchStartX, touchEndX);
    }, { passive: true });
  }

  private handleSwipe(exhibitionId: number, startX: number, endX: number): void {
    const swipeThreshold = 50;
    const diff = startX - endX;

    const exhibition = [...this.currentExhibitions(), ...this.pastExhibitions()]
      .find(e => e.id === exhibitionId);

    if (!exhibition?.imageUrls) return;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        this.nextImage(exhibitionId, exhibition.imageUrls.length);
      } else {
        this.previousImage(exhibitionId, exhibition.imageUrls.length);
      }
    }
  }

  private centerThumbnail(exhibitionId: number, index: number): void {
    requestAnimationFrame(() => {
      const gallery = document.querySelector(`[data-exhibition-id="${exhibitionId}"]`) as HTMLElement;
      if (!gallery) return;

      const container = gallery.querySelector('.thumbnails-container') as HTMLElement;
      if (!container) return;

      const thumbnails = Array.from(container.children) as HTMLElement[];
      const thumbnail = thumbnails[index];

      if (!thumbnail) return;

      const containerRect = container.getBoundingClientRect();
      const thumbnailRect = thumbnail.getBoundingClientRect();

      const containerCenter = containerRect.width / 2;
      const thumbnailCenter = thumbnailRect.left - containerRect.left + thumbnailRect.width / 2;
      const scrollOffset = thumbnailCenter - containerCenter;

      container.scrollBy({
        left: scrollOffset,
        behavior: 'smooth'
      });
    });
  }
}
