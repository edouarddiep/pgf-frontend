import { Component, ChangeDetectionStrategy, inject, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ImageService } from '@core/services/image.service';

export interface ImageItem {
  url: string;
  isMain?: boolean;
}

@Component({
  selector: 'app-image-upload',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageUploadComponent {
  private readonly imageService = inject(ImageService);
  private readonly snackBar = inject(MatSnackBar);

  readonly multiple = input(false);
  readonly currentImages = input<string[]>([]);
  readonly mainImageUrl = input<string | undefined>(undefined);
  readonly category = input('artworks');
  readonly exhibitionSlug = input<string | undefined>(undefined);
  readonly zoomImage = output<string>();

  readonly imagesChanged = output<{ urls: string[]; mainUrl: string | undefined }>();
  readonly hasChanges = output<void>();

  readonly uploading = signal(false);
  readonly isDragging = signal(false);
  readonly images = signal<ImageItem[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const urls = this.currentImages();
      const main = this.mainImageUrl();
      if (urls.length > 0) {
        this.images.set(urls.map((url, i) => ({
          url,
          isMain: main ? url === main : i === 0
        })));
      }
    });
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
    if (event.dataTransfer?.files) this.handleFiles(Array.from(event.dataTransfer.files));
  }

  private handleFiles(files: File[]): void {
    this.errorMessage.set(null);
    if (!this.multiple() && this.images().length > 0) {
      this.errorMessage.set('Une seule image est autorisée');
      return;
    }
    const validFiles = files.filter(f => this.validateFile(f));
    if (validFiles.length > 0) this.uploadFiles(validFiles);
  }

  private validateFile(file: File): boolean {
    if (file.size > 10 * 1024 * 1024) { this.errorMessage.set('Fichier trop volumineux (max 10MB)'); return false; }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      this.errorMessage.set('Format non supporté'); return false;
    }
    return true;
  }

  private uploadFiles(files: File[]): void {
    this.uploading.set(true);
    const slug = this.exhibitionSlug();
    const uploads = slug
      ? files.map((f, i) => this.imageService.uploadExhibitionImage(f, slug, this.images().length + i + 1))
      : files.map(f => this.imageService.uploadImage(f, this.category()));

    let index = 0;
    const processNext = () => {
      if (index >= uploads.length) { this.uploading.set(false); this.emit(); return; }
      uploads[index].subscribe({
        next: result => {
          const isFirst = this.images().length === 0;
          this.images.update(imgs => [...imgs, { url: result.imageUrl, isMain: isFirst && imgs.every(i => !i.isMain) }]);
          index++;
          processNext();
        },
        error: () => { this.uploading.set(false); this.snackBar.open('Erreur lors de l\'upload', 'Fermer', { duration: 5000 }); }
      });
    };
    processNext();
  }

  setMain(index: number): void {
    if (this.images()[index].isMain) return;
    this.images.update(imgs => imgs.map((img, i) => ({ ...img, isMain: i === index })));
    this.emit();
    this.hasChanges.emit();
  }

  openZoom(url: string, event: Event): void {
    event.stopPropagation();
    this.zoomImage.emit(url);
  }

  removeImage(index: number): void {
    const img = this.images()[index];
    if (img.isMain) {
      this.snackBar.open('L\'image principale ne peut pas être supprimée', 'Fermer', { duration: 4000 });
      return;
    }
    this.images.update(imgs => imgs.filter((_, i) => i !== index));
    this.emit();
    this.hasChanges.emit();
  }

  private emit(): void {
    const imgs = this.images();
    const mainItem = imgs.find(i => i.isMain);
    this.imagesChanged.emit({ urls: imgs.map(i => i.url), mainUrl: mainItem?.url });
  }
}
