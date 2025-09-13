import { Component, ChangeDetectionStrategy, inject, signal, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ImageService } from '@core/services/image.service';

@Component({
  selector: 'app-image-upload',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="image-upload-container">
      <!-- Zone de drop principal -->
      <div
        class="drop-zone"
        [class.dragging]="isDragging()"
        [class.has-images]="uploadedImages().length > 0"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">

        <input
          #fileInput
          type="file"
          [multiple]="multiple"
          accept="image/*"
          (change)="onFileSelected($event)"
          style="display: none;">

        @if (uploadedImages().length === 0) {
          <div class="drop-content">
            <mat-icon>cloud_upload</mat-icon>
            <p>Glissez vos images ici ou cliquez pour sélectionner</p>
            <small>Formats acceptés: JPG, PNG, GIF, WebP (max 10MB)</small>
          </div>
        } @else {
          <div class="add-more">
            <mat-icon>add_photo_alternate</mat-icon>
            <span>Ajouter d'autres images</span>
          </div>
        }
      </div>

      <!-- Liste des images uploadées -->
      @if (uploadedImages().length > 0) {
        <div class="uploaded-images">
          @for (image of uploadedImages(); track image.url; let i = $index) {
            <div class="image-item" [class.primary]="i === 0">
              <img [src]="image.url" [alt]="'Image ' + (i + 1)">

              @if (i === 0) {
                <div class="primary-badge">
                  <mat-icon>star</mat-icon>
                  <span>Image principale</span>
                </div>
              }

              <div class="image-actions">
                @if (i !== 0) {
                  <button
                    mat-mini-fab
                    color="primary"
                    (click)="moveToFirst(i)"
                    matTooltip="Définir comme image principale">
                    <mat-icon>star</mat-icon>
                  </button>
                }

                <button
                  mat-mini-fab
                  color="warn"
                  (click)="removeImage(i)"
                  matTooltip="Supprimer">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Barre de progression -->
      @if (uploading()) {
        <div class="upload-progress">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <span>Upload en cours...</span>
        </div>
      }

      <!-- Message d'erreur -->
      @if (errorMessage()) {
        <div class="error-message">
          <mat-icon>error</mat-icon>
          <span>{{ errorMessage() }}</span>
        </div>
      }
    </div>
  `,
  styleUrl: './image-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageUploadComponent implements OnInit {
  private readonly imageService = inject(ImageService);
  private readonly snackBar = inject(MatSnackBar);

  @Input() multiple = false;
  @Input() required = false;
  @Input() currentImages: string[] = [];
  @Input() category = 'artworks';

  @Output() imagesUploaded = new EventEmitter<string[]>();
  @Output() imageRemoved = new EventEmitter<string>();

  readonly uploading = signal(false);
  readonly isDragging = signal(false);
  readonly uploadedImages = signal<{ url: string; file?: File }[]>([]);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (this.currentImages.length > 0) {
      const images = this.currentImages.map(url => ({ url }));
      this.uploadedImages.set(images);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  private handleFiles(files: File[]): void {
    this.errorMessage.set(null);

    const validFiles = files.filter(file => this.validateFile(file));
    if (validFiles.length === 0) return;

    this.uploadFiles(validFiles);
  }

  private validateFile(file: File): boolean {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      this.errorMessage.set('Fichier trop volumineux (max 10MB)');
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage.set('Format non supporté');
      return false;
    }

    return true;
  }

  private uploadFiles(files: File[]): void {
    this.uploading.set(true);

    const uploads = files.map(file => this.imageService.uploadImage(file, this.category));

    // Pour simplifier, on upload un par un (on pourrait paralléliser)
    let uploadIndex = 0;
    const processNext = () => {
      if (uploadIndex >= uploads.length) {
        this.uploading.set(false);
        this.emitUpdatedImages();
        return;
      }

      uploads[uploadIndex].subscribe({
        next: (result) => {
          const currentImages = this.uploadedImages();
          this.uploadedImages.set([...currentImages, { url: result.imageUrl, file: files[uploadIndex] }]);
          uploadIndex++;
          processNext();
        },
        error: (error) => {
          this.uploading.set(false);
          this.errorMessage.set('Erreur upload: ' + error.message);
          this.snackBar.open('Erreur lors de l\'upload', 'Fermer', { duration: 5000 });
        }
      });
    };

    processNext();
  }

  removeImage(index: number): void {
    const images = this.uploadedImages();
    const removedImage = images[index];

    const updatedImages = images.filter((_, i) => i !== index);
    this.uploadedImages.set(updatedImages);

    this.imageRemoved.emit(removedImage.url);
    this.emitUpdatedImages();
  }

  moveToFirst(index: number): void {
    const images = [...this.uploadedImages()];
    const imageToMove = images.splice(index, 1)[0];
    images.unshift(imageToMove);

    this.uploadedImages.set(images);
    this.emitUpdatedImages();
  }

  private emitUpdatedImages(): void {
    const imageUrls = this.uploadedImages().map(img => img.url);
    this.imagesUploaded.emit(imageUrls);
  }
}
