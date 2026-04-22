import {Component, inject, ChangeDetectionStrategy, signal, HostListener, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
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
  protected readonly langPrefix = computed(() => `/${this.translateService.currentLang()}-ch`);
  protected readonly currentLang = computed(() => this.translateService.currentLang());


  private lastScrollY = 0;

  readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map(result => result.matches)
  );

  isMobileMenuOpen = signal(false);
  isHidden = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    const currentScrollY = window.scrollY;
    this.isHidden.set(currentScrollY > this.lastScrollY && currentScrollY > 64);
    this.lastScrollY = currentScrollY;
  }

  protected toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(value => !value);
  }

  protected closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  protected setLang(lang: 'fr' | 'en'): void {
    this.translateService.setLang(lang);
    const currentUrl = this.router.url;
    const newUrl = currentUrl.replace(/^\/(fr|en)-ch/, `/${lang}-ch`);
    this.router.navigateByUrl(newUrl).then(r => true);
  }
}
