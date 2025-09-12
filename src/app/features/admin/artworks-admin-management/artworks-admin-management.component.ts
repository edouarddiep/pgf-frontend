import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { AdminService, AdminArtworkRequest } from '@features/admin/services/admin.service';
import { Artwork, ArtworkCategory } from '@core/models/artwork.model';
import { catchError, EMPTY, forkJoin } from 'rxjs';

interface ArtworkFormData {
  title: string;
  description: string;
  dimensions?: string;
  materials?: string;
  creationDate?: string;
  price?: number;
  isAvailable: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
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
    MatCheckboxModule,
    MatCardModule,
    MatChipsModule
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
  protected readonly displayedColumns = ['image', 'title', 'dimensions', 'price', 'status', 'actions'];
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
    dimensions: [''],
    materials: [''],
    creationDate: [''],
    price: [null as number | null],
    isAvailable: [true],
    imageUrl: [''],
    thumbnailUrl: [''],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    categoryId: [null as number | null, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadData();
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
      dimensions: '',
      materials: '',
      creationDate: '',
      price: null,
      isAvailable: true,
      imageUrl: '',
      thumbnailUrl: '',
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
      dimensions: artwork.dimensions || '',
      materials: artwork.materials || '',
      creationDate: artwork.creationDate || '',
      price: artwork.price || null,
      isAvailable: artwork.isAvailable,
      imageUrl: artwork.imageUrl || '',
      thumbnailUrl: artwork.thumbnailUrl || '',
      displayOrder: artwork.displayOrder,
      categoryId: artwork.categoryId
    });
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingArtwork.set(null);
    this.artworkForm.reset();
  }

  protected saveArtwork(): void {
    if (this.artworkForm.invalid) return;

    const formData = this.artworkForm.value as ArtworkFormData;
    const request: AdminArtworkRequest = {
      title: formData.title,
      description: formData.description,
      dimensions: formData.dimensions || undefined,
      materials: formData.materials || undefined,
      creationDate: formData.creationDate || undefined,
      price: formData.price || undefined,
      isAvailable: formData.isAvailable,
      imageUrl: formData.imageUrl || undefined,
      thumbnailUrl: formData.thumbnailUrl || undefined,
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
      });
  }
}
