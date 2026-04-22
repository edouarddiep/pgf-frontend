import {Component, inject, ChangeDetectionStrategy, signal, OnInit, OnDestroy, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ArchiveService } from '@core/services/archive.service';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { Archive } from '@core/models/archive.model';
import { catchError, EMPTY } from 'rxjs';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {NavService} from '@core/services/nav.service';

@Component({
  selector: 'app-archives',
  imports: [CommonModule, RouterModule, MatButtonModule, TranslatePipe],
  templateUrl: './archives.component.html',
  styleUrl: './archives.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchivesComponent implements OnInit, OnDestroy {
  private readonly archiveService = inject(ArchiveService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  private readonly navService = inject(NavService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly SCROLL_KEY = 'archives';

  protected readonly archives = signal<Archive[]>([]);

  ngOnInit(): void {
    this.loadArchives();
    this.scrollAnimationService.restoreScrollPosition(this.SCROLL_KEY);
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private loadArchives(): void {
    this.archiveService.getAllArchives()
      .pipe(catchError(() => EMPTY))
      .subscribe(archives => {
        this.archives.set(archives);
        setTimeout(() => this.setupTimelineAnimations(), 0);
      });
  }

  private setupTimelineAnimations(): void {
    const timelineItems = document.querySelectorAll('.timeline-item');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    });

    timelineItems.forEach(item => observer.observe(item));
  }

  onArchiveClick(archiveId: number): void {
    this.scrollAnimationService.saveScrollPosition(this.SCROLL_KEY);
    this.navService.navigate(['archives', archiveId]);
  }
}
