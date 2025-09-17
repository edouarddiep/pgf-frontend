import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminService } from '@features/admin/services/admin.service';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { ImageUploadComponent } from '@shared/components/image-upload/image-upload.component';
import { catchError, EMPTY, forkJoin } from 'rxjs';

interface ArtworkFormData {
  title: string;
  description: string;
  dimensions?: string;
  materials?: string;
  creationDate?: string;
  price?: number;
  isAvailable: boolean;
  imageUrls: string[];
  displayOrder: number;
  categoryIds: number[];
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
    MatCheckboxModule,
    MatTooltipModule
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
  protected readonly isSubmitting = signal(false);
  protected readonly selectedFiles = signal<FileList | null>(null);

  protected readonly displayedColumns = ['image', 'title', 'categories', 'status', 'actions'];
  protected selectedCategoryFilter = '';

  protected readonly filteredArtworks = computed(() => {
    const artworks = this.artworks();
    if (!this.selectedCategoryFilter) {
      return artworks;
    }
    return artworks.filter(artwork =>
      artwork.categoryIds?.has(+this.selectedCategoryFilter)
    );
  });

  protected readonly artworkForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(1000)]],
    dimensions: ['', [Validators.maxLength(255)]],
    materials: ['', [Validators.maxLength(255)]],
    creationDate: [''],
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
    this.selectedFiles.set(input.files);
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

  protected getCategoryNames(categoryIds?: Set<number>): string[] {
    if (!categoryIds || categoryIds.size === 0) return [];

    const categories = this.categories();
    return Array.from(categoryIds)
      .map(id => categories.find(c => c.id === id)?.name)
      .filter(name => name !== undefined) as string[];
  }

  protected isCategorySelected(categoryId: number): boolean {
    const selectedIds = this.artworkForm.get('categoryIds')?.value || [];
    return selectedIds.includes(categoryId);
  }

  protected onCategoryChange(categoryId: number, checked: boolean): void {
    const currentIds = this.artworkForm.get('categoryIds')?.value || [];

    if (checked) {
      this.artworkForm.patchValue({
        categoryIds: [...currentIds, categoryId]
      });
    } else {
      this.artworkForm.patchValue({
        categoryIds: currentIds.filter(id => id !== categoryId)
      });
    }
  }

  protected openForm(): void {
    this.showForm.set(true);
    this.editingArtwork.set(null);
    this.selectedFiles.set(null);
    this.artworkForm.reset({
      title: '',
      description: '',
      dimensions: '',
      materials: '',
      creationDate: '',
      price: null,
      isAvailable: true,
      imageUrls: [],
      displayOrder: 0,
      categoryIds: []
    });
  }

  protected editArtwork(artwork: Artwork): void {
    this.showForm.set(true);
    this.editingArtwork.set(artwork);
    this.selectedFiles.set(null);

    this.artworkForm.patchValue({
      title: artwork.title,
      description: artwork.description || '',
      dimensions: artwork.dimensions || '',
      materials: artwork.materials || '',
      creationDate: artwork.creationDate || '',
      price: artwork.price || null,
      isAvailable: artwork.isAvailable,
      imageUrls: artwork.imageUrls || [],
      displayOrder: artwork.displayOrder,
      categoryIds: artwork.categoryIds ? Array.from(artwork.categoryIds) : []
    });
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingArtwork.set(null);
    this.selectedFiles.set(null);
    this.artworkForm.reset();
  }

  protected onImagesUploaded(images: string[]): void {
    const currentImages = this.artworkForm.get('imageUrls')?.value || [];
    this.artworkForm.patchValue({
      imageUrls: [...currentImages, ...images]
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
    if (this.artworkForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const formData = this.artworkForm.value as ArtworkFormData;

    // Préparer FormData pour l'upload avec images
    const uploadData = new FormData();

    // Créer l'objet artwork DTO
    const artworkDto = {
      title: formData.title,
      description: formData.description,
      dimensions: formData.dimensions,
      materials: formData.materials,
      creationDate: formData.creationDate,
      price: formData.price,
      isAvailable: formData.isAvailable,
      imageUrls: formData.imageUrls,
      displayOrder: formData.displayOrder,
      categoryIds: new Set(formData.categoryIds)
    };

    uploadData.append('artwork', new Blob([JSON.stringify(artworkDto)], {
      type: 'application/json'
    }));

    // Ajouter les nouvelles images si présentes
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
      .pipe(catchError(() => EMPTY))
      .subscribe({
        next: () => {
          this.cancelForm();
          this.loadData();
          window.dispatchEvent(new CustomEvent('artworkChanged'));
        },
        complete: () => {
          this.isSubmitting.set(false);
        }
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

  protected updateArtworkCategories(artworkId: number, categoryIds: number[]): void {
    this.adminService.updateArtworkCategories(artworkId, new Set(categoryIds))
      .pipe(catchError(() => EMPTY))
      .subscribe(() => {
        this.loadData();
      });
  }
}
