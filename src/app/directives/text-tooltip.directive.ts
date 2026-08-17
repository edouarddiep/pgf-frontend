import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, Renderer2, inject, input } from '@angular/core';
import { htmlToPlainText } from '@core/utils/html-text.util';

const MARGIN = 8;

/**
 * Infobulle des textes tronqués des tableaux d'administration : le contenu est
 * nettoyé de son HTML puis positionné dans le document (hors du tableau) pour ne
 * pas être rogné par le défilement ni par les contextes d'empilement.
 */
@Directive({
  selector: '[appTextTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(focus)': 'show()',
    '(mouseleave)': 'hide()',
    '(blur)': 'hide()'
  }
})
export class TextTooltipDirective implements OnDestroy {
  readonly appTextTooltip = input<string | null>('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  private tooltip: HTMLElement | null = null;
  private readonly onScroll = (): void => this.hide();

  ngOnDestroy(): void {
    this.hide();
  }

  protected show(): void {
    const text = htmlToPlainText(this.appTextTooltip());
    if (!text || this.tooltip) {
      return;
    }

    const tooltip: HTMLElement = this.renderer.createElement('div');
    this.renderer.addClass(tooltip, 'app-text-tooltip');
    this.renderer.setProperty(tooltip, 'textContent', text);
    this.renderer.appendChild(this.document.body, tooltip);
    this.tooltip = tooltip;

    this.place(tooltip);
    this.document.addEventListener('scroll', this.onScroll, true);
  }

  protected hide(): void {
    if (!this.tooltip) {
      return;
    }
    this.document.removeEventListener('scroll', this.onScroll, true);
    this.renderer.removeChild(this.document.body, this.tooltip);
    this.tooltip = null;
  }

  // Centrée sur la cellule, au-dessus si la place le permet, sinon en dessous,
  // et toujours ramenée dans la fenêtre.
  private place(tooltip: HTMLElement): void {
    const anchor = this.host.nativeElement.getBoundingClientRect();
    const box = tooltip.getBoundingClientRect();
    const view = this.document.defaultView;
    const viewWidth = view?.innerWidth ?? box.width;
    const viewHeight = view?.innerHeight ?? box.height;

    let top = anchor.top - box.height - MARGIN;
    if (top < MARGIN) {
      top = anchor.bottom + MARGIN;
    }

    const left = anchor.left + anchor.width / 2 - box.width / 2;
    this.renderer.setStyle(tooltip, 'left', `${this.clamp(left, viewWidth, box.width)}px`);
    this.renderer.setStyle(tooltip, 'top', `${this.clamp(top, viewHeight, box.height)}px`);
  }

  private clamp(value: number, viewSize: number, boxSize: number): number {
    return Math.max(MARGIN, Math.min(value, viewSize - boxSize - MARGIN));
  }
}
