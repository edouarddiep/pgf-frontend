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
import {ImageUploadComponent} from '@shared/components/image-upload/image-upload.component';
import {HasUnsavedChanges} from '@features/admin/guards/unsaved-changes.guard';
import {ExportColumn, ExportService} from '@shared/services/export.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {ConfirmDialogService} from '@shared/services/confirm-dialog.service';
import {LoadingSpinnerComponent} from '@shared/components/loading-spinner/loading-spinner.component';

interface PreviewImage {
  file: File;
  url: string;
}

@Component({
  selector: 'app-artworks-admin-management',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    LoadingDirective,
    HighlightPipe,
    ImageUploadComponent,
    TranslatePipe,
    LoadingSpinnerComponent
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

  protected readonly artworks = signal<Artwork[]>([]);
  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly editingArtwork = signal<Artwork | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');
  protected readonly uploadedImageUrls = signal<string[]>([]);
  protected readonly mainImageUrl = signal<string | undefined>(undefined);
  protected readonly imageRequired = signal(false);

  protected readonly displayedColumns = ['id', 'image', 'title', 'categories', 'actions'];
  protected selectedCategoryFilter = '';

  private readonly rawArtworks = signal<Artwork[]>([]);
  private readonly rawFilteredArtworks = signal<Artwork[]>([]);
  protected readonly sortField = signal<'id' | 'title'>('id');
  protected readonly sortAsc = signal(true);
  protected readonly searchQuery = signal('');

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
          this.normalize(a.title ?? '').includes(token) ||
          this.normalize(a.descriptionShort ?? '').includes(token)
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
    descriptionShort: ['', [Validators.maxLength(100)]],
    imageUrls: [[] as string[]],
    categoryIds: [[] as number[], [Validators.required, Validators.minLength(1)]]
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
      this.artworkForm.valueChanges.subscribe(() => {
        if (this.isFormMode()) this.hasUnsavedChanges.set(true);
      });
      this.loadCategories().subscribe(categories => {
        this.categories.set(categories);
        if (isEdit) {
          this.adminService.getArtworks()
            .pipe(catchError(() => EMPTY))
            .subscribe(artworks => {
              const artwork = artworks.find(a => a.id === +id!);
              if (artwork) this.fillForm(artwork);
            });
        }
      });
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
          this.notificationService.error('Erreur lors du chargement des données');
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
      descriptionShort: artwork.descriptionShort || '',
      imageUrls: artwork.imageUrls || [],
      categoryIds: artwork.categoryIds ? Array.from(artwork.categoryIds) : []
    });
    this.artworkForm.markAsPristine();
    this.artworkForm.markAsUntouched();
    this.uploadedImageUrls.set(artwork.imageUrls || []);
    this.mainImageUrl.set(artwork.mainImageUrl);
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

  protected saveArtwork(): void {
    this.imageRequired.set(this.uploadedImageUrls().length === 0);
    if (this.artworkForm.invalid || this.isSubmitting() || this.uploadedImageUrls().length === 0) return;

    this.isSubmitting.set(true);
    const formValue = this.artworkForm.value;
    const editing = this.editingArtwork();

    const payload = {
      title: formValue.title!,
      description: formValue.description,
      descriptionShort: formValue.descriptionShort,
      imageUrls: this.uploadedImageUrls(),
      mainImageUrl: this.mainImageUrl(),
      categoryIds: formValue.categoryIds!
    };

    const operation = editing
      ? this.adminService.updateArtwork(editing.id, payload)
      : this.adminService.createArtwork(payload);

    operation
      .pipe(
        catchError(() => {
          this.notificationService.error('Erreur lors de la sauvegarde de l\'œuvre');
          return EMPTY;
        }),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe(() => {
        this.notificationService.success(editing ? 'Œuvre modifiée avec succès' : 'Œuvre créée avec succès');
        window.dispatchEvent(new CustomEvent('artworkChanged'));
        this.hasUnsavedChanges.set(false);
        this.router.navigate(['/admin/artworks']);
      });
  }

  protected deleteArtwork(id: number): void {
    this.confirmDialog.confirm({
      title: 'Supprimer l\'œuvre',
      message: 'Êtes-vous sûr de vouloir supprimer cette œuvre ? Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler'
    }).subscribe(confirmed => {
      if (!confirmed) return;
      this.adminService.deleteArtwork(id)
        .pipe(catchError(() => {
          this.notificationService.error('Erreur lors de la suppression de l\'œuvre');
          return EMPTY;
        }))
        .subscribe(() => {
          this.notificationService.success('Œuvre supprimée avec succès');
          this.loadData();
          window.dispatchEvent(new CustomEvent('artworkChanged'));
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
      .map(id => categories.find(c => c.id === id)?.name)
      .filter((name): name is string => !!name);
  }

  protected isFormValidForSubmit(): boolean {
    return this.editingArtwork()
      ? this.artworkForm.valid && (this.artworkForm.dirty || this.hasUnsavedChanges())
      : this.artworkForm.valid;
  }

  protected openImageModal(url: string): void {
    this.modalImageUrl.set(url);
    this.showImageModal.set(true);
  }

  protected closeImageModal(): void {
    this.showImageModal.set(false);
  }

  protected onImagesChanged(event: { urls: string[]; mainUrl: string | undefined }): void {
    this.uploadedImageUrls.set(event.urls);
    this.mainImageUrl.set(event.mainUrl);
    this.imageRequired.set(false);
    this.hasUnsavedChanges.set(true);
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
    const columns: ExportColumn<Artwork>[] = [
      { header: 'ID', value: a => a.id },
      { header: 'Titre', value: a => a.title },
      { header: 'Description courte', value: a => a.descriptionShort ?? '' },
      { header: 'Description complète', value: a => a.description ?? '' },
      { header: 'Catégories', value: a => this.getCategoryNames(this.asSet(a.categoryIds)).join(', ') }
    ];
    this.exportService.exportToExcel(this.filteredArtworks(), columns, 'oeuvres');
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
