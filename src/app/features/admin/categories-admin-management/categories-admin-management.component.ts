import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminService } from '@features/admin/services/admin.service';
import { ArtworkCategory } from '@core/models/artwork.model';
import { NotificationService } from '@shared/services/notification.service';
import { catchError, EMPTY, forkJoin } from 'rxjs';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { MatTooltip } from '@angular/material/tooltip';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import {HasUnsavedChanges} from '@features/admin/guards/unsaved-changes.guard';

type SortField = 'id' | 'name';

@Component({
  selector: 'app-categories-admin-management',
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, LoadingDirective, MatDialogModule,
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatTooltip,
    HighlightPipe
  ],
  templateUrl: './categories-admin-management.component.html',
  styleUrl: './categories-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesAdminManagementComponent implements OnInit, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly rawCategories = signal<ArtworkCategory[]>([]);
  protected readonly sortField = signal<SortField>('id');
  protected readonly sortAsc = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly editingCategory = signal<ArtworkCategory | null>(null);
  protected readonly displayedColumns = ['id', 'image', 'name', 'description', 'artworkCount', 'actions'];
  protected readonly pendingImageFile = signal<File | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly previewImageUrl = signal<string | null>(null);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');

  protected readonly categoryForm = this.fb.group({
    name: ['', Validators.required],
    slug: ['', [Validators.required, Validators.pattern('^[a-z0-9-]+$')]],
    description: [''],
    descriptionShort: [''],
  });

  protected readonly categories = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const query = this.normalize(this.searchQuery().trim());

    let base = this.rawCategories();
    if (query.length >= 2) {
      base = base.filter(c =>
        this.normalize(c.name ?? '').includes(query) ||
        this.normalize(c.description ?? '').includes(query)
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'id' ? a.id : (a.name ?? '');
      const vb = field === 'id' ? b.id : (b.name ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url;
    const isCreate = url.endsWith('/create');
    const isEdit = !!id && url.endsWith('/edit');

    if (isCreate || isEdit) {
      this.isFormMode.set(true);
      this.categoryForm.valueChanges.pipe(
        catchError(() => EMPTY)
      ).subscribe(() => this.hasUnsavedChanges.set(true));
      if (isEdit) {
        this.adminService.getCategories()
          .pipe(catchError(() => EMPTY))
          .subscribe(categories => {
            const category = categories.find(c => c.id === +id!);
            if (category) this.fillForm(category);
          });
      }
    } else {
      this.loadCategories();
    }
  }

  private fillForm(category: ArtworkCategory): void {
    this.editingCategory.set(category);
    this.categoryForm.setValue({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      descriptionShort: category.descriptionShort ?? ''
    });
    this.pendingImageFile.set(null);
    this.previewImageUrl.set(category.thumbnailUrl ?? null);
    this.hasUnsavedChanges.set(false);
  }

  protected sort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
  }

  protected openCreateForm(): void {
    this.router.navigate(['/admin/categories/create']);
  }

  protected openEditForm(category: ArtworkCategory): void {
    this.router.navigate(['/admin/categories', category.id, 'edit']);
  }

  protected cancelForm(): void {
    this.router.navigate(['/admin/categories']);
  }

  protected submitCategory(): void {
    if (this.categoryForm.invalid) return;
    this.isSubmitting.set(true);
    const editing = this.editingCategory();
    const slug = this.categoryForm.value.slug!;
    const file = this.pendingImageFile();

    const save = (thumbnailUrl?: string) => {
      const payload = { ...this.categoryForm.value, ...(thumbnailUrl ? { thumbnailUrl } : {}) };
      const operation = editing
        ? this.adminService.updateCategory(editing.id, payload)
        : this.adminService.createCategory(payload);

      operation.pipe(
        catchError((err) => {
          this.notificationService.error(err?.error?.message || 'Erreur lors de la sauvegarde');
          this.isSubmitting.set(false);
          return EMPTY;
        })
      ).subscribe(() => {
        this.notificationService.success(editing ? 'Catégorie modifiée avec succès' : 'Catégorie créée avec succès');
        this.isSubmitting.set(false);
        this.hasUnsavedChanges.set(false);
        this.router.navigate(['/admin/categories']);
      });
    };

    if (file) {
      this.adminService.uploadCategoryImage(file, slug).pipe(
        catchError(() => {
          this.notificationService.error('Erreur lors de l\'upload de l\'image');
          this.isSubmitting.set(false);
          return EMPTY;
        })
      ).subscribe(({ thumbnailUrl }) => save(thumbnailUrl));
    } else {
      save();
    }
  }

  protected deleteCategory(id: number, artworkCount: number): void {
    if (artworkCount > 0) {
      this.notificationService.error(`Impossible de supprimer cette catégorie : elle contient ${artworkCount} œuvre(s) liée(s)`);
      return;
    }
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;
    this.adminService.deleteCategory(id)
      .pipe(catchError((err) => {
        this.notificationService.error(err?.error?.message || 'Erreur lors de la suppression');
        return EMPTY;
      }))
      .subscribe(() => {
        this.notificationService.success('Catégorie supprimée');
        this.loadCategories();
      });
  }

  private loadCategories(): void {
    forkJoin({ categories: this.adminService.getCategories(), artworks: this.adminService.getArtworks() })
      .pipe(catchError(() => {
        this.notificationService.error('Erreur lors du chargement des catégories');
        return EMPTY;
      }))
      .subscribe(({ categories, artworks }) => {
        this.rawCategories.set(categories.map(c => ({
          ...c,
          artworkCount: artworks.filter(a => a.categoryIds?.includes(c.id)).length
        })));
      });
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingImageFile.set(file);
    this.previewImageUrl.set(URL.createObjectURL(file));
    this.hasUnsavedChanges.set(true);
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
    this.showImageModal.set(true);
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
