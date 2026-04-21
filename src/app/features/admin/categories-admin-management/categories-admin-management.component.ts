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
import { HasUnsavedChanges } from '@features/admin/guards/unsaved-changes.guard';
import { ExportColumn, ExportService } from '@shared/services/export.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {TruncatePipe} from '@core/pipes/truncate.pipe';

type SortField = 'id' | 'name';

@Component({
  selector: 'app-categories-admin-management',
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, LoadingDirective, MatDialogModule,
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatTooltip,
    HighlightPipe, TranslatePipe, TruncatePipe
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
  private readonly exportService = inject(ExportService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private readonly rawCategories = signal<ArtworkCategory[]>([]);
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPosX = 50;
  private dragStartPosY = 50;

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
  protected readonly tooltipText = signal<string>('');
  protected readonly tooltipX = signal(0);
  protected readonly tooltipY = signal(0);
  protected readonly imageRequired = signal(false);
  protected readonly positionX = signal(50);
  protected readonly positionY = signal(50);
  protected readonly zoom = signal(100);

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = signal(false);

  protected readonly categoryForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  protected readonly categories = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const query = this.normalize(this.searchQuery().trim());
    const tokens = query.split(/\s+/).filter(t => t.length >= 1);

    let base = this.rawCategories();
    if (tokens.length > 0) {
      base = base.filter(c =>
        tokens.every(token =>
          c.id?.toString().includes(token) ||
          this.normalize(c.name ?? '').includes(token) ||
          this.normalize(c.description ?? '').includes(token)
        )
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'id' ? a.id : this.normalize(a.name ?? '');
      const vb = field === 'id' ? b.id : this.normalize(b.name ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url;
    const isCreate = url.endsWith('/create');
    const isEdit = !!id && url.endsWith('/edit');

    if (isCreate || isEdit) {
      this.isFormMode.set(true);
      this.categoryForm.valueChanges
        .pipe(catchError(() => EMPTY))
        .subscribe(() => this.hasUnsavedChanges.set(true));
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
      description: category.description ?? ''
    });
    this.pendingImageFile.set(null);
    this.previewImageUrl.set(category.thumbnailUrl ?? null);
    this.positionX.set(category.thumbnailPositionX ?? 50);
    this.positionY.set(category.thumbnailPositionY ?? 50);
    this.zoom.set(category.thumbnailZoom ?? 100);
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
    this.positionX.set(50);
    this.positionY.set(50);
    this.zoom.set(100);
    this.router.navigate(['/admin/categories/create']);
  }

  protected openEditForm(category: ArtworkCategory): void {
    this.router.navigate(['/admin/categories', category.id, 'edit']);
  }

  protected cancelForm(): void {
    this.router.navigate(['/admin/categories']);
  }

  protected submitCategory(): void {
    this.imageRequired.set(!this.previewImageUrl());
    if (this.categoryForm.invalid || this.isSubmitting() || !this.previewImageUrl()) return;
    this.isSubmitting.set(true);

    const { name, description } = this.categoryForm.value;
    const editing = this.editingCategory();
    const slug = editing?.slug ?? this.generateSlug(name!);
    const file = this.pendingImageFile();

    const save = (thumbnailUrl?: string) => {
      const payload = {
        name: name!,
        slug,
        description,
        thumbnailPositionX: Math.round(this.positionX()),
        thumbnailPositionY: Math.round(this.positionY()),
        thumbnailZoom: this.zoom(),
        ...(thumbnailUrl ? { thumbnailUrl } : {})
      };
      const operation = editing
        ? this.adminService.updateCategory(editing.id, payload)
        : this.adminService.createCategory(payload);

      operation.pipe(
        catchError(err => {
          this.notificationService.error(this.translateService.translate('admin.categories.saveError'));
          this.isSubmitting.set(false);
          return EMPTY;
        })
      ).subscribe(() => {
        this.notificationService.success(
          this.translateService.translate(editing ? 'admin.categories.saveSuccess' : 'admin.categories.createSuccess')
        );
        this.isSubmitting.set(false);
        this.hasUnsavedChanges.set(false);
        this.router.navigate(['/admin/categories']);
      });
    };

    if (file) {
      this.adminService.uploadCategoryImage(file, slug).pipe(
        catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.categories.uploadError'));
          this.isSubmitting.set(false);
          return EMPTY;
        })
      ).subscribe(({ thumbnailUrl }) => save(thumbnailUrl));
    } else {
      save(this.previewImageUrl() ?? undefined);
    }
  }

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingImageFile.set(file);
    this.previewImageUrl.set(URL.createObjectURL(file));
    this.positionX.set(50);
    this.positionY.set(50);
    this.zoom.set(100);
    this.imageRequired.set(false);
    this.hasUnsavedChanges.set(true);
  }

  protected startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartPosX = this.positionX();
    this.dragStartPosY = this.positionY();
    event.preventDefault();
  }

  protected onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    const previewEl = event.currentTarget as HTMLElement;
    const sensitivity = 100 / this.zoom();
    const deltaX = ((event.clientX - this.dragStartX) / previewEl.offsetWidth) * -100 * sensitivity;
    const deltaY = ((event.clientY - this.dragStartY) / previewEl.offsetHeight) * -100 * sensitivity;
    this.positionX.set(Math.min(100, Math.max(0, this.dragStartPosX + deltaX)));
    this.positionY.set(Math.min(100, Math.max(0, this.dragStartPosY + deltaY)));
    this.hasUnsavedChanges.set(true);
    this.categoryForm.markAsDirty();
  }

  protected stopDrag(): void {
    this.isDragging = false;
  }

  protected onZoomChange(value: string): void {
    this.zoom.set(+value);
    this.hasUnsavedChanges.set(true);
    this.categoryForm.markAsDirty();
  }

  private loadCategories(): void {
    forkJoin({ categories: this.adminService.getCategories(), artworks: this.adminService.getArtworks() })
      .pipe(catchError(() => {
        this.notificationService.error(this.translateService.translate('admin.categories.loadError'));
        return EMPTY;
      }))
      .subscribe(({ categories, artworks }) => {
        this.rawCategories.set(categories.map(c => ({
          ...c,
          artworkCount: artworks.filter(a => a.categoryIds?.includes(c.id)).length
        })));
      });
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

  protected showTooltip(event: MouseEvent, text: string): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.tooltipText.set(text);
    this.tooltipX.set(rect.left + rect.width / 2 - 210);
    this.tooltipY.set(rect.top - 8);
  }

  protected hideTooltip(): void {
    this.tooltipText.set('');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private generateSlug(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  protected exportData(): void {
    const lang = this.translateService.currentLang();
    const isEn = lang === 'en';
    const columns: ExportColumn<ArtworkCategory>[] = [
      { header: 'ID', value: c => c.id },
      { header: isEn ? 'Name' : 'Nom', value: c => this.localeService.resolve(c, 'name') },
      { header: isEn ? 'Description' : 'Description', value: c => this.localeService.resolve(c, 'description') },
      { header: isEn ? 'Artworks' : 'Nb oeuvres', value: c => c.artworkCount ?? 0 }
    ];
    this.exportService.exportToExcel(this.categories(), columns, isEn ? 'categories' : 'categories');
  }
}
