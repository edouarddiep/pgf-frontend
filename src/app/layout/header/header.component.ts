import {Component, inject, ChangeDetectionStrategy, signal, HostListener, computed, PLATFORM_ID} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly langPrefix = computed(() => `/${this.translateService.currentLang()}-ch`);
  protected readonly currentLang = computed(() => this.translateService.currentLang());


  private lastScrollY = 0;
  private lockedScrollY = 0;

  readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map(result => result.matches)
  );

  isMobileMenuOpen = signal(false);
  isHidden = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.isMobileMenuOpen()) {
      return;
    }

    const currentScrollY = window.scrollY;
    this.isHidden.set(currentScrollY > this.lastScrollY && currentScrollY > 64);
    this.lastScrollY = currentScrollY;
  }

  protected toggleMobileMenu(): void {
    this.setMobileMenu(!this.isMobileMenuOpen());
  }

  protected closeMobileMenu(): void {
    this.setMobileMenu(false);
  }

  private setMobileMenu(open: boolean): void {
    if (open === this.isMobileMenuOpen()) {
      return;
    }

    this.isMobileMenuOpen.set(open);

    if (!this.isBrowser) {
      return;
    }

    if (open) {
      this.lockScroll();
    } else {
      this.unlockScroll();
    }
  }

  // `overflow: hidden` seul est ignoré par Safari iOS : on fige le body et on
  // compense par un décalage, puis on restaure la position à la fermeture.
  private lockScroll(): void {
    this.lockedScrollY = window.scrollY;
    this.document.body.style.setProperty('--scroll-lock-offset', `-${this.lockedScrollY}px`);
    this.document.body.classList.add('scroll-locked');
  }

  private unlockScroll(): void {
    this.document.body.classList.remove('scroll-locked');
    this.document.body.style.removeProperty('--scroll-lock-offset');
    window.scrollTo({ top: this.lockedScrollY, behavior: 'instant' });
    this.lastScrollY = this.lockedScrollY;
  }

  protected setLang(lang: 'fr' | 'en'): void {
    this.translateService.setLang(lang);
    const currentUrl = this.router.url;
    const newUrl = currentUrl.replace(/^\/(fr|en)-ch/, `/${lang}-ch`);
    this.router.navigateByUrl(newUrl).then(r => true);
  }
}
