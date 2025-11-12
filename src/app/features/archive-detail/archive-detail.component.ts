import { Component, inject, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';
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
}
