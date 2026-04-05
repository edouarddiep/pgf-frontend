import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
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
import { LoadingDirective } from '@/app/directives/loading.directive';

type SortField = 'id' | 'name';

@Component({
  selector: 'app-categories-admin-management',
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule, LoadingDirective],
  templateUrl: './categories-admin-management.component.html',
  styleUrl: './categories-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);

  private readonly rawCategories = signal<ArtworkCategory[]>([]);
  protected readonly sortField = signal<SortField>('id');
  protected readonly sortAsc = signal(true);
  protected readonly displayedColumns = ['id', 'name', 'description', 'artworkCount'];

  protected readonly categories = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    return [...this.rawCategories()].sort((a, b) => {
      const va = field === 'id' ? a.id : (a.name ?? '');
      const vb = field === 'id' ? b.id : (b.name ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  protected sort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
  }

  private loadCategories(): void {
    forkJoin({ categories: this.adminService.getCategories(), artworks: this.adminService.getArtworks() })
      .pipe(catchError(() => { this.notificationService.error('Erreur lors du chargement des catégories'); return EMPTY; }), finalize(() => {}))
      .subscribe(({ categories, artworks }) => {
        this.rawCategories.set(categories.map(c => ({
          ...c,
          artworkCount: artworks.filter(a => a.categoryIds?.includes(c.id)).length
        })));
      });
  }
}
