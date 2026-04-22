import { Component, inject, OnInit, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { VideoService } from '@shared/services/video.service';
import { LoadingService } from '@shared/services/loading.service';
import { FooterComponent } from '@layout/footer/footer.component';
import { HeaderComponent } from '@layout/header/header.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith, take } from 'rxjs';
import { TranslateService } from '@core/services/translate.service';

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
  private readonly translateService = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

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

    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(
        filter(e => e instanceof NavigationEnd),
        take(1)
      ).subscribe((e: NavigationEnd) => {
        const match = e.urlAfterRedirects.match(/^\/(fr|en)-ch/);
        if (match) {
          this.translateService.setLang(match[1] as 'fr' | 'en');
        }
      });
    }
  }
}
