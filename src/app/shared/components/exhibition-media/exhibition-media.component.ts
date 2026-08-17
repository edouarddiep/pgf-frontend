import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  EXHIBITION_MEDIA_TYPES,
  Exhibition,
  ExhibitionFile,
  ExhibitionMediaType
} from '@core/models/exhibition.model';
import { LocaleService } from '@core/services/locale.service';
import { TranslatePipe } from '@core/pipes/translate.pipe';
import { DateFormatPipe } from '@core/pipes/date-format.pipe';
import { MediaKind, MediaLightboxComponent } from '@shared/components/media-lightbox/media-lightbox.component';

const MEDIA_TYPE_ICONS: Record<ExhibitionMediaType, string> = {
  PRESS_ARTICLE: 'article', INTERVIEW: 'record_voice_over', VIDEO: 'movie',
  AUDIO: 'graphic_eq', PHOTO: 'photo_camera', DOCUMENT: 'description', OTHER: 'attach_file'
};

/**
 * Médias complémentaires d'une exposition (presse, interviews, vidéos,
 * documents). Appelé uniquement pour l'exposition en cours : dès qu'elle est
 * terminée, la page n'affiche plus rien sous l'exposition.
 */
@Component({
  selector: 'app-exhibition-media',
  imports: [MatIconModule, TranslatePipe, DateFormatPipe, MediaLightboxComponent],
  templateUrl: './exhibition-media.component.html',
  styleUrl: './exhibition-media.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExhibitionMediaComponent {
  protected readonly localeService = inject(LocaleService);

  readonly exhibition = input.required<Exhibition>();

  protected readonly activeType = signal<ExhibitionMediaType | null>(null);
  protected readonly lightboxFile = signal<ExhibitionFile | null>(null);

  // Barres de l'onde audio : leur hauteur et leur cadence sont portées par le
  // SCSS, le composant ne suit que la lecture en cours.
  protected readonly waveBars = [1, 2, 3, 4, 5, 6, 7];
  private readonly playingUrls = signal<ReadonlySet<string>>(new Set());

  // Le carrousel de l'exposition montre déjà ses images et ses vidéos : les
  // médias repris depuis ces listes ne sont pas affichés une seconde fois.
  private readonly carouselUrls = computed(() => new Set([
    this.exhibition().imageUrl,
    ...(this.exhibition().imageUrls ?? []),
    ...(this.exhibition().videoUrls ?? [])
  ].filter(Boolean)));

  protected readonly mediaFiles = computed(() => {
    const carousel = this.carouselUrls();
    return (this.exhibition().files ?? [])
      .filter(file => !carousel.has(file.fileUrl))
      .sort((a, b) => this.typeRank(a) - this.typeRank(b) || (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  });

  protected readonly availableTypes = computed(() =>
    EXHIBITION_MEDIA_TYPES.filter(type => this.mediaFiles().some(file => file.mediaType === type))
  );

  protected readonly visibleFiles = computed(() => {
    const type = this.activeType();
    return type ? this.mediaFiles().filter(file => file.mediaType === type) : this.mediaFiles();
  });

  private typeRank(file: ExhibitionFile): number {
    return EXHIBITION_MEDIA_TYPES.indexOf(file.mediaType);
  }

  protected countOf(type: ExhibitionMediaType): number {
    return this.mediaFiles().filter(file => file.mediaType === type).length;
  }

  protected selectType(type: ExhibitionMediaType | null): void {
    this.activeType.set(type);
  }

  protected icon(file: ExhibitionFile): string {
    return MEDIA_TYPE_ICONS[file.mediaType];
  }

  // Le nom du fichier reste technique : sans titre saisi, la carte porte le
  // libellé de sa catégorie (repli assuré côté template).
  protected titleOf(file: ExhibitionFile): string {
    return this.localeService.resolve(file, 'title');
  }

  protected isImage(file: ExhibitionFile): boolean {
    return file.fileType === 'IMAGE';
  }

  protected isVideo(file: ExhibitionFile): boolean {
    return file.fileType === 'VIDEO';
  }

  protected isAudio(file: ExhibitionFile): boolean {
    return file.fileType === 'AUDIO';
  }

  protected isPlaying(file: ExhibitionFile): boolean {
    return this.playingUrls().has(file.fileUrl);
  }

  protected setPlaying(file: ExhibitionFile, playing: boolean): void {
    this.playingUrls.update(urls => {
      const next = new Set(urls);
      if (playing) {
        next.add(file.fileUrl);
      } else {
        next.delete(file.fileUrl);
      }
      return next;
    });
  }

  protected isDocument(file: ExhibitionFile): boolean {
    return file.fileType === 'DOCUMENT' || file.fileType === 'LINK';
  }

  // Un document bureautique ou un lien externe n'a rien à faire dans la
  // visionneuse : le navigateur sait mieux quoi en faire.
  protected open(file: ExhibitionFile): void {
    if (this.isDocument(file)) {
      window.open(file.fileUrl, '_blank', 'noopener');
      return;
    }
    this.lightboxFile.set(file);
  }

  protected closeLightbox(): void {
    this.lightboxFile.set(null);
  }

  protected lightboxKind(file: ExhibitionFile): MediaKind {
    if (this.isVideo(file)) {
      return 'video';
    }
    if (this.isAudio(file)) {
      return 'audio';
    }
    return this.isImage(file) ? 'image' : 'pdf';
  }

  protected caption(file: ExhibitionFile): string {
    return [this.titleOf(file), file.source].filter(Boolean).join(' — ');
  }
}
