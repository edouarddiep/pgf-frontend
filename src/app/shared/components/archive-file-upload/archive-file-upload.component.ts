import { Component, ChangeDetectionStrategy, input, output, signal, inject, computed } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, EMPTY, Observable, map } from 'rxjs';
import { ArchiveFile } from '@core/models/archive.model';
import { FileUploadService } from '@core/services/file-upload.service';
import { NotificationService } from '@shared/services/notification.service';
import {TranslatePipe} from '@core/pipes/translate.pipe';
import {TranslateService} from '@core/services/translate.service';

export interface PendingFile {
  fileType: ArchiveFile['fileType'];
  fileUrl: string;
  fileName: string;
}

const ICONS: Record<ArchiveFile['fileType'], string> = {
  IMAGE: 'image', VIDEO: 'videocam', AUDIO: 'audiotrack', PDF: 'picture_as_pdf'
};

const TYPE_BY_MIME: { pattern: RegExp; fileType: ArchiveFile['fileType'] }[] = [
  { pattern: /^image\//, fileType: 'IMAGE' },
  { pattern: /^video\//, fileType: 'VIDEO' },
  { pattern: /^audio\//, fileType: 'AUDIO' },
  { pattern: /pdf|msword|officedocument/, fileType: 'PDF' }
];

@Component({
  selector: 'app-archive-file-upload',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatProgressBarModule, TranslatePipe],
  templateUrl: './archive-file-upload.component.html',
  styleUrl: './archive-file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchiveFileUploadComponent {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly notificationService = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translateService = inject(TranslateService);

  readonly files = input<PendingFile[]>([]);
  readonly filesChange = output<PendingFile[]>();
  readonly hasChanges = output<void>();
  readonly mainImageChange = output<string | undefined>();

  protected readonly uploading = signal(false);
  protected readonly modalFile = signal<PendingFile | null>(null);

  protected readonly mainImage = computed(() =>
    this.files().find(f => f.fileType === 'IMAGE')
  );

  protected readonly hasMainImage = computed(() => !!this.mainImage());

  protected getIcon(fileType: ArchiveFile['fileType']): string {
    return ICONS[fileType];
  }

  protected isMain(file: PendingFile): boolean {
    return file === this.mainImage();
  }

  private detectType(file: File): ArchiveFile['fileType'] {
    return TYPE_BY_MIME.find(t => t.pattern.test(file.type))?.fileType ?? 'PDF';
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []);
    if (!selectedFiles.length) return;
    selectedFiles.forEach(file => this.uploadFile(file));
    input.value = '';
  }

  private uploadFile(file: File): void {
    this.uploading.set(true);
    const fileType = this.detectType(file);

    const upload$: Observable<string> = fileType === 'IMAGE'
      ? this.fileUploadService.uploadImage(file, 'archives').pipe(map(r => r.imageUrl))
      : this.fileUploadService.uploadFile(file, 'archives').pipe(map(r => r.fileUrl));

    upload$.pipe(catchError(() => { this.uploading.set(false); return EMPTY; }))
      .subscribe(url => {
        const newFile: PendingFile = { fileType, fileUrl: url, fileName: file.name };
        const updated = [...this.files(), newFile];
        this.filesChange.emit(updated);
        this.hasChanges.emit();
        if (fileType === 'IMAGE' && !this.hasMainImage()) {
          this.mainImageChange.emit(url);
        }
        this.uploading.set(false);
      });
  }

  protected removeFile(index: number): void {
    const file = this.files()[index];
    if (this.isMain(file)) {
      this.notificationService.info(this.translateService.translate('shared.imageUpload.mainImageCannotBeDeleted'));
      return;
    }
    const updated = this.files().filter((_, i) => i !== index);
    this.filesChange.emit(updated);
    this.hasChanges.emit();
  }

  protected openModal(file: PendingFile): void {
    this.modalFile.set(file);
  }

  protected closeModal(): void {
    this.modalFile.set(null);
  }

  protected getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected setMain(index: number): void {
    const files = this.files();
    const target = files[index];
    if (!target || !this.isImage(target)) return;
    const reordered = [target, ...files.filter((_, i) => i !== index)];
    this.filesChange.emit(reordered);
    this.hasChanges.emit();
  }

  protected isImage(f: PendingFile): boolean { return f.fileType === 'IMAGE'; }
  protected isVideo(f: PendingFile): boolean { return f.fileType === 'VIDEO'; }
  protected isAudio(f: PendingFile): boolean { return f.fileType === 'AUDIO'; }
  protected isPdf(f: PendingFile): boolean { return f.fileType === 'PDF'; }
}
