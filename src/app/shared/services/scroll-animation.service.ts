import { Injectable, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScrollAnimationService implements OnDestroy {
  private intersectionObserver?: IntersectionObserver;

  setupScrollAnimations(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
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
