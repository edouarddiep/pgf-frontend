import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AdminService } from '@features/admin/services/admin.service';
import { forkJoin, catchError, EMPTY, fromEvent, merge } from 'rxjs';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { NavService } from '@core/services/nav.service';

interface DashboardStats {
  categories: number;
  artworks: number;
  exhibitions: number;
  archives: number;
  messages: number;
  unreadMessages: number;
}

interface StatCard {
  key: keyof DashboardStats;
  icon: string;
  labelKey: string;
  actionKey: string;
  route: string;
}

interface QuickAction {
  icon: string;
  labelKey: string;
  route: string;
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [MatCardModule, MatIconModule, MatButtonModule, RouterLink, TranslatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminDashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminService = inject(AdminService);
  protected readonly navService = inject(NavService);

  protected readonly isLoading = signal(true);

  protected readonly stats = signal<DashboardStats>({
    categories: 0,
    artworks: 0,
    exhibitions: 0,
    archives: 0,
    messages: 0,
    unreadMessages: 0
  });

  private readonly manage = 'admin.dashboard.manage';

  protected readonly cards: StatCard[] = [
    { key: 'categories', icon: 'category', labelKey: 'admin.dashboard.stats.categories', actionKey: this.manage, route: '/admin/categories' },
    { key: 'artworks', icon: 'palette', labelKey: 'admin.dashboard.stats.artworks', actionKey: this.manage, route: '/admin/artworks' },
    { key: 'exhibitions', icon: 'event', labelKey: 'admin.dashboard.stats.exhibitions', actionKey: this.manage, route: '/admin/exhibitions' },
    { key: 'archives', icon: 'archive', labelKey: 'admin.dashboard.stats.archives', actionKey: this.manage, route: '/admin/archives' },
    { key: 'messages', icon: 'mail', labelKey: 'admin.dashboard.stats.messages', actionKey: 'admin.dashboard.consult', route: '/admin/messages' }
  ];

  protected readonly quickActions: QuickAction[] = [
    { icon: 'palette', labelKey: 'admin.dashboard.addArtwork', route: '/admin/artworks/create' },
    { icon: 'category', labelKey: 'admin.dashboard.addCategory', route: '/admin/categories/create' },
    { icon: 'event', labelKey: 'admin.dashboard.addExhibition', route: '/admin/exhibitions/create' },
    { icon: 'archive', labelKey: 'admin.dashboard.addArchive', route: '/admin/archives/create' }
  ];

  ngOnInit(): void {
    this.loadStats();

    merge(fromEvent(window, 'artworkChanged'), fromEvent(window, 'exhibitionChanged'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadStats());
  }

  private loadStats(): void {
    forkJoin({
      categories: this.adminService.getCategories(),
      artworks: this.adminService.getArtworks(),
      exhibitions: this.adminService.getExhibitions(),
      archives: this.adminService.getArchives(),
      messages: this.adminService.getMessages()
    })
      .pipe(catchError(() => {
        this.isLoading.set(false);
        return EMPTY;
      }))
      .subscribe(data => {
        this.stats.set({
          categories: data.categories.length,
          artworks: data.artworks.length,
          exhibitions: data.exhibitions.length,
          archives: data.archives.length,
          messages: data.messages.length,
          unreadMessages: data.messages.filter(message => !message.isRead).length
        });
        this.isLoading.set(false);
      });
  }
}
