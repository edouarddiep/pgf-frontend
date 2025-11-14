import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
import {LoadingDirective} from '@/app/directives/loading.directive';

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
    LoadingDirective
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

  protected readonly displayedColumns = ['image', 'title', 'categories', 'actions'];
  protected selectedCategoryFilter = '';

  protected readonly filteredArtworks = signal<Artwork[]>([]);

  protected readonly artworkForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    descriptionShort: ['', [Validators.maxLength(255)]],
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
    forkJoin({
      artworks: this.adminService.getArtworks(),
      categories: this.adminService.getCategories()
    })
      .pipe(catchError(() => {
        this.notificationService.error('Erreur lors du chargement des données');
        return EMPTY;
      }))
      .subscribe(({ artworks, categories }) => {
        this.artworks.set(artworks);
        this.categories.set(categories);
        this.filteredArtworks.set(artworks);
        this.selectedCategoryFilter = '';
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
      descriptionShort: '',
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

    this.artworkForm.setValue({
      title: artwork.title,
      description: artwork.description || '',
      descriptionShort: artwork.descriptionShort || '',
      imageUrls: artwork.imageUrls || [],
      displayOrder: artwork.displayOrder,
      categoryIds: artwork.categoryIds ? Array.from(artwork.categoryIds) : []
    });

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
      descriptionShort: formValue.descriptionShort,
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

    return imageUrl.replace(/\\"/g, '"').replace(/^"|"$/g, '');
  }

  protected isFormValidForSubmit(): boolean {
    if (!this.editingArtwork()) {
      return this.artworkForm.valid;
    } else {
      return this.artworkForm.valid && (this.artworkForm.dirty || this.selectedFiles()?.length > 0);
    }
  }
}
