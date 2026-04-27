import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdminService } from '@features/admin/services/admin.service';
import { ArtworkCategory } from '@core/models/artwork.model';
import { NotificationService } from '@shared/services/notification.service';
import { catchError, EMPTY } from 'rxjs';
import { HasUnsavedChanges } from '@features/admin/guards/unsaved-changes.guard';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-categories-admin-form',
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatCardModule, MatFormFieldModule, MatInputModule, TranslatePipe, MatTooltip
  ],
  templateUrl: './categories-admin-form.component.html',
  styleUrl: './categories-admin-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesAdminFormComponent implements OnInit, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPosX = 50;
  private dragStartPosY = 50;

  protected readonly editingCategory = signal<ArtworkCategory | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly pendingImageFile = signal<File | null>(null);
  protected readonly previewImageUrl = signal<string | null>(null);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');
  protected readonly imageRequired = signal(false);
  protected readonly positionX = signal(50);
  protected readonly positionY = signal(50);
  protected readonly zoom = signal(100);

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = () => true;

  protected readonly categoryForm = this.fb.group({
    name: ['', Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.categoryForm.valueChanges
      .pipe(catchError(() => EMPTY))
      .subscribe(() => this.hasUnsavedChanges.set(true));

    if (id) {
      this.adminService.getCategories()
        .pipe(catchError(() => EMPTY))
        .subscribe(categories => {
          const category = categories.find(c => c.id === +id);
          if (category) this.fillForm(category);
        });
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

  protected cancel(): void {
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
        catchError(() => {
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

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
    this.showImageModal.set(true);
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
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
}
