import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipe } from '@core/pipes/translate.pipe';

export type MediaKind = 'image' | 'video' | 'audio' | 'pdf';

/**
 * Visionneuse plein écran commune à l'administration (listes, formulaires,
 * composants d'upload) : piège le focus, se ferme par Échap ou clic sur le
 * fond, et restaure le focus à la fermeture.
 */
@Component({
  selector: 'app-media-lightbox',
  imports: [A11yModule, MatIconModule, TranslatePipe],
  templateUrl: './media-lightbox.component.html',
  styleUrl: './media-lightbox.component.scss',
  host: {
    '(document:keydown.escape)': 'close()'
  },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MediaLightboxComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly url = input.required<string>();
  readonly kind = input<MediaKind>('image');
  readonly caption = input<string | undefined>(undefined);
  readonly closed = output<void>();

  protected get safeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.url());
  }

  protected close(): void {
    this.closed.emit();
  }
}
