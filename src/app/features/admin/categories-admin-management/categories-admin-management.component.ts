import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { AdminService } from '@features/admin/services/admin.service';
import { ArtworkCategory } from '@core/models/artwork.model';
import { catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-categories-admin-management',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './categories-admin-management.component.html',
  styleUrl: './categories-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly displayedColumns = ['name', 'artworkCount', 'displayOrder'];

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.adminService.getCategories()
      .pipe(catchError(() => EMPTY))
      .subscribe(categories => {
        this.categories.set(categories);
      });
  }
}
