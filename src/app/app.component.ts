import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { VideoService } from '@shared/services/video.service';
import { LoadingService } from '@shared/services/loading.service';
import { FooterComponent } from '@layout/footer/footer.component';
import { HeaderComponent } from '@layout/header/header.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, LoadingSpinnerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly loadingService = inject(LoadingService);
  private readonly videoService = inject(VideoService);
  private readonly router = inject(Router);

  readonly isLoading = this.loadingService.isLoading;

  readonly isAdminRoute = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map((e: NavigationEnd) => e.urlAfterRedirects.startsWith('/admin')),
      startWith(this.router.url.startsWith('/admin'))
    )
  );

  ngOnInit(): void {
    this.videoService.preloadVideo('home');
  }
}
