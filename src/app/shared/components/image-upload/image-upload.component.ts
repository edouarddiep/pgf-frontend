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
  templateUrl: './image-upload.component.html',
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
      input.value = '';
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

    if (!this.multiple && this.uploadedImages().length > 0) {
      this.errorMessage.set('Une seule image est autorisée');
      return;
    }

    const validFiles = files.filter(file => this.validateFile(file));
    if (validFiles.length === 0) return;

    if (!this.multiple) {
      this.uploadedImages.set([]);
    }

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
