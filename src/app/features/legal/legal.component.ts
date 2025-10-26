import {Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollAnimationService } from '@shared/services/scroll-animation.service';

@Component({
  selector: 'app-legal',
  imports: [CommonModule],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LegalComponent implements OnInit, OnDestroy {
  private readonly scrollAnimationService = inject(ScrollAnimationService);

  ngOnInit(): void {
    this.scrollAnimationService.setupScrollAnimations();
  }

  ngOnDestroy(): void {
    this.scrollAnimationService.disconnect();
  }
}
