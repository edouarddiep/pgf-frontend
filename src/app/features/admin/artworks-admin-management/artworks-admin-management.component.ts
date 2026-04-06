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
    HighlightPipe
  ],
  templateUrl: './artworks-admin-management.component.html',
  styleUrl: './artworks-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly artworks = signal<Artwork[]>([]);
  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly editingArtwork = signal<Artwork | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly selectedFiles = signal<FileList | null>(null);
  protected readonly imagesPreviews = signal<PreviewImage[]>([]);
  protected readonly showImageModal = signal(false);
  protected readonly modalImageUrl = signal<string>('');

  protected readonly displayedColumns = ['id', 'image', 'title', 'categories', 'actions'];
  protected selectedCategoryFilter = '';

  private readonly rawArtworks = signal<Artwork[]>([]);
  private readonly rawFilteredArtworks = signal<Artwork[]>([]);
  protected readonly sortField = signal<'id' | 'title'>('id');
  protected readonly sortAsc = signal(true);
  protected readonly searchQuery = signal('');

  protected readonly isFormMode = signal(false);

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
      const va = field === 'id' ? a.id : (a.title ?? '');
      const vb = field === 'id' ? b.id : (b.title ?? '');
      return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  });

  protected readonly artworkForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    descriptionShort: ['', [Validators.maxLength(255)]],
    imageUrls: [[] as string[]],
    categoryIds: [[] as number[], [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const url = this.router.url;
    const isCreate = url.endsWith('/create');
    const isEdit = !!id && url.endsWith('/edit');

    if (isCreate || isEdit) {
      this.isFormMode.set(true);
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
  }

  protected openForm(): void {
    this.router.navigate(['/admin/artworks/create']);
  }

  protected editArtwork(artwork: Artwork): void {
    this.router.navigate(['/admin/artworks', artwork.id, 'edit']);
  }

  protected cancelForm(): void {
    this.imagesPreviews().forEach(p => URL.revokeObjectURL(p.url));
    this.router.navigate(['/admin/artworks']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    this.selectedFiles.set(files);

    if (files && files.length > 0) {
      this.imagesPreviews.set(Array.from(files).map(file => ({ file, url: URL.createObjectURL(file) })));
    } else {
      this.imagesPreviews.set([]);
    }
  }

  removeImagePreview(index: number): void {
    const previews = this.imagesPreviews();
    URL.revokeObjectURL(previews[index].url);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    this.imagesPreviews.set(updatedPreviews);
    const dt = new DataTransfer();
    updatedPreviews.forEach(p => dt.items.add(p.file));
    this.selectedFiles.set(dt.files);
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
    if (this.artworkForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.artworkForm.value;
    const uploadData = new FormData();

    uploadData.append('artwork', JSON.stringify({
      title: formValue.title!,
      description: formValue.description,
      descriptionShort: formValue.descriptionShort,
      imageUrls: formValue.imageUrls!,
      categoryIds: formValue.categoryIds!
    }));

    const files = this.selectedFiles();
    if (files && files.length > 0) {
      Array.from(files).forEach(file => uploadData.append('images', file));
    }

    const editing = this.editingArtwork();
    const operation = editing
      ? this.adminService.updateArtworkWithImages(editing.id, uploadData)
      : this.adminService.createArtworkWithImages(uploadData);

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
        this.router.navigate(['/admin/artworks']);
      });
  }

  protected deleteArtwork(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette œuvre ?')) return;

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
      ? this.artworkForm.valid && (this.artworkForm.dirty || (this.selectedFiles()?.length ?? 0) > 0)
      : this.artworkForm.valid;
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
