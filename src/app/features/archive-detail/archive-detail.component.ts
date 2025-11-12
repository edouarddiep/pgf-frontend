import { Component, inject, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ArchiveService } from '@core/services/archive.service';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { Archive, ArchiveFile } from '@core/models/archive.model';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-archive-detail',
  imports: [CommonModule],
  templateUrl: './archive-detail.component.html',
  styleUrl: './archive-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchiveDetailComponent implements OnInit, OnDestroy {
  private readonly archiveService = inject(ArchiveService);
  private readonly route = inject(ActivatedRoute);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly archive = signal<Archive | null>(null);
  protected readonly modalImage = signal<string | null>(null);
  protected readonly modalTitle = signal<string>('');
  protected readonly modalVideo = signal<ArchiveFile | null>(null);

  protected readonly audioFiles = computed(() =>
    this.archive()?.files?.filter(f => f.fileType === 'AUDIO') || []
  );

  protected readonly imageFiles = computed(() =>
    this.archive()?.files?.filter(f => f.fileType === 'IMAGE') || []
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
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private loadArchive(id: number): void {
    this.archiveService.getArchiveById(id)
      .pipe(catchError(() => EMPTY))
      .subscribe(archive => this.archive.set(archive));
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
}
