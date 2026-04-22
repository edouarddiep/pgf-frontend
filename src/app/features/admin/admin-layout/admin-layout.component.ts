import {ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatListModule} from '@angular/material/list';
import {MatLine} from '@angular/material/core';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {AdminService} from '@features/admin/services/admin.service';
import {NotificationService} from '@shared/services/notification.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {NavService} from '@core/services/nav.service';

@Component({
  selector: 'app-admin-layout',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe,
    MatLine
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  protected readonly navService = inject(NavService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly displayName = signal<string>('');
  protected readonly currentLang = computed(() => this.translateService.currentLang());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const jwt = sessionStorage.getItem('pgf-admin-jwt');
      if (jwt) {
        try {
          const payload = JSON.parse(atob(jwt.split('.')[1]));
          this.displayName.set(payload?.user_metadata?.display_name ?? '');
        } catch {
          this.displayName.set('');
        }
      } else {
        this.displayName.set('Admin');
      }
    }
  }

  protected setLang(lang: 'fr' | 'en'): void {
    this.translateService.setLang(lang);
  }

  protected logout(): void {
    this.adminService.logout();
    this.notificationService.info(this.translateService.translate('admin.layout.logoutSuccess'));
    this.navService.navigateHome()
  }
}
