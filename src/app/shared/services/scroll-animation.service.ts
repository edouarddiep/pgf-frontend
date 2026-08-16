import { Injectable, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoadingService } from '@shared/services/loading.service';

const VISIBLE_CLASS = 'visible';

@Injectable({
  providedIn: 'root'
})
export class ScrollAnimationService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly loadingService = inject(LoadingService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly observers = new Map<string, IntersectionObserver>();
  private scrollPositions = new Map<string, number>();

  saveScrollPosition(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    this.scrollPositions.set(key, window.scrollY);
  }

  hasScrollPosition(key: string): boolean {
    return this.scrollPositions.has(key);
  }

  restoreScrollPosition(key: string): void {
    if (!this.isBrowser) {
      return;
    }

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
    this.observeElements('.scroll-fade-in', { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }, 100);
  }

  observeElements(selector: string, options: IntersectionObserverInit, delayMs = 0): void {
    if (!this.isBrowser) {
      return;
    }

    this.observers.get(selector)?.disconnect();

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(VISIBLE_CLASS);
        }
      });
    }, options);

    this.observers.set(selector, observer);

    setTimeout(() => {
      document.querySelectorAll(selector).forEach(element => observer.observe(element));
    }, delayMs);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}
