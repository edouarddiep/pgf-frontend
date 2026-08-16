import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit,
  OnDestroy,
  effect,
  untracked,
  ChangeDetectorRef, ViewChild, ElementRef, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {ArchiveService} from '@core/services/archive.service';
import {ScrollAnimationService} from '@shared/services/scroll-animation.service';
import {Archive, ArchiveFile} from '@core/models/archive.model';
import {catchError, EMPTY} from 'rxjs';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {NavService} from '@core/services/nav.service';
import {SeoService} from '@core/services/seo.service';
import {archiveSchema, artistRefSchema, breadcrumbSchema, SITE_ORIGIN, websiteSchema} from '@core/seo/structured-data';
import {ViewportService} from '@shared/services/viewport.service';

@Component({
  selector: 'app-archive-detail',
  imports: [RouterModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './archive-detail.component.html',
  styleUrl: './archive-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchiveDetailComponent implements OnInit, OnDestroy {
  @ViewChild('descriptionText') descriptionTextRef: ElementRef<HTMLParagraphElement>;

  private readonly archiveService = inject(ArchiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  private readonly navService = inject(NavService);
  private readonly seoService = inject(SeoService);
  private readonly viewport = inject(ViewportService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly lang = computed(() => this.translateService.currentLang());
  private readonly SCROLL_KEY = 'archives';


  protected readonly archive = signal<Archive | null>(null);
  protected readonly modalImage = signal<string | null>(null);
  protected readonly modalTitle = signal<string>('');
  protected readonly modalVideo = signal<ArchiveFile | null>(null);
  protected readonly descriptionExpanded = signal<boolean>(false);
  protected readonly showToggle = signal<boolean>(false);
  protected readonly descriptionHeight = signal<string | null>(null);
  protected readonly descriptionHtml = computed(() => {
    const html = this.localeService.resolve(this.archive(), 'description');
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  });

  private readonly LINE_HEIGHT_EM = 1.8;
  private readonly MAX_LINES = 5;

  constructor() {
    // Le repli ne sert que sur les écrans courts : on réévalue à chaque changement.
    effect(() => {
      this.viewport.isCompactHeight();

      if (this.isBrowser) {
        this.checkDescriptionOverflow();
      }
    });
  }

  protected readonly audioFiles = computed(() =>
    this.archive()?.files?.filter(f => f.fileType === 'AUDIO') || []
  );

  protected readonly imageFiles = computed(() =>
    this.archive()?.files?.filter(f => f.fileType === 'IMAGE' && f.fileUrl !== this.archive()?.thumbnailUrl) || []
  );

  protected readonly videoFiles = computed(() =>
    this.archive()?.files?.filter(f => f.fileType === 'VIDEO') || []
  );

  protected readonly pdfFiles = computed(() =>
    this.archive()?.files?.filter(f => f.fileType === 'PDF') || []
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadArchive(id);
    this.seoService.setPageResolver(() => {
      const archive = this.archive();

      if (!archive) {
        return null;
      }

      const title = this.localeService.resolve(archive, 'title');
      const description = this.localeService.resolve(archive, 'description');
      const langPrefix = this.navService.langPrefix();
      const path = `${langPrefix}/archives/${archive.id}`;
      const seoDescription = description
        || this.translateService.translate('seo.archiveDetail.description', { title });

      return {
        title: this.translateService.translate('seo.archiveDetail.title', { title }),
        description: seoDescription,
        image: archive.thumbnailUrl,
        jsonLd: [
          artistRefSchema(this.translateService.currentLang()),
          websiteSchema(this.translateService.currentLang()),
          archiveSchema(archive, this.translateService.currentLang(), title, seoDescription, `${SITE_ORIGIN}${path}`),
          breadcrumbSchema([
            { name: this.translateService.translate('nav.home'), path: langPrefix },
            { name: this.translateService.translate('nav.archives'), path: `${langPrefix}/archives` },
            { name: title, path }
          ])
        ]
      };
    });
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private loadArchive(id: number): void {
    this.archiveService.getArchiveById(id)
      .pipe(catchError(() => EMPTY))
      .subscribe(archive => {
        this.archive.set(archive);
        this.cdr.detectChanges();

        if (!this.isBrowser) {
          return;
        }

        setTimeout(() => {
          this.scrollAnimationService.setupScrollAnimations();
          this.checkDescriptionOverflow();
        }, 100);
      });
  }

  private checkDescriptionOverflow(): void {
    const el = this.descriptionTextRef?.nativeElement;
    if (!el) { return; }

    if (!this.viewport.isCompactHeight()) {
      this.showToggle.set(false);
      this.descriptionExpanded.set(false);
      this.descriptionHeight.set(null);
      return;
    }

    const lineHeightPx = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeightPx * this.MAX_LINES;
    const scrollH = el.scrollHeight;
    this.showToggle.set(scrollH > maxHeight + 4);
    // untracked : sans quoi replier/déplier relancerait l'effet en boucle.
    const isExpanded = untracked(() => this.descriptionExpanded());
    this.descriptionHeight.set(isExpanded ? `${scrollH}px` : `${Math.min(scrollH, maxHeight)}px`);
  }

  goBack(): void {
    if (this.scrollAnimationService.hasScrollPosition(this.SCROLL_KEY)) {
      this.location.back();
    } else {
      this.navService.navigate(['archives']);
    }
  }

  protected getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  protected getYouTubeThumbnail(url: string): string {
    const videoId = this.extractYouTubeId(url);
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  private extractYouTubeId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : '';
  }

  protected openImageModal(url: string, title: string): void {
    this.modalImage.set(url);
    this.modalTitle.set(title);
    document.body.style.overflow = 'hidden';
  }

  protected openVideoModal(file: ArchiveFile): void {
    this.modalVideo.set(file);
    document.body.style.overflow = 'hidden';
  }

  protected closeModal(): void {
    this.modalImage.set(null);
    this.modalVideo.set(null);
    document.body.style.overflow = 'auto';
  }

  protected toggleDescription(): void {
    const el = this.descriptionTextRef?.nativeElement;
    const newExpanded = !this.descriptionExpanded();
    this.descriptionExpanded.set(newExpanded);
    if (el) {
      this.descriptionHeight.set(newExpanded ? `${el.scrollHeight}px` : `${parseFloat(getComputedStyle(el).lineHeight) * this.MAX_LINES}px`);
    }
  }
}
