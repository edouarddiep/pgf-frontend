import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
  effect,
  untracked,
  viewChildren,
  ElementRef,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ExhibitionService } from '@features/exhibitions/services/exhibition.service';
import {
  Exhibition,
  ExhibitionStatus,
  EXHIBITION_ANCHOR_PREFIX,
  exhibitionAnchorId
} from '@core/models/exhibition.model';
import { catchError, EMPTY, combineLatest } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {SeoService} from '@core/services/seo.service';
import {artistRefSchema, exhibitionSchema} from '@core/seo/structured-data';
import {AnalyticsService} from '@core/services/analytics.service';
import {ExhibitionMediaComponent} from '@shared/components/exhibition-media/exhibition-media.component';

type TabType = 'current' | 'past';

const ANCHOR_SETTLE_TIMEOUT_MS = 2500;
// Place à réserver pour le bouton « Voir plus » : sa hauteur plus sa marge basse.
const TOGGLE_HEIGHT_PX = 44;
const TOGGLE_MARGIN_PX = 24;
const TOGGLE_RESERVED_PX = TOGGLE_HEIGHT_PX + TOGGLE_MARGIN_PX;
// Marges verticales fixées en SCSS, reprises ici pour le calcul du seuil.
const THUMBNAILS_GAP_PX = 24;
const DESCRIPTION_MARGIN_PX = 24;
const CREDITS_MARGIN_PX = 24;
// Planchers de lisibilité : en colonne unique (mobile) l'image ne sert plus de
// référence, et on ne réduit jamais la description sous MIN_LINES.
const MOBILE_MAX_LINES = 9;
const MIN_LINES = 6;

@Component({
  selector: 'app-exhibitions',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslatePipe,
    ExhibitionMediaComponent
],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionsComponent implements OnInit, OnDestroy {
  private readonly exhibitionService = inject(ExhibitionService);
  private readonly route = inject(ActivatedRoute);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  private readonly seoService = inject(SeoService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly descriptionRefs = viewChildren<ElementRef<HTMLElement>>('descriptionText');

  private galleryObserver: ResizeObserver | null = null;
  private measureQueued = false;

  protected readonly activeTab = signal<TabType>('current');
  protected readonly currentExhibitions = signal<Exhibition[]>([]);
  protected readonly pastExhibitions = signal<Exhibition[]>([]);
  protected readonly ExhibitionStatus = ExhibitionStatus;
  protected readonly anchorId = exhibitionAnchorId;
  protected readonly selectedImageIndices = signal<Map<number, number>>(new Map());
  protected readonly showImageModal = signal(false);
  protected readonly modalImageIndex = signal(0);
  protected readonly modalExhibition = signal<Exhibition | null>(null);
  protected readonly collapsibleDescriptions = signal<ReadonlySet<number>>(new Set());
  protected readonly expandedDescriptions = signal<ReadonlySet<number>>(new Set());
  protected readonly descriptionHeights = signal<ReadonlyMap<number, string>>(new Map());

  constructor() {
    effect(() => {
      this.descriptionRefs();

      if (this.isBrowser) {
        this.observeGalleries();
        this.measureDescriptions();
      }
    });
  }

  ngOnInit(): void {
    this.seoService.setPage('seo.exhibitions.title', 'seo.exhibitions.description', () => [
      artistRefSchema(this.translateService.currentLang()),
      ...this.currentExhibitions().map(exhibition => exhibitionSchema(
        exhibition,
        this.localeService.resolve(exhibition, 'title'),
        this.localeService.resolve(exhibition, 'description')
      ))
    ]);
    this.loadExhibitions();
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
    this.galleryObserver?.disconnect();
  }

  private loadExhibitions(): void {
    combineLatest([
      this.exhibitionService.getUpcomingExhibitions(),
      this.exhibitionService.getOngoingExhibitions(),
      this.exhibitionService.getPastExhibitions()
    ])
      .pipe(catchError(() => EMPTY))
      .subscribe(([upcoming, ongoing, past]) => {
        this.currentExhibitions.set([...ongoing, ...upcoming]);
        this.pastExhibitions.set(past);

        if (!this.isBrowser) {
          return;
        }

        setTimeout(() => {
          [...ongoing, ...upcoming, ...past].forEach(ex => this.setupTouchListeners(ex.id));
          this.scrollToRequestedExhibition();
        });
      });
  }

  private scrollToRequestedExhibition(): void {
    const fragment = this.route.snapshot.fragment;
    if (!fragment) return;

    const exhibitionId = Number(fragment.replace(EXHIBITION_ANCHOR_PREFIX, ''));
    const isPast = this.pastExhibitions().some(exhibition => exhibition.id === exhibitionId);

    if (isPast) {
      this.setActiveTab('past');
    }

    setTimeout(() => this.scrollToAnchor(fragment), isPast ? 150 : 0);
  }

  private scrollToAnchor(fragment: string): void {
    const target = document.getElementById(fragment);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const pendingImages = Array.from(document.querySelectorAll<HTMLImageElement>('.exhibitions-list img'))
      .filter(image => !image.complete)
      .map(image => new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      }));

    if (pendingImages.length === 0) return;

    Promise.race([
      Promise.all(pendingImages),
      new Promise(resolve => setTimeout(resolve, ANCHOR_SETTLE_TIMEOUT_MS))
    ]).then(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
  }

  protected setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
    if (tab === 'past') {
      setTimeout(() => {
        this.setupPersonalExhibitionsAnimations();
        this.pastExhibitions().forEach(ex => this.setupTouchListeners(ex.id));
      }, 100);
    }
  }

  protected isDescriptionCollapsible(exhibitionId: number): boolean {
    return this.collapsibleDescriptions().has(exhibitionId);
  }

  protected isDescriptionExpanded(exhibitionId: number): boolean {
    return this.expandedDescriptions().has(exhibitionId);
  }

  protected descriptionHeight(exhibitionId: number): string | null {
    return this.descriptionHeights().get(exhibitionId) ?? null;
  }

  protected toggleDescription(exhibitionId: number): void {
    const isExpanding = !this.isDescriptionExpanded(exhibitionId);

    this.expandedDescriptions.update(ids => {
      const next = new Set(ids);
      if (isExpanding) {
        next.add(exhibitionId);
      } else {
        next.delete(exhibitionId);
      }
      return next;
    });

    const element = this.descriptionElement(exhibitionId);
    if (!element) {
      return;
    }

    const height = isExpanding ? element.scrollHeight : this.collapsedHeight(element);
    this.descriptionHeights.update(heights => new Map(heights).set(exhibitionId, `${height}px`));
  }

  private measureDescriptions(): void {
    const collapsible = new Set<number>();
    const heights = new Map<number, string>();

    this.descriptionRefs().forEach(ref => {
      const element = ref.nativeElement;
      const exhibitionId = Number(element.dataset['exhibitionId']);
      const maxHeight = this.collapsedHeight(element);

      if (element.scrollHeight <= maxHeight + 4) {
        return;
      }

      collapsible.add(exhibitionId);
      // untracked : sans quoi replier/déplier relancerait cet effet en boucle.
      const isExpanded = untracked(() => this.expandedDescriptions().has(exhibitionId));
      heights.set(exhibitionId, `${isExpanded ? element.scrollHeight : maxHeight}px`);
    });

    this.collapsibleDescriptions.set(collapsible);
    this.descriptionHeights.set(heights);
  }

  // Hauteur maximale laissée à la description : celle du carrousel, moins tout
  // ce que la colonne de droite contient déjà. Le texte ne dépasse donc jamais
  // l'image, et sans dépassement il n'y a pas de bouton du tout.
  private collapsedHeight(element: HTMLElement): number {
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    const item = element.closest('.exhibition-item');
    const gallery = item?.querySelector('.exhibition-gallery');
    const content = item?.querySelector('.exhibition-content');
    const image = item?.querySelector('.main-image-container');

    if (!item || !gallery || !content || !image) {
      return lineHeight * MOBILE_MAX_LINES;
    }

    const contentRect = content.getBoundingClientRect();

    // En colonne unique l'image est au-dessus du texte : plus de repère commun.
    if (Math.abs(gallery.getBoundingClientRect().top - contentRect.top) > 4) {
      return lineHeight * MOBILE_MAX_LINES;
    }

    // Hauteur propre du carrousel : la boîte de la galerie est étirée par la
    // grille, ses enfants non — ce sont eux la référence stable.
    const thumbnails = item.querySelector('.thumbnail-carousel');
    const carouselHeight = image.getBoundingClientRect().height
      + (thumbnails ? thumbnails.getBoundingClientRect().height + THUMBNAILS_GAP_PX : 0);

    const above = element.getBoundingClientRect().top - contentRect.top;
    const below = this.contentBelowDescription(item);

    return Math.max(carouselHeight - above - below - TOGGLE_RESERVED_PX, lineHeight * MIN_LINES);
  }

  // Tout ce qui suit la description dans la colonne, hors bouton « Voir plus »
  // dont la place est réservée à part pour que le seuil reste stable.
  private contentBelowDescription(item: Element): number {
    const credits = item.querySelector('.credits');
    const actions = item.querySelector('.action-buttons') ?? item.querySelector('.website-button');

    return DESCRIPTION_MARGIN_PX
      + (credits ? credits.getBoundingClientRect().height + CREDITS_MARGIN_PX : 0)
      + (actions ? actions.getBoundingClientRect().height : 0);
  }

  private observeGalleries(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.galleryObserver?.disconnect();
    // L'image dicte le seuil : il faut re-mesurer quand elle se charge ou que la fenêtre change.
    this.galleryObserver = new ResizeObserver(() => {
      if (this.measureQueued) {
        return;
      }
      this.measureQueued = true;
      requestAnimationFrame(() => {
        this.measureQueued = false;
        this.measureDescriptions();
      });
    });

    document.querySelectorAll('.exhibition-gallery')
      .forEach(gallery => this.galleryObserver?.observe(gallery));
  }

  private descriptionElement(exhibitionId: number): HTMLElement | null {
    return this.descriptionRefs()
      .find(ref => Number(ref.nativeElement.dataset['exhibitionId']) === exhibitionId)
      ?.nativeElement ?? null;
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
    if (!exhibition.vernissageUrl) return;
    this.analyticsService.trackEvent('vernissage_registration_clicked', {
      exhibition_title: exhibition.title,
      exhibition_id: exhibition.id
    });
    window.open(exhibition.vernissageUrl, '_blank');
  }

  protected onExhibitionWebsiteClicked(exhibition: Exhibition): void {
    this.analyticsService.trackEvent('exhibition_link_clicked', {
      exhibition_title: exhibition.title,
      url: exhibition.websiteUrl
    });
    window.open(exhibition.websiteUrl, '_blank');
  }

  protected getMapsUrl(exhibition: Exhibition): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(exhibition.address ?? '')}`;
  }

  protected onShowOnMap(exhibition: Exhibition): void {
    if (exhibition.address) {
      window.open(this.getMapsUrl(exhibition), '_blank');
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

  protected getImageSrcset(exhibition: Exhibition, index: number): string | null {
    return exhibition.imageSrcsets?.[index] ?? null;
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

    const existingHandler = (container as any)._swipeHandler;
    if (existingHandler) return;

    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      this.handleSwipe(exhibitionId, touchStartX, touchEndX, touchStartY, touchEndY);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    (container as any)._swipeHandler = true;
  }

  private handleSwipe(exhibitionId: number, startX: number, endX: number, startY: number, endY: number): void {
    const swipeThreshold = 50;
    const diffX = startX - endX;
    const diffY = Math.abs(startY - endY);

    if (diffY > 50) return;

    const exhibition = [...this.currentExhibitions(), ...this.pastExhibitions()]
      .find(e => e.id === exhibitionId);

    if (!exhibition) return;

    const totalMedia = this.getTotalMediaCount(exhibition);

    if (Math.abs(diffX) > swipeThreshold && totalMedia > 1) {
      if (diffX > 0) {
        this.nextImage(exhibitionId, totalMedia);
      } else {
        this.previousImage(exhibitionId, totalMedia);
      }
    }
  }

  protected onModalTouchStart(event: TouchEvent): void {
    this.modalTouchStartX = event.touches[0].clientX;
    this.modalTouchStartY = event.touches[0].clientY;
  }

  protected onModalTouchEnd(event: TouchEvent): void {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const diffX = this.modalTouchStartX - touchEndX;
    const diffY = Math.abs(this.modalTouchStartY - touchEndY);

    if (diffY > 50) return;

    const exhibition = this.modalExhibition();
    if (!exhibition?.imageUrls) return;

    const swipeThreshold = 50;

    if (Math.abs(diffX) > swipeThreshold) {
      const fakeEvent = new Event('click');
      if (diffX > 0) {
        this.nextModalImage(fakeEvent, exhibition.imageUrls.length);
      } else {
        this.previousModalImage(fakeEvent, exhibition.imageUrls.length);
      }
    }
  }

  private modalTouchStartX = 0;
  private modalTouchStartY = 0;

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

  private setupPersonalExhibitionsAnimations(): void {
    this.scrollAnimationService.observeElements(
      '.personal-exhibitions-section .timeline-item',
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    );
  }
}
