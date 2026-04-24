import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { forkJoin, EMPTY, catchError, finalize } from 'rxjs';
import { LoadingDirective } from '@/app/directives/loading.directive';
import { HighlightPipe } from '@core/pipes/highlight.pipe';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { HasUnsavedChanges } from '@features/admin/guards/unsaved-changes.guard';
import { ExportColumn, ExportService } from '@shared/services/export.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { ConfirmDialogService } from '@shared/services/confirm-dialog.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { FileUploadService } from '@core/services/file-upload.service';
import {TranslateService} from '@core/services/translate.service';
import {LocaleService} from '@core/services/locale.service';
import {TruncatePipe} from '@core/pipes/truncate.pipe';

@Component({
  selector: 'app-artworks-admin-management',
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCardModule, MatChipsModule,
    MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule,
    LoadingDirective, HighlightPipe, ImageUploadComponent, TranslatePipe, LoadingSpinnerComponent, TruncatePipe
  ],
  templateUrl: './artworks-admin-management.component.html',
  styleUrl: './artworks-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksAdminManagementComponent implements OnInit, HasUnsavedChanges {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly exportService = inject(ExportService);
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

  protected readonly artworks = signal<Artwork[]>([]);
  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly editingArtwork = signal<Artwork | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');
  protected readonly imageRequired = signal(false);

  protected readonly mainImageUrl = signal<string | undefined>(undefined);
  protected readonly mainImageFile = signal<File | null>(null);
  protected readonly mainImagePositionX = signal(50);
  protected readonly mainImagePositionY = signal(50);
  protected readonly mainImageZoom = signal(100);
  protected readonly uploadedImageUrls = signal<string[]>([]);

  protected readonly displayedColumns = ['id', 'image', 'title', 'categories', 'actions'];
  protected selectedCategoryFilter = '';

  private readonly rawArtworks = signal<Artwork[]>([]);
  private readonly rawFilteredArtworks = signal<Artwork[]>([]);
  protected readonly sortField = signal<'id' | 'title'>('id');
  protected readonly sortAsc = signal(true);
  protected readonly searchQuery = signal('');

  readonly hasUnsavedChanges = signal(false);
  readonly isFormMode = signal(false);

  protected readonly filteredArtworks = computed(() => {
    const field = this.sortField();
    const asc = this.sortAsc();
    const query = this.normalize(this.searchQuery().trim());
    const tokens = query.split(/\s+/).filter(t => t.length >= 1);

    let base = this.rawFilteredArtworks();
    if (tokens.length > 0) {
      base = base.filter(a =>
        tokens.every(token =>
          a.id?.toString().includes(token) ||
          this.normalize(a.title ?? '').includes(token)
        )
      );
    }

    return [...base].sort((a, b) => {
      const va = field === 'id' ? a.id : this.normalize(a.title ?? '');
      const vb = field === 'id' ? b.id : this.normalize(b.title ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

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
    const url = this.router.url;
    const isCreate = url.endsWith('/create');
    const isEdit = !!id && url.endsWith('/edit');

    if (isCreate || isEdit) {
      this.isFormMode.set(true);
      if (isCreate) {
        this.loadCategories().subscribe(categories => {
          this.categories.set(categories);
          this.artworkForm.valueChanges.subscribe(() => {
            if (this.isFormMode()) this.hasUnsavedChanges.set(true);
          });
        });
      } else {
        this.loadCategories().subscribe(categories => {
          this.categories.set(categories);
          this.adminService.getArtworks()
            .pipe(catchError(() => EMPTY))
            .subscribe(artworks => {
              const artwork = artworks.find(a => a.id === +id!);
              if (artwork) this.fillForm(artwork);
              this.artworkForm.valueChanges.subscribe(() => {
                if (this.isFormMode()) this.hasUnsavedChanges.set(true);
              });
            });
        });
      }
    } else {
      this.loadData();
    }
  }

  private loadCategories() {
    return this.adminService.getCategories().pipe(catchError(() => EMPTY));
  }

  private loadData(): void {
    this.isLoading.set(true);
    forkJoin({
      artworks: this.adminService.getArtworks(),
      categories: this.adminService.getCategories()
    })
      .pipe(
        catchError(() => {
          this.notificationService.error(this.translateService.translate('admin.artworks.loadError'));
          return EMPTY;
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(({ artworks, categories }) => {
        this.artworks.set(artworks);
        this.rawArtworks.set(artworks);
        this.categories.set(categories);
        this.rawFilteredArtworks.set(artworks);
        this.selectedCategoryFilter = '';
      });
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

  protected openForm(): void {
    this.router.navigate(['/admin/artworks/create']);
  }

  protected editArtwork(artwork: Artwork): void {
    this.router.navigate(['/admin/artworks', artwork.id, 'edit']);
  }

  protected cancelForm(): void {
    this.uploadedImageUrls.set([]);
    this.mainImageUrl.set(undefined);
    this.mainImageFile.set(null);
    this.router.navigate(['/admin/artworks']);
  }

  protected sort(field: 'id' | 'title'): void {
    if (this.sortField() === field) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
  }

  protected onSearchChange(value: string): void {
    this.searchQuery.set(value);
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
          window.dispatchEvent(new CustomEvent('artworkChanged'));
          this.hasUnsavedChanges.set(false);
          if (this.isFormMode()) {
            this.router.navigate(['/admin/artworks']);
          } else {
            this.loadData();
          }
        });
    });
  }

  protected onCategoryFilterChange(): void {
    if (!this.selectedCategoryFilter) {
      this.rawFilteredArtworks.set(this.artworks());
    } else {
      this.adminService.getArtworksByCategory(+this.selectedCategoryFilter)
        .pipe(catchError(() => EMPTY))
        .subscribe(artworks => this.rawFilteredArtworks.set(artworks));
    }
  }

  protected getCategoryNames(categoryIds?: Set<number>): string[] {
    if (!categoryIds || categoryIds.size === 0) return [];
    const categories = this.categories();
    return Array.from(categoryIds)
      .map(id => {
        const category = categories.find(c => c.id === id);
        return category ? this.localeService.resolve(category, 'name') : null;
      })
      .filter((name): name is string => !!name);
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

  protected asSet(ids: number[] | null | undefined): Set<number> {
    return new Set(ids ?? []);
  }

  protected exportData(): void {
    const lang = this.translateService.currentLang();
    const isEn = lang === 'en';
    const columns: ExportColumn<Artwork>[] = [
      { header: 'ID', value: a => a.id },
      { header: isEn ? 'Title' : 'Titre', value: a => this.localeService.resolve(a, 'title') },
      { header: isEn ? 'Description' : 'Description', value: a => this.localeService.resolve(a, 'description') },
      { header: isEn ? 'Categories' : 'Catégories', value: a => this.getCategoryNames(this.asSet(a.categoryIds)).join(', ') }
    ];
    this.exportService.exportToExcel(this.filteredArtworks(), columns, isEn ? 'artworks' : 'oeuvres');
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
        } catch {
          // skip failed
        }
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

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
