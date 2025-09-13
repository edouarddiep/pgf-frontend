import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
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
import { AdminService, AdminArtworkRequest } from '@features/admin/services/admin.service';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { catchError, EMPTY, forkJoin } from 'rxjs';

interface ArtworkFormData {
  title: string;
  description: string;
  isAvailable: boolean;
  imageUrls: string[];
  displayOrder: number;
  categoryId: number;
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
    MatSlideToggleModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    ImageUploadComponent
  ],
  templateUrl: './artworks-admin-management.component.html',
  styleUrl: './artworks-admin-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArtworksAdminManagementComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly artworks = signal<Artwork[]>([]);
  protected readonly categories = signal<ArtworkCategory[]>([]);
  protected readonly showForm = signal(false);
  protected readonly editingArtwork = signal<Artwork | null>(null);
  protected readonly displayedColumns = ['image', 'title', 'status', 'actions'];
  protected selectedCategoryFilter = '';

  protected readonly filteredArtworks = computed(() => {
    const artworks = this.artworks();
    if (!this.selectedCategoryFilter) {
      return artworks;
    }
    return artworks.filter(artwork => artwork.categoryId === +this.selectedCategoryFilter);
  });

  protected readonly artworkForm = this.fb.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    isAvailable: [true],
    imageUrls: [[] as string[], [Validators.required, this.minLengthArray(1)]],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    categoryId: [null as number | null, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  private minLengthArray(min: number) {
    return (control: any) => {
      if (!control.value || control.value.length < min) {
        return { minLengthArray: { requiredLength: min, actualLength: control.value?.length || 0 } };
      }
      return null;
    };
  }

  private loadData(): void {
    forkJoin({
      artworks: this.adminService.getArtworks(),
      categories: this.adminService.getCategories()
    })
      .pipe(catchError(() => EMPTY))
      .subscribe(({ artworks, categories }) => {
        this.artworks.set(artworks);
        this.categories.set(categories);
      });
  }

  protected getCategoryName(categoryId: number): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name || 'Catégorie inconnue';
  }

  protected applyFilter(): void {
    // Le filtrage se fait automatiquement via le computed signal
  }

  protected openForm(): void {
    this.showForm.set(true);
    this.editingArtwork.set(null);
    this.artworkForm.reset({
      title: '',
      description: '',
      isAvailable: true,
      imageUrls: [],
      displayOrder: 0,
      categoryId: null
    });
  }

  protected editArtwork(artwork: Artwork): void {
    this.showForm.set(true);
    this.editingArtwork.set(artwork);

    this.artworkForm.patchValue({
      title: artwork.title,
      description: artwork.description,
      isAvailable: artwork.isAvailable,
      imageUrls: artwork.imageUrls || [],
      displayOrder: artwork.displayOrder,
      categoryId: artwork.categoryId
    });
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingArtwork.set(null);
    this.artworkForm.reset();
  }

  protected onImagesUploaded(images: string[]): void {
    this.artworkForm.patchValue({
      imageUrls: images
    });
  }

  protected onImageRemoved(removedImageUrl: string): void {
    const currentImages = this.artworkForm.get('imageUrls')?.value || [];
    const updatedImages = currentImages.filter((url: string) => url !== removedImageUrl);
    this.artworkForm.patchValue({
      imageUrls: updatedImages
    });
  }

  protected saveArtwork(): void {
    if (this.artworkForm.invalid) return;

    const formData = this.artworkForm.value as ArtworkFormData;
    const request: AdminArtworkRequest = {
      title: formData.title,
      description: formData.description,
      isAvailable: formData.isAvailable,
      imageUrls: formData.imageUrls,
      displayOrder: formData.displayOrder,
      categoryId: formData.categoryId!
    };

    const editing = this.editingArtwork();
    const operation = editing
      ? this.adminService.updateArtwork(editing.id, request)
      : this.adminService.createArtwork(request);

    operation
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.cancelForm();
        this.loadData();
        // Notifier le dashboard pour mise à jour
        window.dispatchEvent(new CustomEvent('artworkChanged'));
      });
  }

  protected deleteArtwork(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette œuvre ?')) {
      return;
    }

    this.adminService.deleteArtwork(id)
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.loadData();
        window.dispatchEvent(new CustomEvent('artworkChanged'));
      });
  }
}
