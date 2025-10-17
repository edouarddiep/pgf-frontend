import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { AdminService } from '@features/admin/services/admin.service';
import { NotificationService } from '@shared/services/notification.service';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { forkJoin, EMPTY, catchError, finalize } from 'rxjs';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBarModule} from '@angular/material/snack-bar';

interface PreviewImage {
  file: File;
  url: string;
}

const SWISS_DATE_FORMATS = {
  parse: {
    dateInput: 'DD.MM.YYYY',
  },
  display: {
    dateInput: 'DD.MM.YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD.MM.YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

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
    MatSlideToggleModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-CH' },
    { provide: MAT_DATE_FORMATS, useValue: SWISS_DATE_FORMATS }
  ],
  templateUrl: './artworks-admin-management.component.html',
  styleUrl: './artworks-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);

  protected readonly artworks = signal<Artwork[]>([]);
  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly showForm = signal(false);
  protected readonly showList = signal(true);
  protected readonly editingArtwork = signal<Artwork | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly selectedFiles = signal<FileList | null>(null);
  protected readonly imagesPreviews = signal<PreviewImage[]>([]);


  protected readonly displayedColumns = ['image', 'title', 'categories', 'status', 'actions'];
  protected selectedCategoryFilter = '';

  protected readonly filteredArtworks = signal<Artwork[]>([]);

  protected readonly artworkForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    dimensions: ['', [Validators.maxLength(255)]],
    materials: ['', [Validators.maxLength(255)]],
    creationDate: [null as Date | null],
    price: [null as number | null, [Validators.min(0)]],
    isAvailable: [true, [Validators.required]],
    imageUrls: [[] as string[]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    categoryIds: [[] as number[], [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    this.selectedFiles.set(files);

    if (files && files.length > 0) {
      const previews: PreviewImage[] = [];
      Array.from(files).forEach(file => {
        const url = URL.createObjectURL(file);
        previews.push({ file, url });
      });
      this.imagesPreviews.set(previews);
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
    updatedPreviews.forEach(preview => dt.items.add(preview.file));
    this.selectedFiles.set(dt.files);
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
        this.categories.set(categories);
        this.filteredArtworks.set(artworks);
        this.selectedCategoryFilter = '';
      });
  }

  protected formatDate(date: Date | string | null): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  protected getCategoryNames(categoryIds?: Set<number>): string[] {
    if (!categoryIds || categoryIds.size === 0) return [];

    const categories = this.categories();
    return Array.from(categoryIds)
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(name => name !== undefined) as string[];
  }

  protected openForm(): void {
    this.showForm.set(true);
    this.showList.set(false);
    this.editingArtwork.set(null);
    this.selectedFiles.set(null);
    this.imagesPreviews.set([]);
    this.artworkForm.reset({
      title: '',
      description: '',
      dimensions: '',
      materials: '',
      creationDate: null,
      price: null,
      isAvailable: true,
      imageUrls: [],
      displayOrder: 0,
      categoryIds: []
    });
  }

  protected editArtwork(artwork: Artwork): void {
    this.showForm.set(true);
    this.showList.set(false);
    this.editingArtwork.set(artwork);
    this.selectedFiles.set(null);
    this.imagesPreviews.set([]);

    const creationDate = artwork.creationDate ? new Date(artwork.creationDate) : null;

    // Utiliser setValue au lieu de patchValue pour une réinitialisation complète
    this.artworkForm.setValue({
      title: artwork.title,
      description: artwork.description || '',
      dimensions: artwork.dimensions || '',
      materials: artwork.materials || '',
      creationDate,
      price: artwork.price || null,
      isAvailable: artwork.isAvailable,
      imageUrls: artwork.imageUrls || [],
      displayOrder: artwork.displayOrder,
      categoryIds: artwork.categoryIds ? Array.from(artwork.categoryIds) : []
    });

    // Reset du state dirty/pristine pour permettre la détection des changements
    this.artworkForm.markAsPristine();
    this.artworkForm.markAsUntouched();
    this.artworkForm.updateValueAndValidity();
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.showList.set(true);
    this.editingArtwork.set(null);
    this.selectedFiles.set(null);

    this.imagesPreviews().forEach(preview => URL.revokeObjectURL(preview.url));
    this.imagesPreviews.set([]);

    this.artworkForm.reset();
  }

  protected saveArtwork(): void {
    if (this.artworkForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formValue = this.artworkForm.value;

    const uploadData = new FormData();

    const artworkDto = {
      title: formValue.title!,
      description: formValue.description,
      dimensions: formValue.dimensions,
      materials: formValue.materials,
      creationDate: formValue.creationDate?.toISOString().split('T')[0] || null,
      price: formValue.price,
      isAvailable: formValue.isAvailable!,
      imageUrls: formValue.imageUrls!,
      displayOrder: formValue.displayOrder!,
      categoryIds: formValue.categoryIds!
    };

    uploadData.append('artwork', JSON.stringify(artworkDto));

    const files = this.selectedFiles();
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        uploadData.append('images', file);
      });
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
      .subscribe({
        next: () => {
          const message = editing ? 'Œuvre modifiée avec succès' : 'Œuvre créée avec succès';
          this.notificationService.success(message);
          this.cancelForm();
          this.loadData();
          window.dispatchEvent(new CustomEvent('artworkChanged'));
        }
      });
  }

  protected deleteArtwork(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette œuvre ?')) {
      return;
    }

    this.adminService.deleteArtwork(id)
      .pipe(
        catchError(() => {
          this.notificationService.error('Erreur lors de la suppression de l\'œuvre');
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.notificationService.success('Œuvre supprimée avec succès');
        this.loadData();
        window.dispatchEvent(new CustomEvent('artworkChanged'));
      });
  }

  protected onCategoryFilterChange(): void {
    if (!this.selectedCategoryFilter) {
      this.filteredArtworks.set(this.artworks());
    } else {
      this.adminService.getArtworksByCategory(+this.selectedCategoryFilter)
        .pipe(catchError(() => EMPTY))
        .subscribe(artworks => {
          this.filteredArtworks.set(artworks);
        });
    }
  }

  protected getCleanImageUrl(artwork: Artwork): string | null {
    let imageUrl = artwork.mainImageUrl;

    if (!imageUrl && artwork.imageUrls && artwork.imageUrls.length > 0) {
      imageUrl = artwork.imageUrls[0];
    }

    if (!imageUrl) return null;

    // Nettoyer les caractères d'échappement
    return imageUrl.replace(/\\"/g, '"').replace(/^"|"$/g, '');
  }

  protected isFormValidForSubmit(): boolean {
    if (!this.editingArtwork()) {
      // Mode création : formulaire doit être valide
      return this.artworkForm.valid;
    } else {
      // Mode édition : formulaire doit être valide ET modifié
      return this.artworkForm.valid && (this.artworkForm.dirty || this.selectedFiles()?.length > 0);
    }
  }
}
