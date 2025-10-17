import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '@features/admin/services/admin.service';
import { ArtworkCategory } from '@core/models/artwork.model';
import { NotificationService } from '@shared/services/notification.service';
import { catchError, EMPTY, forkJoin, finalize } from 'rxjs';

@Component({
  selector: 'app-categories-admin-management',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './categories-admin-management.component.html',
  styleUrl: './categories-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);

  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly displayedColumns = ['name', 'artworkCount'];
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoading.set(true);
    forkJoin({
      categories: this.adminService.getCategories(),
      artworks: this.adminService.getArtworks()
    })
      .pipe(
        catchError(() => {
          this.notificationService.error('Erreur lors du chargement des catégories');
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(({ categories, artworks }) => {
        const categoriesWithCount = categories.map(category => ({
          ...category,
          artworkCount: artworks.filter(artwork =>
            artwork.categoryIds?.includes(category.id)
          ).length
        }));
        this.categories.set(categoriesWithCount);
      });
  }
}
