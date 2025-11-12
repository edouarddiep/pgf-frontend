import { Component, inject, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { ArchiveService } from '@core/services/archive.service';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';
import { Archive } from '@core/models/archive.model';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-archives',
  imports: [CommonModule, RouterModule, MatButtonModule],
  templateUrl: './archives.component.html',
  styleUrl: './archives.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchivesComponent implements OnInit, OnDestroy {
  private readonly archiveService = inject(ArchiveService);
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  protected readonly archives = signal<Archive[]>([]);

  ngOnInit(): void {
    this.loadArchives();
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }

  private loadArchives(): void {
    this.archiveService.getAllArchives()
      .pipe(catchError(() => EMPTY))
      .subscribe(archives => this.archives.set(archives));
  }
}
