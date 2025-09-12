import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { ArtworkCategory } from '@core/models/artwork.model';
import { catchError, EMPTY } from 'rxjs';
import {AdminCategoryRequest, AdminService} from '@features/admin/services/admin.service';

interface CategoryFormData {
  name: string;
  description: string;
  slug: string;
  displayOrder: number;
}

@Component({
  selector: 'app-categories-admin-management',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule
  ],
  templateUrl: './categories-admin-management.component.html',
  styleUrl: './categories-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingCategory = signal<ArtworkCategory | null>(null);
  protected readonly displayedColumns = ['name', 'slug', 'description', 'displayOrder', 'actions'];

  protected readonly categoryForm = this.fb.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    slug: ['', [Validators.required]],
    displayOrder: [0, [Validators.required, Validators.min(0)]]
  });

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

  protected openForm(): void {
    this.showForm.set(true);
    this.editingCategory.set(null);
    this.categoryForm.reset({
      name: '',
      description: '',
      slug: '',
      displayOrder: 0
    });
  }

  protected editCategory(category: ArtworkCategory): void {
    this.showForm.set(true);
    this.editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description,
      slug: category.slug,
      displayOrder: category.displayOrder
    });
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingCategory.set(null);
    this.categoryForm.reset();
  }

  protected generateSlug(): void {
    const name = this.categoryForm.get('name')?.value || '';
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    this.categoryForm.patchValue({ slug });
  }

  protected saveCategory(): void {
    if (this.categoryForm.invalid) return;

    const formData = this.categoryForm.value as CategoryFormData;
    const request: AdminCategoryRequest = {
      name: formData.name,
      description: formData.description,
      slug: formData.slug,
      displayOrder: formData.displayOrder
    };

    const editing = this.editingCategory();
    const operation = editing
      ? this.adminService.updateCategory(editing.id, request)
      : this.adminService.createCategory(request);

    operation
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.cancelForm();
        this.loadCategories();
      });
  }

  protected deleteCategory(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return;
    }

    this.adminService.deleteCategory(id)
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.loadCategories();
      });
  }
}
