import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { VideoService } from '@shared/services/video.service';
import {LoadingService} from '@shared/services/loading.service';
import {FooterComponent} from '@layout/footer/footer.component';
import {HeaderComponent} from '@layout/header/header.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly loadingService = inject(LoadingService);
  private readonly videoService = inject(VideoService);

  readonly isLoading = this.loadingService.isLoading;

  ngOnInit(): void {
    this.videoService.preloadVideo('home');
  }
}
