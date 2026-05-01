import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectorRef, ViewChild, ElementRef
} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
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

@Component({
  selector: 'app-archive-detail',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, TranslatePipe],
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
  protected readonly lang = computed(() => this.translateService.currentLang());
  private readonly SCROLL_KEY = 'archives';


  protected readonly archive = signal<Archive | null>(null);
  protected readonly modalImage = signal<string | null>(null);
  protected readonly modalTitle = signal<string>('');
  protected readonly modalVideo = signal<ArchiveFile | null>(null);
  protected readonly descriptionExpanded = signal<boolean>(false);
  protected readonly showToggle = signal<boolean>(false);
  protected readonly descriptionHeight = signal<string>('0px');

  private readonly LINE_HEIGHT_EM = 1.8;
  private readonly MAX_LINES = 5;

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
        setTimeout(() => {
          this.scrollAnimationService.setupScrollAnimations();
          this.checkDescriptionOverflow();
        }, 100);
      });
  }

  private checkDescriptionOverflow(): void {
    const el = this.descriptionTextRef?.nativeElement;
    if (!el) { return; }
    const lineHeightPx = parseFloat(getComputedStyle(el).lineHeight);
    const maxHeight = lineHeightPx * this.MAX_LINES;
    const scrollH = el.scrollHeight;
    this.showToggle.set(scrollH > maxHeight + 4);
    this.descriptionHeight.set(`${Math.min(scrollH, maxHeight)}px`);
    this.cdr.detectChanges();
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
