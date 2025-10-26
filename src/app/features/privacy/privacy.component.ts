import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';

@Component({
  selector: 'app-privacy',
  imports: [CommonModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivacyComponent implements OnInit, OnDestroy {
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  ngOnInit(): void {
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }
}
