import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { EMPTY, catchError, finalize } from 'rxjs';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { HasUnsavedChanges } from '@features/admin/guards/unsaved-changes.guard';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { FileUploadService } from '@core/services/file-upload.service';
import { TranslateService } from '@core/services/translate.service';
import { LocaleService } from '@core/services/locale.service';

@Component({
  selector: 'app-artworks-admin-form',
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCardModule,
    MatTooltipModule, MatProgressSpinnerModule, ImageUploadComponent, TranslatePipe
  ],
  templateUrl: './artworks-admin-form.component.html',
  styleUrl: './artworks-admin-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksAdminFormComponent implements OnInit, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly translateService = inject(TranslateService);
  protected readonly localeService = inject(LocaleService);
  protected readonly lang = computed(() => this.translateService.currentLang());

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartPosX = 50;
  private dragStartPosY = 50;

  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly editingArtwork = signal<Artwork | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');
  protected readonly imageRequired = signal(false);

  protected readonly mainImageUrl = signal<string | undefined>(undefined);
  protected readonly mainImageFile = signal<File | null>(null);
  protected readonly mainImagePositionX = signal(50);
  protected readonly mainImagePositionY = signal(50);
  protected readonly mainImageZoom = signal(100);
  protected readonly uploadedImageUrls = signal<string[]>([]);

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = () => true;

  protected readonly artworkForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    imageUrls: [[] as string[]],
    categoryIds: [[] as number[], [(control) => {
      const val = control.value;
      return val && val.length > 0 ? null : { required: true };
    }]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.loadCategories().subscribe(categories => {
      this.categories.set(categories);
      if (id) {
        this.adminService.getArtworks()
          .pipe(catchError(() => EMPTY))
          .subscribe(artworks => {
            const artwork = artworks.find(a => a.id === +id);
            if (artwork) this.fillForm(artwork);
            this.trackChanges();
          });
      } else {
        this.trackChanges();
      }
    });
  }

  private loadCategories() {
    return this.adminService.getCategories().pipe(catchError(() => EMPTY));
  }

  private trackChanges(): void {
    this.artworkForm.valueChanges.subscribe(() => this.hasUnsavedChanges.set(true));
  }

  private fillForm(artwork: Artwork): void {
    this.editingArtwork.set(artwork);
    this.artworkForm.setValue({
      title: artwork.title,
      description: artwork.description || '',
      imageUrls: artwork.imageUrls || [],
      categoryIds: artwork.categoryIds ? Array.from(artwork.categoryIds) : []
    });
    this.artworkForm.markAsPristine();
    this.artworkForm.markAsUntouched();
    this.mainImageUrl.set(artwork.mainImageUrl);
    this.mainImageFile.set(null);
    this.mainImagePositionX.set(artwork.mainImagePositionX ?? 50);
    this.mainImagePositionY.set(artwork.mainImagePositionY ?? 50);
    this.mainImageZoom.set(artwork.mainImageZoom ?? 100);
    this.uploadedImageUrls.set((artwork.imageUrls || []).filter(u => u !== artwork.mainImageUrl));
    this.hasUnsavedChanges.set(false);
  }

  protected cancel(): void {
    this.router.navigate(['/admin/artworks']);
  }

  protected saveArtwork(): void {
    this.imageRequired.set(!this.mainImageUrl());
    if (this.artworkForm.invalid || this.isSubmitting() || !this.mainImageUrl()) return;

    this.isSubmitting.set(true);
    const formValue = this.artworkForm.value;
    const editing = this.editingArtwork();

    const save = (finalMainImageUrl?: string) => {
      const resolvedMain = finalMainImageUrl ?? this.mainImageUrl()!;
      const payload = {
        title: formValue.title!,
        description: formValue.description,
        imageUrls: [resolvedMain, ...this.uploadedImageUrls()],
        mainImageUrl: resolvedMain,
        mainImagePositionX: Math.round(this.mainImagePositionX()),
        mainImagePositionY: Math.round(this.mainImagePositionY()),
        mainImageZoom: this.mainImageZoom(),
        categoryIds: formValue.categoryIds!
      };

      const operation = editing
        ? this.adminService.updateArtwork(editing.id, payload)
        : this.adminService.createArtwork(payload);

      operation.pipe(
        catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.artworks.saveError'));
          return EMPTY;
        }),
        finalize(() => this.isSubmitting.set(false))
      ).subscribe(() => {
        this.notificationService.success(
          this.translateService.translate(editing ? 'admin.artworks.saveSuccess' : 'admin.artworks.createSuccess')
        );
        window.dispatchEvent(new CustomEvent('artworkChanged'));
        this.hasUnsavedChanges.set(false);
        this.router.navigate(['/admin/artworks']);
      });
    };

    const file = this.mainImageFile();
    if (file) {
      this.fileUploadService.uploadImage(file, this.getCategorySlugForUpload()).pipe(
        catchError(() => {
          this.notificationService.error('Erreur lors de l\'upload de l\'image principale');
          this.isSubmitting.set(false);
          return EMPTY;
        })
      ).subscribe(result => save(result.imageUrl));
    } else {
      save();
    }
  }

  protected deleteArtwork(id: number): void {
    this.confirmDialog.confirm({
      title: this.translateService.translate('admin.artworks.deleteConfirmTitle'),
      message: this.translateService.translate('admin.artworks.deleteConfirmMessage'),
      confirmLabel: this.translateService.translate('admin.common.delete'),
      cancelLabel: this.translateService.translate('admin.common.cancel')
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.adminService.deleteArtwork(id)
        .pipe(catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.artworks.deleteError'));
          return EMPTY;
        }))
        .subscribe(() => {
          this.notificationService.success(this.translateService.translate('admin.artworks.deleteSuccess'));
          window.dispatchEvent(new CustomEvent('artworkChanged'));
          this.hasUnsavedChanges.set(false);
          this.router.navigate(['/admin/artworks']);
        });
    });
  }

  protected onMainImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.mainImageFile.set(file);
    this.mainImageUrl.set(URL.createObjectURL(file));
    this.mainImagePositionX.set(50);
    this.mainImagePositionY.set(50);
    this.mainImageZoom.set(100);
    this.imageRequired.set(false);
    this.hasUnsavedChanges.set(true);
  }

  protected startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartPosX = this.mainImagePositionX();
    this.dragStartPosY = this.mainImagePositionY();
    event.preventDefault();
  }

  protected onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    const previewEl = event.currentTarget as HTMLElement;
    const sensitivity = 100 / this.mainImageZoom();
    const deltaX = ((event.clientX - this.dragStartX) / previewEl.offsetWidth) * -100 * sensitivity;
    const deltaY = ((event.clientY - this.dragStartY) / previewEl.offsetHeight) * -100 * sensitivity;
    this.mainImagePositionX.set(Math.min(100, Math.max(0, this.dragStartPosX + deltaX)));
    this.mainImagePositionY.set(Math.min(100, Math.max(0, this.dragStartPosY + deltaY)));
    this.hasUnsavedChanges.set(true);
  }

  protected stopDrag(): void {
    this.isDragging = false;
  }

  protected onZoomChange(value: string): void {
    this.mainImageZoom.set(+value);
    this.hasUnsavedChanges.set(true);
  }

  protected onOtherImagesChanged(event: { urls: string[]; mainUrl: string | undefined }): void {
    if (event.mainUrl) {
      const previousMain = this.mainImageUrl();
      const otherUrls = [
        ...(previousMain ? [previousMain] : []),
        ...event.urls.filter(u => u !== event.mainUrl)
      ];
      this.uploadedImageUrls.set(otherUrls);
      this.mainImageUrl.set(event.mainUrl);
      this.mainImageFile.set(null);
      this.mainImagePositionX.set(50);
      this.mainImagePositionY.set(50);
      this.mainImageZoom.set(100);
    } else {
      this.uploadedImageUrls.set(event.urls.filter(u => u !== this.mainImageUrl()));
    }
    this.hasUnsavedChanges.set(true);
  }

  protected isFormValidForSubmit(): boolean {
    if (!this.artworkForm.valid || !this.mainImageUrl()) return false;
    if (this.editingArtwork()) return this.hasUnsavedChanges();
    return true;
  }

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
    this.showImageModal.set(true);
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
  }

  protected getCategorySlugForUpload(): string {
    const ids = this.artworkForm.value.categoryIds;
    if (!ids || ids.length === 0) return 'general';
    return this.categories().find(c => c.id === ids[0])?.slug ?? 'general';
  }

  protected async downloadImage(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = url.split('/').pop()?.split('?')[0] ?? 'image';
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      this.notificationService.error('Erreur lors du téléchargement');
    }
  }

  protected async downloadAllImages(): Promise<void> {
    const all = [this.mainImageUrl(), ...this.uploadedImageUrls()].filter((u): u is string => !!u);
    if (all.length === 0) return;

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    await Promise.all(
      all.map(async (url, i) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          const ext = url.split('.').pop()?.split('?')[0] ?? 'jpg';
          zip.file(`image_${i + 1}.${ext}`, blob);
        } catch { /* skip */ }
      })
    );

    const content = await zip.generateAsync({ type: 'blob' });
    const objectUrl = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = objectUrl;
    const title = this.artworkForm.value.title ?? 'oeuvre';
    a.download = `${title.replace(/\s+/g, '_')}_images.zip`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }
}
