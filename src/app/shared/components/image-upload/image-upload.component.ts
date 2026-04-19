import { Component, ChangeDetectionStrategy, inject, signal, input, output, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '@shared/services/notification.service';
import { FileUploadService } from '@core/services/file-upload.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';

export interface ImageItem {
  url: string;
  isMain?: boolean;
}

@Component({
  selector: 'app-image-upload',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule, TranslatePipe],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageUploadComponent {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly notificationService = inject(NotificationService);
  private readonly translateService = inject(TranslateService);

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

  protected readonly mainImage = computed(() => this.images().find(i => i.isMain));

  constructor() {
    effect(() => {
      const urls = this.currentImages();
      const main = this.mainImageUrl();
      if (urls.length > 0) {
        this.images.set(urls.map(url => ({
          url,
          isMain: main ? url === main : false
        })));
      } else {
        this.images.set([]);
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
      this.errorMessage.set(this.translateService.translate('shared.imageUpload.singleImageOnly'));
      return;
    }
    const validFiles = files.filter(f => this.validateFile(f));
    if (validFiles.length > 0) this.uploadFiles(validFiles);
  }

  private validateFile(file: File): boolean {
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage.set(this.translateService.translate('shared.imageUpload.fileTooLarge'));
      return false;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      this.errorMessage.set(this.translateService.translate('shared.imageUpload.formatNotSupported'));
      return false;
    }
    return true;
  }

  private uploadFiles(files: File[]): void {
    this.uploading.set(true);
    const slug = this.exhibitionSlug();
    const uploads = slug
      ? files.map((f, i) => this.fileUploadService.uploadExhibitionImage(f, slug, this.images().length + i + 1))
      : files.map(f => this.fileUploadService.uploadImage(f, this.category()));

    let index = 0;
    const processNext = () => {
      if (index >= uploads.length) { this.uploading.set(false); this.emit(); return; }
      uploads[index].subscribe({
        next: result => {
          const main = this.mainImageUrl();
          const hasMain = main !== undefined ? this.images().some(i => i.isMain) : true; // Si pas de main attendu, jamais isMain
          this.images.update(imgs => [...imgs, { url: result.imageUrl, isMain: main !== undefined && !hasMain }]);
          index++;
          processNext();
        },
        error: () => {
          this.uploading.set(false);
          this.notificationService.error(this.translateService.translate('admin.common.errors.uploadFailed'));
        }
      });
    };
    processNext();
  }

  setMain(index: number): void {
    const target = this.images()[index];
    if (target.isMain) return;
    const reordered = [target, ...this.images().filter((_, i) => i !== index)];
    const updated = reordered.map((img, i) => ({ ...img, isMain: i === 0 }));
    this.images.set(updated);
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
      this.notificationService.info(this.translateService.translate('shared.imageUpload.mainImageCannotBeDeleted'));
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
