import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, EMPTY, finalize } from 'rxjs';
import {
  EXHIBITION_MEDIA_TYPES,
  ExhibitionFile,
  ExhibitionFileType,
  ExhibitionMediaType
} from '@core/models/exhibition.model';
import { FileUploadService } from '@core/services/file-upload.service';
import { NotificationService } from '@shared/services/notification.service';
import { TranslateService } from '@core/services/translate.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { MediaKind, MediaLightboxComponent } from '@shared/components/media-lightbox/media-lightbox.component';

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

const FILE_TYPE_BY_MIME: { pattern: RegExp; fileType: ExhibitionFileType }[] = [
  { pattern: /^image\//, fileType: 'IMAGE' },
  { pattern: /^video\//, fileType: 'VIDEO' },
  { pattern: /^audio\//, fileType: 'AUDIO' },
  { pattern: /pdf$/, fileType: 'PDF' }
];

// Catégorie proposée à l'ajout : l'administrateur la corrige d'un clic si
// besoin, mais le cas courant (un PDF déposé est une coupure de presse) est
// déjà le bon.
const DEFAULT_MEDIA_TYPE: Record<ExhibitionFileType, ExhibitionMediaType> = {
  IMAGE: 'PHOTO', VIDEO: 'VIDEO', AUDIO: 'AUDIO', PDF: 'PRESS_ARTICLE', DOCUMENT: 'DOCUMENT', LINK: 'OTHER'
};

const LIGHTBOX_KINDS: Record<ExhibitionFileType, MediaKind> = {
  IMAGE: 'image', VIDEO: 'video', AUDIO: 'audio', PDF: 'pdf', DOCUMENT: 'pdf', LINK: 'pdf'
};

const FILE_TYPE_ICONS: Record<ExhibitionFileType, string> = {
  IMAGE: 'image', VIDEO: 'videocam', AUDIO: 'audiotrack', PDF: 'picture_as_pdf',
  DOCUMENT: 'description', LINK: 'link'
};

@Component({
  selector: 'app-exhibition-file-upload',
  imports: [
    MatButtonModule, MatIconModule, MatTooltipModule, MatProgressBarModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, TranslatePipe, MediaLightboxComponent
  ],
  templateUrl: './exhibition-file-upload.component.html',
  styleUrl: './exhibition-file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionFileUploadComponent {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly notificationService = inject(NotificationService);
  private readonly translateService = inject(TranslateService);

  readonly files = input<ExhibitionFile[]>([]);
  readonly exhibitionSlug = input<string>('');

  readonly filesChange = output<ExhibitionFile[]>();
  readonly fileRemoved = output<ExhibitionFile>();

  protected readonly mediaTypes = EXHIBITION_MEDIA_TYPES;
  protected readonly uploading = signal(false);
  protected readonly pendingCount = signal(0);
  // Repéré par URL et non par index : le panneau ouvert suit son média lorsque
  // la liste est réordonnée.
  protected readonly expandedUrl = signal<string | null>(null);
  protected readonly previewedFile = signal<ExhibitionFile | null>(null);

  // Récapitulatif par catégorie, dans l'ordre d'affichage du site public.
  protected readonly typeSummary = computed(() =>
    EXHIBITION_MEDIA_TYPES
      .map(type => ({ type, count: this.files().filter(file => file.mediaType === type).length }))
      .filter(entry => entry.count > 0)
  );

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';

    const valid = selected.filter(file => {
      if (file.size <= MAX_FILE_SIZE_BYTES) {
        return true;
      }
      this.notificationService.error(
        `${file.name}: ${this.translateService.translate('shared.exhibitionFileUpload.tooLarge')}`
      );
      return false;
    });

    valid.forEach(file => this.upload(file));
  }

  private upload(file: File): void {
    this.uploading.set(true);
    this.pendingCount.update(count => count + 1);

    this.fileUploadService.uploadExhibitionFile(file, this.exhibitionSlug())
      .pipe(
        catchError(() => {
          this.notificationService.error(
            `${file.name}: ${this.translateService.translate('shared.exhibitionFileUpload.uploadError')}`
          );
          return EMPTY;
        }),
        finalize(() => {
          this.pendingCount.update(count => count - 1);
          this.uploading.set(this.pendingCount() > 0);
        })
      )
      .subscribe(result => {
        const fileType = result.fileType ?? this.detectFileType(file.type);
        this.emit([...this.files(), {
          mediaType: DEFAULT_MEDIA_TYPE[fileType],
          fileType,
          fileUrl: result.fileUrl,
          // Le titre public part du nom du fichier : rempli d'office, il reste
          // modifiable, et rien de technique ne fuite sur le site.
          title: this.baseName(result.fileName ?? file.name),
          fileName: result.fileName ?? file.name,
          mimeType: result.mimeType ?? file.type,
          fileSize: result.fileSize ?? file.size
        }]);
      });
  }

  private detectFileType(mimeType: string): ExhibitionFileType {
    return FILE_TYPE_BY_MIME.find(candidate => candidate.pattern.test(mimeType))?.fileType ?? 'DOCUMENT';
  }

  private baseName(fileName: string): string {
    return fileName.replace(/\.[^.]+$/, '');
  }

  // Une URL de stockage n'est pas un nom : on retombe sur le fichier, puis sur
  // la catégorie, mais jamais sur le lien Supabase.
  protected displayName(file: ExhibitionFile): string {
    return file.title
      || file.fileName
      || this.translateService.translate(`exhibitions.media.types.${file.mediaType}`);
  }

  protected patch(index: number, changes: Partial<ExhibitionFile>): void {
    this.emit(this.files().map((file, i) => i === index ? { ...file, ...changes } : file));
  }

  protected move(index: number, offset: number): void {
    const files = [...this.files()];
    const target = index + offset;
    if (target < 0 || target >= files.length) {
      return;
    }
    [files[index], files[target]] = [files[target], files[index]];
    this.emit(files);
  }

  protected remove(index: number): void {
    const removed = this.files()[index];
    this.emit(this.files().filter((_, i) => i !== index));
    this.fileRemoved.emit(removed);
  }

  private emit(files: ExhibitionFile[]): void {
    this.filesChange.emit(files.map((file, index) => ({ ...file, displayOrder: index })));
  }

  protected toggleDetails(file: ExhibitionFile): void {
    this.expandedUrl.update(url => url === file.fileUrl ? null : file.fileUrl);
  }

  protected isExpanded(file: ExhibitionFile): boolean {
    return this.expandedUrl() === file.fileUrl;
  }

  protected icon(file: ExhibitionFile): string {
    return FILE_TYPE_ICONS[file.fileType ?? 'DOCUMENT'];
  }

  protected previewKind(file: ExhibitionFile): MediaKind {
    return LIGHTBOX_KINDS[file.fileType ?? 'DOCUMENT'];
  }

  protected isImage(file: ExhibitionFile): boolean {
    return file.fileType === 'IMAGE';
  }

  protected isVideo(file: ExhibitionFile): boolean {
    return file.fileType === 'VIDEO';
  }

  protected sizeLabel(file: ExhibitionFile): string {
    if (!file.fileSize) {
      return '';
    }
    const megabytes = file.fileSize / (1024 * 1024);
    return megabytes >= 1 ? `${megabytes.toFixed(1)} Mo` : `${Math.round(file.fileSize / 1024)} Ko`;
  }

  protected openPreview(file: ExhibitionFile): void {
    this.previewedFile.set(file);
  }

  protected closePreview(): void {
    this.previewedFile.set(null);
  }
}
