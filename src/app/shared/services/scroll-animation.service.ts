import { Injectable, OnDestroy, inject } from '@angular/core';
import { LoadingService } from '@shared/services/loading.service';

@Injectable({
  providedIn: 'root'
})
export class ScrollAnimationService implements OnDestroy {
  private intersectionObserver?: IntersectionObserver;
  private scrollPositions = new Map<string, number>();
  private readonly loadingService = inject(LoadingService);

  saveScrollPosition(key: string): void {
    this.scrollPositions.set(key, window.scrollY);
  }

  hasScrollPosition(key: string): boolean {
    return this.scrollPositions.has(key);
  }

  restoreScrollPosition(key: string): void {
    const position = this.scrollPositions.get(key);

    if (position == null) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    this.scrollPositions.delete(key);
    this.loadingService.show();

    const attempt = (tries: number) => {
      if (document.documentElement.scrollHeight > position + window.innerHeight || tries >= 20) {
        window.scrollTo({ top: position, behavior: 'instant' });
        this.loadingService.hide();
      } else {
        setTimeout(() => attempt(tries + 1), 150);
      }
    };
    setTimeout(() => attempt(0), 100);
  }

  setupScrollAnimations(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.scroll-fade-in');
      elements.forEach(el => this.intersectionObserver?.observe(el));
    }, 100);
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  disconnect(): void {
    this.intersectionObserver?.disconnect();
  }
}
